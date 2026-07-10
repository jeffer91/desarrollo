/* =========================================================
Nombre completo: scan.worker.js
Ruta o ubicación: /audit/scan/scan.worker.js
Función o funciones:
- Ejecutar la lectura y organización del ZIP fuera del hilo principal.
- Mantener la interfaz fluida durante análisis grandes.
- Enviar progreso, resultados por bloques y errores normalizados.
- Detectar compresión sospechosa, archivos vacíos y rutas inseguras.
========================================================= */

(function bootScanWorker(self) {
  "use strict";

  var activeJobId = "";
  var Model = null;

  function post(type, payload) {
    self.postMessage(Object.assign({ type: type, jobId: activeJobId }, payload || {}));
  }

  function progress(value, label) {
    post("progress", {
      value: Math.max(0, Math.min(100, Math.round(Number(value) || 0))),
      label: label || "Procesando"
    });
  }

  function assertActive(jobId) {
    if (!jobId || activeJobId !== jobId) {
      var error = new Error("El escaneo fue cancelado.");
      error.name = "ScanCancelledError";
      throw error;
    }
  }

  function loadDependencies() {
    if (!Model) {
      importScripts("./scan.model.js");
      Model = self.AuditScan && self.AuditScan.Model;
    }

    if (!Model) {
      throw new Error("No se pudo cargar el modelo de datos de SCAN en el worker.");
    }

    if (!self.JSZip) {
      try {
        importScripts("./vendor/jszip.min.js");
      } catch (localError) {
        importScripts("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js");
      }
    }

    if (!self.JSZip || typeof self.JSZip.loadAsync !== "function") {
      throw new Error("No se pudo cargar JSZip dentro del worker.");
    }
  }

  function internalData(entry) {
    var data = entry && entry._data;
    return data && typeof data === "object" ? data : {};
  }

  function sizeFrom(data, names) {
    for (var i = 0; i < names.length; i += 1) {
      var value = Number(data && data[names[i]]);
      if (Number.isFinite(value) && value >= 0) return value;
    }
    return 0;
  }

  function mapEntry(entry, index) {
    var data = internalData(entry);
    var originalPath = Model.normalizeSlashes(entry && (entry.unsafeOriginalName || entry.name));
    var safePath = Model.normalizeSlashes(entry && entry.name);
    var isFolder = Boolean(entry && (entry.dir || /\/$/.test(safePath)));

    return Model.buildEntry({
      id: "scan_zip_" + index + "_" + safePath,
      path: safePath,
      originalPath: originalPath || safePath,
      isFolder: isFolder,
      uncompressedSize: sizeFrom(data, ["uncompressedSize", "_uncompressedSize", "size"]),
      compressedSize: sizeFrom(data, ["compressedSize", "_compressedSize"]),
      modifiedAt: entry && entry.date instanceof Date ? entry.date.toISOString() : null,
      comment: entry && entry.comment,
      crc32: data.crc32 == null ? data._crc32 : data.crc32,
      encrypted: Boolean(entry && (entry.encrypted || data.encrypted)),
      unsafePath: Model.hasUnsafeSegments(originalPath || safePath)
    });
  }

  function friendlyError(error) {
    var message = String(error && error.message ? error.message : error || "Error desconocido");
    var lower = message.toLowerCase();

    if (error && error.name === "ScanCancelledError") return message;
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
    if (lower.indexOf("jszip") >= 0 || lower.indexOf("importscripts") >= 0) {
      return "No se pudo cargar el lector ZIP dentro del proceso independiente.";
    }

    return message;
  }

  async function yieldControl() {
    await new Promise(function resolveLater(resolve) {
      self.setTimeout(resolve, 0);
    });
  }

  async function processJob(message) {
    activeJobId = String(message.jobId || "");
    var jobId = activeJobId;
    var file = message.file;

    loadDependencies();
    assertActive(jobId);

    if (!(file instanceof Blob)) {
      throw new Error("El archivo recibido por el worker no es compatible.");
    }

    progress(2, "Preparando proceso independiente");
    var buffer = await file.arrayBuffer();
    assertActive(jobId);

    progress(18, "Validando estructura ZIP");
    var zip = await self.JSZip.loadAsync(buffer, {
      createFolders: true,
      checkCRC32: false
    });
    buffer = null;
    assertActive(jobId);

    var rawEntries = Object.keys(zip.files || {}).map(function getEntry(key) {
      return zip.files[key];
    });
    var total = rawEntries.length;
    var explicit = [];
    var chunkSize = total > 100000 ? 1000 : total > 25000 ? 500 : total > 5000 ? 250 : 100;

    progress(38, "ZIP validado: " + total + " elementos detectados");

    for (var index = 0; index < total; index += 1) {
      explicit.push(mapEntry(rawEntries[index], index));

      if ((index + 1) % chunkSize === 0 || index + 1 === total) {
        assertActive(jobId);
        progress(38 + ((index + 1) / Math.max(total, 1)) * 42, "Organizando " + (index + 1) + " de " + total);
        await yieldControl();
      }
    }

    assertActive(jobId);
    progress(82, "Completando carpetas implícitas");
    var implicit = Model.buildImplicitFolders(explicit);
    var entries = Model.sortEntries(explicit.concat(implicit));
    var summary = Model.createSummary(entries, { name: file.name, size: file.size });

    var compressed = Number(summary.compressedSize) || 0;
    var uncompressed = Number(summary.totalSize) || 0;
    var ratio = compressed > 0 ? uncompressed / compressed : 0;
    var suspiciousCompression = ratio >= 500 && uncompressed >= 1024 * 1024 * 1024;
    var hugeExpandedSize = uncompressed >= 20 * 1024 * 1024 * 1024;
    var excessiveEntries = entries.length >= 250000;

    summary.compressionRatio = ratio;
    summary.suspiciousCompression = suspiciousCompression;
    summary.hugeExpandedSize = hugeExpandedSize;
    summary.excessiveEntries = excessiveEntries;
    summary.alerts = Number(summary.alerts || 0) +
      (suspiciousCompression ? 1 : 0) +
      (hugeExpandedSize ? 1 : 0) +
      (excessiveEntries ? 1 : 0);

    progress(90, "Preparando transferencia de resultados");

    var transferChunkSize = entries.length > 100000 ? 10000 : 5000;
    var totalChunks = Math.max(1, Math.ceil(entries.length / transferChunkSize));

    for (var offset = 0, chunkIndex = 0; offset < entries.length; offset += transferChunkSize, chunkIndex += 1) {
      assertActive(jobId);
      post("entries-chunk", {
        chunkIndex: chunkIndex,
        totalChunks: totalChunks,
        entries: entries.slice(offset, offset + transferChunkSize)
      });
      progress(90 + ((chunkIndex + 1) / totalChunks) * 9, "Transfiriendo resultados " + (chunkIndex + 1) + " de " + totalChunks);
      await yieldControl();
    }

    assertActive(jobId);
    post("done", {
      summary: summary,
      metadata: {
        zipName: file.name || "archivo.zip",
        zipSize: Number(file.size) || 0,
        lastModified: Number(file.lastModified) || null,
        explicitEntries: explicit.length,
        implicitFolders: implicit.length,
        totalEntries: entries.length,
        processedInWorker: true,
        scannedAt: summary.scannedAt
      }
    });
  }

  self.onmessage = function onWorkerMessage(event) {
    var message = event.data || {};

    if (message.type === "cancel") {
      if (!message.jobId || String(message.jobId) === activeJobId) activeJobId = "";
      return;
    }

    if (message.type !== "scan") return;

    processJob(message).catch(function handleWorkerError(error) {
      if (error && error.name === "ScanCancelledError") return;
      post("error", {
        name: error && error.name ? error.name : "ScanWorkerError",
        message: friendlyError(error)
      });
    });
  };
})(self);
