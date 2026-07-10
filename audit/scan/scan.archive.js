/* =========================================================
Nombre completo: scan.archive.js
Ruta o ubicación: /audit/scan/scan.archive.js
Función o funciones:
- Leer el directorio central de un ZIP sin descomprimir archivos.
- Evitar cargar el ZIP completo en memoria.
- Funcionar en ventana principal y Web Worker.
- Soportar ZIP clásico, ZIP64, nombres UTF-8 y nombres heredados CP437.
- Detectar ZIP multidisco, estructuras dañadas y cantidades extremas.
========================================================= */

(function attachArchiveReader(root) {
  "use strict";

  root.AuditScan = root.AuditScan || {};

  var EOCD_SIGNATURE = 0x06054b50;
  var ZIP64_EOCD_SIGNATURE = 0x06064b50;
  var ZIP64_LOCATOR_SIGNATURE = 0x07064b50;
  var CENTRAL_SIGNATURE = 0x02014b50;
  var ZIP64_EXTRA_ID = 0x0001;
  var UNICODE_PATH_EXTRA_ID = 0x7075;
  var MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);
  var DEFAULT_CHUNK_SIZE = 4 * 1024 * 1024;
  var DEFAULT_MAX_ENTRIES = 1000000;
  var DEFAULT_MAX_CENTRAL_DIRECTORY = 512 * 1024 * 1024;

  var CP437_HIGH = [
    "Ç","ü","é","â","ä","à","å","ç","ê","ë","è","ï","î","ì","Ä","Å",
    "É","æ","Æ","ô","ö","ò","û","ù","ÿ","Ö","Ü","¢","£","¥","₧","ƒ",
    "á","í","ó","ú","ñ","Ñ","ª","º","¿","⌐","¬","½","¼","¡","«","»",
    "░","▒","▓","│","┤","╡","╢","╖","╕","╣","║","╗","╝","╜","╛","┐",
    "└","┴","┬","├","─","┼","╞","╟","╚","╔","╩","╦","╠","═","╬","╧",
    "╨","╤","╥","╙","╘","╒","╓","╫","╪","┘","┌","█","▄","▌","▐","▀",
    "α","ß","Γ","π","Σ","σ","µ","τ","Φ","Θ","Ω","δ","∞","φ","ε","∩",
    "≡","±","≥","≤","⌠","⌡","÷","≈","°","∙","·","√","ⁿ","²","■"," "
  ];

  function createError(message, name) {
    var error = new Error(message || "No fue posible leer el ZIP.");
    error.name = name || "ScanArchiveError";
    return error;
  }

  function emit(options, value, label) {
    if (!options || typeof options.onProgress !== "function") return;
    options.onProgress({
      value: Math.max(0, Math.min(100, Math.round(Number(value) || 0))),
      label: label || "Procesando"
    });
  }

  function assertActive(control) {
    if (control && typeof control.isCancelled === "function" && control.isCancelled()) {
      throw createError("El escaneo fue cancelado.", "ScanCancelledError");
    }
  }

  function toSafeNumber(value, label) {
    if (typeof value === "number") {
      if (!Number.isSafeInteger(value) || value < 0) {
        throw createError((label || "Valor ZIP") + " supera el límite numérico seguro.", "ScanArchiveRangeError");
      }
      return value;
    }

    if (typeof value !== "bigint" || value < 0n || value > MAX_SAFE_BIGINT) {
      throw createError((label || "Valor ZIP") + " supera el límite numérico seguro.", "ScanArchiveRangeError");
    }

    return Number(value);
  }

  function readUint64(view, offset) {
    if (typeof view.getBigUint64 === "function") {
      return view.getBigUint64(offset, true);
    }

    var low = BigInt(view.getUint32(offset, true));
    var high = BigInt(view.getUint32(offset + 4, true));
    return (high << 32n) | low;
  }

  async function readSlice(blob, start, length) {
    var safeStart = Math.max(0, Number(start) || 0);
    var safeLength = Math.max(0, Number(length) || 0);
    var end = Math.min(blob.size, safeStart + safeLength);
    return new Uint8Array(await blob.slice(safeStart, end).arrayBuffer());
  }

  function findSignatureBackward(bytes, signature) {
    for (var index = bytes.length - 4; index >= 0; index -= 1) {
      if (
        bytes[index] === (signature & 0xff) &&
        bytes[index + 1] === ((signature >>> 8) & 0xff) &&
        bytes[index + 2] === ((signature >>> 16) & 0xff) &&
        bytes[index + 3] === ((signature >>> 24) & 0xff)
      ) {
        return index;
      }
    }
    return -1;
  }

  function decodeUtf8(bytes) {
    try {
      return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    } catch (error) {
      var result = "";
      for (var i = 0; i < bytes.length; i += 1) result += String.fromCharCode(bytes[i]);
      try {
        return decodeURIComponent(escape(result));
      } catch (_error) {
        return result;
      }
    }
  }

  function decodeCp437(bytes) {
    var result = "";
    for (var i = 0; i < bytes.length; i += 1) {
      var code = bytes[i];
      result += code < 128 ? String.fromCharCode(code) : CP437_HIGH[code - 128];
    }
    return result;
  }

  function decodeName(bytes, utf8) {
    return utf8 ? decodeUtf8(bytes) : decodeCp437(bytes);
  }

  function dosDateTime(dateValue, timeValue) {
    if (!dateValue && !timeValue) return null;

    var year = 1980 + ((dateValue >>> 9) & 0x7f);
    var month = ((dateValue >>> 5) & 0x0f) - 1;
    var day = dateValue & 0x1f;
    var hour = (timeValue >>> 11) & 0x1f;
    var minute = (timeValue >>> 5) & 0x3f;
    var second = (timeValue & 0x1f) * 2;

    try {
      var date = new Date(year, Math.max(0, month), Math.max(1, day), hour, minute, second);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    } catch (error) {
      return null;
    }
  }

  function parseExtraFields(bytes) {
    var fields = [];
    var cursor = 0;

    while (cursor + 4 <= bytes.length) {
      var view = new DataView(bytes.buffer, bytes.byteOffset + cursor, bytes.byteLength - cursor);
      var id = view.getUint16(0, true);
      var size = view.getUint16(2, true);
      var start = cursor + 4;
      var end = start + size;
      if (end > bytes.length) break;

      fields.push({ id: id, bytes: bytes.subarray(start, end) });
      cursor = end;
    }

    return fields;
  }

  function getExtraField(fields, id) {
    for (var i = 0; i < fields.length; i += 1) {
      if (fields[i].id === id) return fields[i].bytes;
    }
    return null;
  }

  function applyZip64Values(values, compressed32, uncompressed32, localOffset32, diskStart16) {
    var cursor = 0;
    var view = values ? new DataView(values.buffer, values.byteOffset, values.byteLength) : null;
    var result = {
      compressedSize: compressed32,
      uncompressedSize: uncompressed32,
      localOffset: localOffset32,
      diskStart: diskStart16
    };

    function next64(label) {
      if (!view || cursor + 8 > view.byteLength) {
        throw createError("El campo ZIP64 de " + label + " está incompleto.", "ScanArchiveCorruptError");
      }
      var value = toSafeNumber(readUint64(view, cursor), label);
      cursor += 8;
      return value;
    }

    if (uncompressed32 === 0xffffffff) result.uncompressedSize = next64("tamaño sin comprimir");
    if (compressed32 === 0xffffffff) result.compressedSize = next64("tamaño comprimido");
    if (localOffset32 === 0xffffffff) result.localOffset = next64("desplazamiento local");

    if (diskStart16 === 0xffff) {
      if (!view || cursor + 4 > view.byteLength) {
        throw createError("El campo ZIP64 de disco está incompleto.", "ScanArchiveCorruptError");
      }
      result.diskStart = view.getUint32(cursor, true);
    }

    return result;
  }

  function getUnicodePath(fields) {
    var bytes = getExtraField(fields, UNICODE_PATH_EXTRA_ID);
    if (!bytes || bytes.length < 6 || bytes[0] !== 1) return "";
    return decodeUtf8(bytes.subarray(5));
  }

  async function locateDirectory(file, options, control) {
    assertActive(control);
    emit(options, 3, "Localizando el directorio central del ZIP");

    var tailLength = Math.min(file.size, 22 + 65535 + 20 + 64);
    var tailStart = file.size - tailLength;
    var tail = await readSlice(file, tailStart, tailLength);
    assertActive(control);

    var relativeEocd = findSignatureBackward(tail, EOCD_SIGNATURE);
    if (relativeEocd < 0 || relativeEocd + 22 > tail.length) {
      throw createError("No se encontró el cierre del directorio central. El ZIP puede estar dañado o incompleto.", "ScanArchiveCorruptError");
    }

    var eocdOffset = tailStart + relativeEocd;
    var eocdView = new DataView(tail.buffer, tail.byteOffset + relativeEocd, tail.byteLength - relativeEocd);
    var diskNumber = eocdView.getUint16(4, true);
    var centralDisk = eocdView.getUint16(6, true);
    var entriesOnDisk = eocdView.getUint16(8, true);
    var totalEntries = eocdView.getUint16(10, true);
    var centralSize = eocdView.getUint32(12, true);
    var centralOffset = eocdView.getUint32(16, true);
    var commentLength = eocdView.getUint16(20, true);

    if (relativeEocd + 22 + commentLength > tail.length) {
      throw createError("El comentario final del ZIP está incompleto.", "ScanArchiveCorruptError");
    }

    var zip64 = totalEntries === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff;
    var expectedCentralEnd = eocdOffset;

    if (zip64) {
      var locatorOffset = eocdOffset - 20;
      if (locatorOffset < 0) {
        throw createError("No se encontró el localizador ZIP64.", "ScanArchiveCorruptError");
      }

      var locatorBytes = await readSlice(file, locatorOffset, 20);
      var locatorView = new DataView(locatorBytes.buffer, locatorBytes.byteOffset, locatorBytes.byteLength);
      if (locatorBytes.length < 20 || locatorView.getUint32(0, true) !== ZIP64_LOCATOR_SIGNATURE) {
        throw createError("El localizador ZIP64 no es válido.", "ScanArchiveCorruptError");
      }

      var zip64Disk = locatorView.getUint32(4, true);
      var zip64Offset = toSafeNumber(readUint64(locatorView, 8), "desplazamiento ZIP64");
      var totalDisks = locatorView.getUint32(16, true);

      if (zip64Disk !== 0 || totalDisks !== 1) {
        throw createError("Los ZIP divididos en varios discos no son compatibles.", "ScanArchiveMultiDiskError");
      }

      var zip64Bytes = await readSlice(file, zip64Offset, 56);
      var zip64View = new DataView(zip64Bytes.buffer, zip64Bytes.byteOffset, zip64Bytes.byteLength);
      if (zip64Bytes.length < 56 || zip64View.getUint32(0, true) !== ZIP64_EOCD_SIGNATURE) {
        throw createError("El registro ZIP64 no es válido.", "ScanArchiveCorruptError");
      }

      diskNumber = zip64View.getUint32(16, true);
      centralDisk = zip64View.getUint32(20, true);
      entriesOnDisk = toSafeNumber(readUint64(zip64View, 24), "elementos ZIP64 del disco");
      totalEntries = toSafeNumber(readUint64(zip64View, 32), "cantidad total ZIP64");
      centralSize = toSafeNumber(readUint64(zip64View, 40), "tamaño del directorio ZIP64");
      centralOffset = toSafeNumber(readUint64(zip64View, 48), "desplazamiento del directorio ZIP64");
      expectedCentralEnd = zip64Offset;
    }

    if (diskNumber !== 0 || centralDisk !== 0 || entriesOnDisk !== totalEntries) {
      throw createError("Los ZIP divididos en varios discos no son compatibles.", "ScanArchiveMultiDiskError");
    }

    var maxEntries = Number(options && options.maxEntries) || DEFAULT_MAX_ENTRIES;
    var maxCentralSize = Number(options && options.maxCentralDirectoryBytes) || DEFAULT_MAX_CENTRAL_DIRECTORY;

    if (totalEntries > maxEntries) {
      throw createError("El ZIP contiene " + totalEntries + " elementos, por encima del límite seguro de " + maxEntries + ".", "ScanArchiveEntryLimitError");
    }

    if (centralSize > maxCentralSize) {
      throw createError("El directorio central del ZIP supera el límite seguro de memoria.", "ScanArchiveDirectoryLimitError");
    }

    var prependedBytes = expectedCentralEnd - (centralOffset + centralSize);
    if (prependedBytes > 0) centralOffset += prependedBytes;

    if (centralOffset < 0 || centralSize < 0 || centralOffset + centralSize > file.size) {
      throw createError("El directorio central apunta fuera de los límites del archivo.", "ScanArchiveCorruptError");
    }

    return {
      totalEntries: totalEntries,
      centralOffset: centralOffset,
      centralSize: centralSize,
      zip64: zip64,
      prependedBytes: Math.max(0, prependedBytes),
      commentLength: commentLength
    };
  }

  function createBufferedReader(blob, start, end, chunkSize) {
    var windowStart = -1;
    var windowBytes = null;
    var size = Math.max(64 * 1024, Number(chunkSize) || DEFAULT_CHUNK_SIZE);

    async function ensure(offset, length) {
      if (offset < start || offset + length > end) {
        throw createError("Un registro del directorio central está fuera de sus límites.", "ScanArchiveCorruptError");
      }

      if (
        windowBytes &&
        offset >= windowStart &&
        offset + length <= windowStart + windowBytes.length
      ) {
        var local = offset - windowStart;
        return windowBytes.subarray(local, local + length);
      }

      var readLength = Math.min(end - offset, Math.max(size, length));
      windowStart = offset;
      windowBytes = await readSlice(blob, offset, readLength);

      if (windowBytes.length < length) {
        throw createError("El directorio central terminó antes de lo esperado.", "ScanArchiveCorruptError");
      }

      return windowBytes.subarray(0, length);
    }

    return { ensure: ensure };
  }

  async function yieldControl() {
    await new Promise(function resolveSoon(resolve) {
      setTimeout(resolve, 0);
    });
  }

  async function read(file, options, control) {
    options = options || {};

    if (!(file instanceof Blob)) {
      throw createError("El archivo recibido no es compatible con el lector ZIP.", "ScanArchiveInputError");
    }

    if (!file.size) {
      throw createError("El archivo ZIP está vacío.", "ScanArchiveInputError");
    }

    var Model = root.AuditScan && root.AuditScan.Model;
    if (!Model) {
      throw createError("No está disponible el modelo de datos de SCAN.", "ScanArchiveDependencyError");
    }

    var directory = await locateDirectory(file, options, control);
    assertActive(control);
    emit(options, 10, "Directorio central localizado: " + directory.totalEntries + " elementos");

    var centralEnd = directory.centralOffset + directory.centralSize;
    var reader = createBufferedReader(file, directory.centralOffset, centralEnd, options.chunkSize);
    var entries = [];
    var cursor = directory.centralOffset;
    var chunkYield = directory.totalEntries > 250000 ? 2000 : directory.totalEntries > 50000 ? 1000 : 500;

    for (var index = 0; index < directory.totalEntries; index += 1) {
      assertActive(control);

      var fixedBytes = await reader.ensure(cursor, 46);
      var fixed = new DataView(fixedBytes.buffer, fixedBytes.byteOffset, fixedBytes.byteLength);
      if (fixed.getUint32(0, true) !== CENTRAL_SIGNATURE) {
        throw createError("Se encontró un registro central inválido en el elemento " + (index + 1) + ".", "ScanArchiveCorruptError");
      }

      var versionMadeBy = fixed.getUint16(4, true);
      var flags = fixed.getUint16(8, true);
      var method = fixed.getUint16(10, true);
      var modifiedTime = fixed.getUint16(12, true);
      var modifiedDate = fixed.getUint16(14, true);
      var crc32 = fixed.getUint32(16, true);
      var compressed32 = fixed.getUint32(20, true);
      var uncompressed32 = fixed.getUint32(24, true);
      var nameLength = fixed.getUint16(28, true);
      var extraLength = fixed.getUint16(30, true);
      var commentLength = fixed.getUint16(32, true);
      var diskStart16 = fixed.getUint16(34, true);
      var externalAttributes = fixed.getUint32(38, true);
      var localOffset32 = fixed.getUint32(42, true);
      var recordLength = 46 + nameLength + extraLength + commentLength;
      var record = await reader.ensure(cursor, recordLength);
      var nameBytes = record.subarray(46, 46 + nameLength);
      var extraBytes = record.subarray(46 + nameLength, 46 + nameLength + extraLength);
      var commentBytes = record.subarray(46 + nameLength + extraLength, recordLength);
      var extraFields = parseExtraFields(extraBytes);
      var zip64Values = applyZip64Values(
        getExtraField(extraFields, ZIP64_EXTRA_ID),
        compressed32,
        uncompressed32,
        localOffset32,
        diskStart16
      );

      if (zip64Values.diskStart !== 0) {
        throw createError("Se detectó un elemento almacenado en otro disco ZIP.", "ScanArchiveMultiDiskError");
      }

      var utf8 = Boolean(flags & 0x0800);
      var decodedName = getUnicodePath(extraFields) || decodeName(nameBytes, utf8);
      var decodedComment = decodeName(commentBytes, utf8);
      var unixMode = externalAttributes >>> 16;
      var unixDirectory = (unixMode & 0xf000) === 0x4000;
      var dosDirectory = Boolean(externalAttributes & 0x10);
      var isFolder = /\/$/.test(decodedName) || unixDirectory || dosDirectory;

      entries.push(Model.buildEntry({
        id: "scan_zip_" + index + "_" + decodedName,
        path: decodedName,
        originalPath: decodedName,
        isFolder: isFolder,
        uncompressedSize: zip64Values.uncompressedSize,
        compressedSize: zip64Values.compressedSize,
        modifiedAt: dosDateTime(modifiedDate, modifiedTime),
        comment: decodedComment,
        crc32: crc32,
        encrypted: Boolean(flags & 0x0001),
        unsafePath: Model.hasUnsafeSegments(decodedName),
        compressionMethod: method,
        localOffset: zip64Values.localOffset,
        versionMadeBy: versionMadeBy
      }));

      cursor += recordLength;

      if ((index + 1) % chunkYield === 0 || index + 1 === directory.totalEntries) {
        var ratio = directory.totalEntries ? (index + 1) / directory.totalEntries : 1;
        emit(options, 10 + ratio * 72, "Leyendo " + (index + 1) + " de " + directory.totalEntries + " elementos");
        await yieldControl();
      }
    }

    assertActive(control);
    emit(options, 84, "Completando carpetas implícitas");
    var implicitFolders = Model.buildImplicitFolders(entries);
    var allEntries = Model.sortEntries(entries.concat(implicitFolders));
    var summary = Model.createSummary(allEntries, { name: file.name, size: file.size });
    var compressed = Number(summary.compressedSize) || 0;
    var uncompressed = Number(summary.totalSize) || 0;
    var compressionRatio = compressed > 0 ? uncompressed / compressed : 0;

    summary.compressionRatio = compressionRatio;
    summary.suspiciousCompression = compressionRatio >= 500 && uncompressed >= 1024 * 1024 * 1024;
    summary.hugeExpandedSize = uncompressed >= 20 * 1024 * 1024 * 1024;
    summary.excessiveEntries = allEntries.length >= 250000;
    summary.alerts = Number(summary.alerts || 0) +
      (summary.suspiciousCompression ? 1 : 0) +
      (summary.hugeExpandedSize ? 1 : 0) +
      (summary.excessiveEntries ? 1 : 0);

    assertActive(control);
    emit(options, 100, "Escaneo completado");

    return {
      entries: allEntries,
      summary: summary,
      metadata: {
        zipName: file.name || "archivo.zip",
        zipSize: Number(file.size) || 0,
        lastModified: Number(file.lastModified) || null,
        explicitEntries: entries.length,
        implicitFolders: implicitFolders.length,
        totalEntries: allEntries.length,
        centralDirectoryBytes: directory.centralSize,
        zip64: directory.zip64,
        prependedBytes: directory.prependedBytes,
        streamingDirectoryRead: true,
        scannedAt: summary.scannedAt
      }
    };
  }

  root.AuditScan.ArchiveReader = {
    read: read,
    locateDirectory: locateDirectory
  };
})(typeof self !== "undefined" ? self : globalThis);
