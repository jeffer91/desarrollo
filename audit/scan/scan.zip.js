/* =========================================================
Nombre completo: scan.zip.js
Ruta o ubicación: /audit/scan/scan.zip.js
Función o funciones:
- Leer la estructura real de un archivo ZIP mediante JSZip.
- Obtener rutas, carpetas, archivos, tamaños, fechas y metadatos.
- Crear carpetas implícitas cuando no están declaradas en el ZIP.
- Informar progreso y respetar cancelaciones lógicas.
- Detectar compresión sospechosa y tamaños expandidos extremos.
- Funcionar como respaldo cuando el Web Worker no esté disponible.
========================================================= */

(function attachScanZipReader(window) {
  "use strict";

  window.AuditScan = window.AuditScan || {};

  var Model = window.AuditScan.Model;

  function ensureDependencies() {
    if (!Model) {
      throw new Error("SCAN no puede analizar el ZIP porque falta scan.model.js.");
    }

    if (!window.JSZip || typeof window.JSZip.loadAsync !== "function") {
      throw new Error("No se pudo cargar el lector ZIP. Verifique la conexión o incluya JSZip localmente.");
    }
  }

  function friendlyError(error) {
    var message = String(error && error.message ? error.message : error || "Error desconocido");
    var lower = message.toLowerCase();

    if (lower.indexOf("encrypted") >= 0 || lower.indexOf("password") >= 0) {
      return "El ZIP está protegido con contraseña o utiliza cifrado no compatible.";
    }
    if (lower.indexOf("corrupted") >= 0 || lower.indexOf("central directory") >= 0 || lower.indexOf("signature") >= 0) {
      return "El archivo ZIP parece estar dañado o incompleto.";
    }
    if (lower.indexOf("compression") >= 0 || lower.indexOf("method") >= 0) {
      return "El ZIP utiliza un método de compresión no compatible.";
    }
    if (lower.indexOf("memory") >= 0 || lower.indexOf("allocation") >= 0) {
      return "No hubo memoria suficiente para analizar este ZIP.";
    }

    return message;
  }

  function throwIfCancelled(control) {
    if (control && typeof control.isCancelled === "function" && control.isCancelled()) {
      var error = new Error("El escaneo fue cancelado.");
      error.name = "ScanCancelledError";
      throw error;
    }
  }

  function emitProgress(options, value, label) {
    var callback = options && options.onProgress;
    if (typeof callback !== "function") return;

    callback({
      value: Math.max(0, Math.min(100, Math.round(Number(value) || 0))),
      label: label || "Procesando"
    });
  }

  function getInternalData(entry) {
    var data = entry && entry._data;
    return data && typeof data === "object" ? data : {};
  }

  function getSize(data, candidates) {
    for (var i = 0; i < candidates.length; i += 1) {
      var value = Number(data && data[candidates[i]]);
      if (Number.isFinite(value) && value >= 0) return value;
    }
    return 0;
  }

  function getCrc32(entry, data) {
    var values = [
      data && data.crc32,
      data && data._crc32,
      entry && entry.crc32
    ];

    for (var i = 0; i < values.length; i += 1) {
      if (values[i] != null) return values[i];
    }
    return null;
  }

  function isEncrypted(entry) {
    return Boolean(
      entry && (
        entry.encrypted === true ||
        entry._data && entry._data.encrypted === true
      )
    );
  }

  function mapZipEntry(entry, index) {
    var data = getInternalData(entry);
    var originalPath = Model.normalizeSlashes(
      entry && (entry.unsafeOriginalName || entry.name)
    );
    var safePath = Model.normalizeSlashes(entry && entry.name);
    var isFolder = Boolean(entry && (entry.dir || /\/$/.test(safePath)));

    return Model.buildEntry({
      id: "scan_zip_" + index + "_" + safePath,
      path: safePath,
      originalPath: originalPath || safePath,
      isFolder: isFolder,
      uncompressedSize: getSize(data, ["uncompressedSize", "_uncompressedSize", "size"]),
      compressedSize: getSize(data, ["compressedSize", "_compressedSize"]),
      modifiedAt: entry && entry.date instanceof Date ? entry.date.toISOString() : null,
      comment: entry && entry.comment,
      crc32: getCrc32(entry, data),
      encrypted: isEncrypted(entry),
      unsafePath: Model.hasUnsafeSegments(originalPath || safePath)
    });
  }

  function processEntries(zip, options, control) {
    var rawEntries = Object.keys(zip.files || {}).map(function getEntry(key) {
      return zip.files[key];
    });

    var entries = [];
    var count = rawEntries.length;
    var chunkSize = count > 25000 ? 500 : count > 5000 ? 250 : 100;

    return new Promise(function processPromise(resolve, reject) {
      var index = 0;

      function processChunk() {
        try {
          throwIfCancelled(control);

          var end = Math.min(index + chunkSize, count);
          for (; index < end; index += 1) {
            entries.push(mapZipEntry(rawEntries[index], index));
          }

          var percent = count ? 45 + (index / count) * 45 : 90;
          emitProgress(options, percent, "Organizando " + index + " de " + count + " elementos");

          if (index < count) {
            window.setTimeout(processChunk, 0);
            return;
          }

          resolve(entries);
        } catch (error) {
          reject(error);
        }
      }

      processChunk();
    });
  }

  function enrichRiskSummary(summary, entryCount) {
    var compressed = Number(summary.compressedSize) || 0;
    var uncompressed = Number(summary.totalSize) || 0;
    var ratio = compressed > 0 ? uncompressed / compressed : 0;
    var suspiciousCompression = ratio >= 500 && uncompressed >= 1024 * 1024 * 1024;
    var hugeExpandedSize = uncompressed >= 20 * 1024 * 1024 * 1024;
    var excessiveEntries = entryCount >= 250000;

    summary.compressionRatio = ratio;
    summary.suspiciousCompression = suspiciousCompression;
    summary.hugeExpandedSize = hugeExpandedSize;
    summary.excessiveEntries = excessiveEntries;
    summary.alerts = Number(summary.alerts || 0) +
      (suspiciousCompression ? 1 : 0) +
      (hugeExpandedSize ? 1 : 0) +
      (excessiveEntries ? 1 : 0);

    return summary;
  }

  async function read(file, options, control) {
    ensureDependencies();

    if (!(file instanceof Blob)) {
      throw new Error("El archivo recibido no es compatible con el lector ZIP.");
    }

    throwIfCancelled(control);
    emitProgress(options, 3, "Leyendo el archivo comprimido");

    var buffer;
    try {
      buffer = await file.arrayBuffer();
    } catch (error) {
      throw new Error("No fue posible leer el archivo ZIP seleccionado.");
    }

    throwIfCancelled(control);
    emitProgress(options, 20, "Validando la estructura ZIP");

    var zip;
    try {
      zip = await window.JSZip.loadAsync(buffer, {
        createFolders: true,
        checkCRC32: false
      });
    } catch (error) {
      throw new Error(friendlyError(error));
    }

    buffer = null;
    throwIfCancelled(control);
    emitProgress(options, 45, "Estructura ZIP validada");

    var explicitEntries = await processEntries(zip, options, control);
    throwIfCancelled(control);

    emitProgress(options, 92, "Completando carpetas implícitas");
    var implicitFolders = Model.buildImplicitFolders(explicitEntries);
    var entries = Model.sortEntries(explicitEntries.concat(implicitFolders));

    emitProgress(options, 97, "Calculando resumen final");
    var summary = enrichRiskSummary(Model.createSummary(entries, {
      name: file.name,
      size: file.size
    }), entries.length);

    throwIfCancelled(control);
    emitProgress(options, 100, "Escaneo completado");

    return {
      entries: entries,
      summary: summary,
      metadata: {
        zipName: file.name || "archivo.zip",
        zipSize: Number(file.size) || 0,
        lastModified: Number(file.lastModified) || null,
        explicitEntries: explicitEntries.length,
        implicitFolders: implicitFolders.length,
        totalEntries: entries.length,
        scannedAt: summary.scannedAt
      }
    };
  }

  window.AuditScan.ZipReader = {
    read: read
  };
})(window);
