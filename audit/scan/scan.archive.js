/* =========================================================
Nombre completo: scan.archive.js
Ruta o ubicación: /audit/scan/scan.archive.js
Función o funciones:
- Leer el directorio central de un ZIP sin descomprimir archivos.
- Evitar cargar el ZIP completo en memoria.
- Soportar ZIP clásico, ZIP64, nombres UTF-8 y CP437.
- Validar comentarios finales, ZIP autoextraíbles y archivos multidisco.
- Limitar cantidad de entradas y tamaño del directorio central.
- Funcionar en ventana principal y Web Worker.
========================================================= */

(function attachArchiveReader(root) {
  "use strict";

  root.AuditScan = root.AuditScan || {};

  var EOCD = 0x06054b50;
  var ZIP64_EOCD = 0x06064b50;
  var ZIP64_LOCATOR = 0x07064b50;
  var CENTRAL = 0x02014b50;
  var ZIP64_EXTRA = 0x0001;
  var UNICODE_PATH_EXTRA = 0x7075;
  var MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);
  var MAX_ENTRIES = 1000000;
  var MAX_DIRECTORY_BYTES = 512 * 1024 * 1024;
  var READ_CHUNK_BYTES = 4 * 1024 * 1024;

  var CP437 = [
    "Ç","ü","é","â","ä","à","å","ç","ê","ë","è","ï","î","ì","Ä","Å",
    "É","æ","Æ","ô","ö","ò","û","ù","ÿ","Ö","Ü","¢","£","¥","₧","ƒ",
    "á","í","ó","ú","ñ","Ñ","ª","º","¿","⌐","¬","½","¼","¡","«","»",
    "░","▒","▓","│","┤","╡","╢","╖","╕","╣","║","╗","╝","╜","╛","┐",
    "└","┴","┬","├","─","┼","╞","╟","╚","╔","╩","╦","╠","═","╬","╧",
    "╨","╤","╥","╙","╘","╒","╓","╫","╪","┘","┌","█","▄","▌","▐","▀",
    "α","ß","Γ","π","Σ","σ","µ","τ","Φ","Θ","Ω","δ","∞","φ","ε","∩",
    "≡","±","≥","≤","⌠","⌡","÷","≈","°","∙","·","√","ⁿ","²","■"," "
  ];

  function fail(message, name) {
    var error = new Error(message || "No fue posible leer el ZIP.");
    error.name = name || "ScanArchiveError";
    return error;
  }

  function progress(options, value, label) {
    if (!options || typeof options.onProgress !== "function") return;
    options.onProgress({
      value: Math.max(0, Math.min(100, Math.round(Number(value) || 0))),
      label: label || "Procesando"
    });
  }

  function assertActive(control) {
    if (control && typeof control.isCancelled === "function" && control.isCancelled()) {
      throw fail("El escaneo fue cancelado.", "ScanCancelledError");
    }
  }

  function safeNumber(value, label) {
    if (typeof value === "number") {
      if (Number.isSafeInteger(value) && value >= 0) return value;
    } else if (typeof value === "bigint" && value >= 0n && value <= MAX_SAFE_BIGINT) {
      return Number(value);
    }

    throw fail((label || "Valor ZIP") + " supera el límite numérico seguro.", "ScanArchiveRangeError");
  }

  function uint64(view, offset) {
    if (typeof view.getBigUint64 === "function") return view.getBigUint64(offset, true);
    return (BigInt(view.getUint32(offset + 4, true)) << 32n) | BigInt(view.getUint32(offset, true));
  }

  async function sliceBytes(blob, start, length) {
    var from = Math.max(0, Number(start) || 0);
    var size = Math.max(0, Number(length) || 0);
    return new Uint8Array(await blob.slice(from, Math.min(blob.size, from + size)).arrayBuffer());
  }

  function signatureAt(bytes, offset, signature) {
    return offset >= 0 && offset + 4 <= bytes.length &&
      bytes[offset] === (signature & 0xff) &&
      bytes[offset + 1] === ((signature >>> 8) & 0xff) &&
      bytes[offset + 2] === ((signature >>> 16) & 0xff) &&
      bytes[offset + 3] === ((signature >>> 24) & 0xff);
  }

  function findBackward(bytes, signature, end) {
    for (var index = Math.min(bytes.length - 4, end == null ? bytes.length - 4 : end); index >= 0; index -= 1) {
      if (signatureAt(bytes, index, signature)) return index;
    }
    return -1;
  }

  function findValidEocd(tail) {
    var searchEnd = tail.length - 4;

    while (searchEnd >= 0) {
      var index = findBackward(tail, EOCD, searchEnd);
      if (index < 0) return -1;

      if (index + 22 <= tail.length) {
        var view = new DataView(tail.buffer, tail.byteOffset + index, tail.byteLength - index);
        var commentLength = view.getUint16(20, true);
        if (index + 22 + commentLength === tail.length) return index;
      }

      searchEnd = index - 1;
    }

    return -1;
  }

  function decodeUtf8(bytes) {
    try {
      return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    } catch (_error) {
      var encoded = "";
      for (var index = 0; index < bytes.length; index += 1) {
        encoded += "%" + bytes[index].toString(16).padStart(2, "0");
      }
      try {
        return decodeURIComponent(encoded);
      } catch (_decodeError) {
        return "";
      }
    }
  }

  function decodeCp437(bytes) {
    var value = "";
    for (var index = 0; index < bytes.length; index += 1) {
      value += bytes[index] < 128 ? String.fromCharCode(bytes[index]) : CP437[bytes[index] - 128];
    }
    return value;
  }

  function decode(bytes, utf8) {
    return utf8 ? decodeUtf8(bytes) : decodeCp437(bytes);
  }

  function dosDate(dateValue, timeValue) {
    if (!dateValue && !timeValue) return null;

    var year = 1980 + ((dateValue >>> 9) & 0x7f);
    var month = ((dateValue >>> 5) & 0x0f) - 1;
    var day = dateValue & 0x1f;
    var hour = (timeValue >>> 11) & 0x1f;
    var minute = (timeValue >>> 5) & 0x3f;
    var second = (timeValue & 0x1f) * 2;
    var result = new Date(year, Math.max(0, month), Math.max(1, day), hour, minute, second);

    return Number.isNaN(result.getTime()) ? null : result.toISOString();
  }

  function extraFields(bytes) {
    var fields = [];
    var cursor = 0;

    while (cursor + 4 <= bytes.length) {
      var view = new DataView(bytes.buffer, bytes.byteOffset + cursor, bytes.byteLength - cursor);
      var id = view.getUint16(0, true);
      var length = view.getUint16(2, true);
      var start = cursor + 4;
      var end = start + length;
      if (end > bytes.length) break;
      fields.push({ id: id, bytes: bytes.subarray(start, end) });
      cursor = end;
    }

    return fields;
  }

  function field(fields, id) {
    for (var index = 0; index < fields.length; index += 1) {
      if (fields[index].id === id) return fields[index].bytes;
    }
    return null;
  }

  function zip64Values(bytes, compressed, uncompressed, localOffset, diskStart) {
    var cursor = 0;
    var view = bytes ? new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength) : null;
    var result = {
      compressedSize: compressed,
      uncompressedSize: uncompressed,
      localOffset: localOffset,
      diskStart: diskStart
    };

    function next64(label) {
      if (!view || cursor + 8 > view.byteLength) {
        throw fail("El campo ZIP64 de " + label + " está incompleto.", "ScanArchiveCorruptError");
      }
      var value = safeNumber(uint64(view, cursor), label);
      cursor += 8;
      return value;
    }

    if (uncompressed === 0xffffffff) result.uncompressedSize = next64("tamaño sin comprimir");
    if (compressed === 0xffffffff) result.compressedSize = next64("tamaño comprimido");
    if (localOffset === 0xffffffff) result.localOffset = next64("desplazamiento local");

    if (diskStart === 0xffff) {
      if (!view || cursor + 4 > view.byteLength) {
        throw fail("El campo ZIP64 de disco está incompleto.", "ScanArchiveCorruptError");
      }
      result.diskStart = view.getUint32(cursor, true);
    }

    return result;
  }

  function unicodePath(fields) {
    var bytes = field(fields, UNICODE_PATH_EXTRA);
    return bytes && bytes.length >= 6 && bytes[0] === 1 ? decodeUtf8(bytes.subarray(5)) : "";
  }

  async function hasCentralSignature(file, offset, totalEntries) {
    if (totalEntries === 0) return true;
    if (offset < 0 || offset + 4 > file.size) return false;
    var bytes = await sliceBytes(file, offset, 4);
    return signatureAt(bytes, 0, CENTRAL);
  }

  async function locateDirectory(file, options, control) {
    assertActive(control);
    progress(options, 3, "Localizando el directorio central del ZIP");

    var tailLength = Math.min(file.size, 22 + 65535 + 20 + 128);
    var tailStart = file.size - tailLength;
    var tail = await sliceBytes(file, tailStart, tailLength);
    var relativeEocd = findValidEocd(tail);

    if (relativeEocd < 0) {
      throw fail("No se encontró un cierre ZIP válido. El archivo puede estar dañado o incompleto.", "ScanArchiveCorruptError");
    }

    assertActive(control);

    var eocdOffset = tailStart + relativeEocd;
    var eocd = new DataView(tail.buffer, tail.byteOffset + relativeEocd, tail.byteLength - relativeEocd);
    var diskNumber = eocd.getUint16(4, true);
    var centralDisk = eocd.getUint16(6, true);
    var entriesOnDisk = eocd.getUint16(8, true);
    var totalEntries = eocd.getUint16(10, true);
    var centralSize = eocd.getUint32(12, true);
    var centralOffset = eocd.getUint32(16, true);
    var commentLength = eocd.getUint16(20, true);
    var zip64 = totalEntries === 0xffff || centralSize === 0xffffffff || centralOffset === 0xffffffff;
    var expectedCentralEnd = eocdOffset;

    if (zip64) {
      var locatorOffset = eocdOffset - 20;
      var locatorBytes = await sliceBytes(file, locatorOffset, 20);
      var locator = new DataView(locatorBytes.buffer, locatorBytes.byteOffset, locatorBytes.byteLength);

      if (locatorBytes.length < 20 || locator.getUint32(0, true) !== ZIP64_LOCATOR) {
        throw fail("El localizador ZIP64 no es válido.", "ScanArchiveCorruptError");
      }

      if (locator.getUint32(4, true) !== 0 || locator.getUint32(16, true) !== 1) {
        throw fail("Los ZIP divididos en varios discos no son compatibles.", "ScanArchiveMultiDiskError");
      }

      var declaredZip64Offset = safeNumber(uint64(locator, 8), "desplazamiento ZIP64");
      var zip64Offset = declaredZip64Offset;
      var zip64Bytes = await sliceBytes(file, zip64Offset, 56);

      if (zip64Bytes.length < 56 || !signatureAt(zip64Bytes, 0, ZIP64_EOCD)) {
        var relativeZip64 = findBackward(tail, ZIP64_EOCD, relativeEocd - 21);
        if (relativeZip64 < 0) {
          throw fail("No se encontró el registro ZIP64.", "ScanArchiveCorruptError");
        }
        zip64Offset = tailStart + relativeZip64;
        zip64Bytes = await sliceBytes(file, zip64Offset, 56);
      }

      var zip64View = new DataView(zip64Bytes.buffer, zip64Bytes.byteOffset, zip64Bytes.byteLength);
      if (zip64Bytes.length < 56 || zip64View.getUint32(0, true) !== ZIP64_EOCD) {
        throw fail("El registro ZIP64 no es válido.", "ScanArchiveCorruptError");
      }

      diskNumber = zip64View.getUint32(16, true);
      centralDisk = zip64View.getUint32(20, true);
      entriesOnDisk = safeNumber(uint64(zip64View, 24), "elementos ZIP64 del disco");
      totalEntries = safeNumber(uint64(zip64View, 32), "cantidad total ZIP64");
      centralSize = safeNumber(uint64(zip64View, 40), "tamaño del directorio ZIP64");
      centralOffset = safeNumber(uint64(zip64View, 48), "desplazamiento del directorio ZIP64");
      expectedCentralEnd = zip64Offset;
    }

    if (diskNumber !== 0 || centralDisk !== 0 || entriesOnDisk !== totalEntries) {
      throw fail("Los ZIP divididos en varios discos no son compatibles.", "ScanArchiveMultiDiskError");
    }

    var maxEntries = Number(options && options.maxEntries) || MAX_ENTRIES;
    var maxDirectory = Number(options && options.maxCentralDirectoryBytes) || MAX_DIRECTORY_BYTES;

    if (totalEntries > maxEntries) {
      throw fail("El ZIP contiene " + totalEntries + " elementos, por encima del límite seguro de " + maxEntries + ".", "ScanArchiveEntryLimitError");
    }

    if (centralSize > maxDirectory) {
      throw fail("El directorio central del ZIP supera el límite seguro de memoria.", "ScanArchiveDirectoryLimitError");
    }

    var prependedBytes = 0;
    var validDeclaredOffset = await hasCentralSignature(file, centralOffset, totalEntries);

    if (!validDeclaredOffset) {
      var adjustment = expectedCentralEnd - (centralOffset + centralSize);
      var adjustedOffset = centralOffset + Math.max(0, adjustment);

      if (adjustment <= 0 || !(await hasCentralSignature(file, adjustedOffset, totalEntries))) {
        throw fail("El directorio central apunta a una ubicación inválida.", "ScanArchiveCorruptError");
      }

      prependedBytes = adjustment;
      centralOffset = adjustedOffset;
    }

    if (centralOffset < 0 || centralOffset + centralSize > file.size) {
      throw fail("El directorio central apunta fuera de los límites del archivo.", "ScanArchiveCorruptError");
    }

    return {
      totalEntries: totalEntries,
      centralOffset: centralOffset,
      centralSize: centralSize,
      zip64: zip64,
      prependedBytes: prependedBytes,
      commentLength: commentLength
    };
  }

  function bufferedReader(blob, start, end, chunkSize) {
    var windowStart = -1;
    var windowBytes = null;
    var size = Math.max(64 * 1024, Number(chunkSize) || READ_CHUNK_BYTES);

    async function ensure(offset, length) {
      if (offset < start || offset + length > end) {
        throw fail("Un registro central está fuera de sus límites.", "ScanArchiveCorruptError");
      }

      if (windowBytes && offset >= windowStart && offset + length <= windowStart + windowBytes.length) {
        var localOffset = offset - windowStart;
        return windowBytes.subarray(localOffset, localOffset + length);
      }

      windowStart = offset;
      windowBytes = await sliceBytes(blob, offset, Math.min(end - offset, Math.max(size, length)));

      if (windowBytes.length < length) {
        throw fail("El directorio central terminó antes de lo esperado.", "ScanArchiveCorruptError");
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
      throw fail("El archivo recibido no es compatible con el lector ZIP.", "ScanArchiveInputError");
    }
    if (!file.size) {
      throw fail("El archivo ZIP está vacío.", "ScanArchiveInputError");
    }

    var Model = root.AuditScan && root.AuditScan.Model;
    if (!Model) {
      throw fail("No está disponible el modelo de datos de SCAN.", "ScanArchiveDependencyError");
    }

    var directory = await locateDirectory(file, options, control);
    assertActive(control);
    progress(options, 10, "Directorio central localizado: " + directory.totalEntries + " elementos");

    var reader = bufferedReader(
      file,
      directory.centralOffset,
      directory.centralOffset + directory.centralSize,
      options.chunkSize
    );
    var entries = [];
    var cursor = directory.centralOffset;
    var yieldEvery = directory.totalEntries > 250000 ? 2000 : directory.totalEntries > 50000 ? 1000 : 500;

    for (var index = 0; index < directory.totalEntries; index += 1) {
      assertActive(control);

      var fixedBytes = await reader.ensure(cursor, 46);
      var fixed = new DataView(fixedBytes.buffer, fixedBytes.byteOffset, fixedBytes.byteLength);
      if (fixed.getUint32(0, true) !== CENTRAL) {
        throw fail("Registro central inválido en el elemento " + (index + 1) + ".", "ScanArchiveCorruptError");
      }

      var versionMadeBy = fixed.getUint16(4, true);
      var flags = fixed.getUint16(8, true);
      var compressionMethod = fixed.getUint16(10, true);
      var modifiedTime = fixed.getUint16(12, true);
      var modifiedDate = fixed.getUint16(14, true);
      var crc32 = fixed.getUint32(16, true);
      var compressed32 = fixed.getUint32(20, true);
      var uncompressed32 = fixed.getUint32(24, true);
      var nameLength = fixed.getUint16(28, true);
      var extraLength = fixed.getUint16(30, true);
      var commentLength = fixed.getUint16(32, true);
      var diskStart = fixed.getUint16(34, true);
      var externalAttributes = fixed.getUint32(38, true);
      var localOffset = fixed.getUint32(42, true);
      var recordLength = 46 + nameLength + extraLength + commentLength;
      var record = await reader.ensure(cursor, recordLength);
      var nameBytes = record.subarray(46, 46 + nameLength);
      var extraBytes = record.subarray(46 + nameLength, 46 + nameLength + extraLength);
      var commentBytes = record.subarray(46 + nameLength + extraLength, recordLength);
      var fields = extraFields(extraBytes);
      var sizes = zip64Values(
        field(fields, ZIP64_EXTRA),
        compressed32,
        uncompressed32,
        localOffset,
        diskStart
      );

      if (sizes.diskStart !== 0) {
        throw fail("Se detectó un elemento almacenado en otro disco ZIP.", "ScanArchiveMultiDiskError");
      }

      var utf8 = Boolean(flags & 0x0800);
      var decodedName = unicodePath(fields) || decode(nameBytes, utf8);
      var decodedComment = decode(commentBytes, utf8);
      var unixDirectory = ((externalAttributes >>> 16) & 0xf000) === 0x4000;
      var dosDirectory = Boolean(externalAttributes & 0x10);
      var isFolder = /\/$/.test(decodedName) || unixDirectory || dosDirectory;

      entries.push(Model.buildEntry({
        id: "scan_zip_" + index + "_" + decodedName,
        path: decodedName,
        originalPath: decodedName,
        isFolder: isFolder,
        uncompressedSize: sizes.uncompressedSize,
        compressedSize: sizes.compressedSize,
        modifiedAt: dosDate(modifiedDate, modifiedTime),
        comment: decodedComment,
        crc32: crc32,
        compressionMethod: compressionMethod,
        localOffset: sizes.localOffset,
        versionMadeBy: versionMadeBy,
        encrypted: Boolean(flags & 0x0001),
        unsafePath: Model.hasUnsafeSegments(decodedName)
      }));

      cursor += recordLength;

      if ((index + 1) % yieldEvery === 0 || index + 1 === directory.totalEntries) {
        var ratio = directory.totalEntries ? (index + 1) / directory.totalEntries : 1;
        progress(options, 10 + ratio * 72, "Leyendo " + (index + 1) + " de " + directory.totalEntries + " elementos");
        await yieldControl();
      }
    }

    assertActive(control);
    progress(options, 84, "Completando carpetas implícitas");

    var explicitEntries = entries.length;
    var implicitFolders = Model.buildImplicitFolders(entries);
    Model.appendEntries(entries, implicitFolders);
    Model.sortEntries(entries);

    var summary = Model.createSummary(entries, { name: file.name, size: file.size });
    var compressed = Number(summary.compressedSize) || 0;
    var uncompressed = Number(summary.totalSize) || 0;
    var ratio = compressed > 0 ? uncompressed / compressed : 0;

    summary.compressionRatio = ratio;
    summary.suspiciousCompression = ratio >= 500 && uncompressed >= 1024 * 1024 * 1024;
    summary.hugeExpandedSize = uncompressed >= 20 * 1024 * 1024 * 1024;
    summary.excessiveEntries = entries.length >= 250000;
    summary.alerts = Number(summary.alerts || 0) +
      (summary.suspiciousCompression ? 1 : 0) +
      (summary.hugeExpandedSize ? 1 : 0) +
      (summary.excessiveEntries ? 1 : 0);

    assertActive(control);
    progress(options, 100, "Escaneo completado");

    return {
      entries: entries,
      summary: summary,
      metadata: {
        zipName: file.name || "archivo.zip",
        zipSize: Number(file.size) || 0,
        lastModified: Number(file.lastModified) || null,
        explicitEntries: explicitEntries,
        implicitFolders: implicitFolders.length,
        totalEntries: entries.length,
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
