/* =========================================================
Nombre completo: scan.worker.js
Ruta o ubicación: /audit/scan/scan.worker.js
Función o funciones:
- Ejecutar el lector progresivo del ZIP fuera del hilo principal.
- Mantener la interfaz fluida sin cargar todo el archivo en memoria.
- Transferir resultados por bloques y liberar memoria progresivamente.
- Informar progreso, cancelaciones y errores normalizados.
========================================================= */

(function bootScanWorker(self) {
  "use strict";

  var activeJobId = "";
  var dependenciesLoaded = false;

  function post(type, payload, jobId) {
    self.postMessage(Object.assign({
      type: type,
      jobId: jobId || activeJobId
    }, payload || {}));
  }

  function progress(value, label, jobId) {
    post("progress", {
      value: Math.max(0, Math.min(100, Math.round(Number(value) || 0))),
      label: label || "Procesando"
    }, jobId);
  }

  function createCancelledError() {
    var error = new Error("El escaneo fue cancelado.");
    error.name = "ScanCancelledError";
    return error;
  }

  function assertActive(jobId) {
    if (!jobId || activeJobId !== jobId) throw createCancelledError();
  }

  function loadDependencies() {
    if (dependenciesLoaded) return;

    importScripts("./scan.model.js", "./scan.archive.js");

    if (!self.AuditScan || !self.AuditScan.Model || !self.AuditScan.ArchiveReader) {
      throw new Error("No se pudieron cargar las dependencias locales del worker de SCAN.");
    }

    dependenciesLoaded = true;
  }

  function friendlyError(error) {
    var name = String(error && error.name || "ScanWorkerError");
    var message = String(error && error.message ? error.message : error || "Error desconocido");

    if (name === "ScanCancelledError") return message;
    if (name === "ScanArchiveMultiDiskError") return "Los ZIP divididos en varios archivos o discos no son compatibles.";
    if (name === "ScanArchiveEntryLimitError") return message;
    if (name === "ScanArchiveDirectoryLimitError") return message;
    if (name === "ScanArchiveCorruptError") return message;
    if (name === "ScanArchiveRangeError") return message;

    return message;
  }

  async function yieldControl() {
    await new Promise(function resolveSoon(resolve) {
      self.setTimeout(resolve, 0);
    });
  }

  async function processJob(message) {
    activeJobId = String(message.jobId || "");
    var jobId = activeJobId;
    var file = message.file;

    loadDependencies();
    assertActive(jobId);

    var result = await self.AuditScan.ArchiveReader.read(file, {
      maxEntries: Number(message.maxEntries) || 1000000,
      maxCentralDirectoryBytes: Number(message.maxCentralDirectoryBytes) || 512 * 1024 * 1024,
      onProgress: function onArchiveProgress(update) {
        assertActive(jobId);
        progress((Number(update && update.value) || 0) * 0.9, update && update.label, jobId);
      }
    }, {
      isCancelled: function isCancelled() {
        return activeJobId !== jobId;
      }
    });

    assertActive(jobId);

    var entries = Array.isArray(result.entries) ? result.entries : [];
    var totalEntries = entries.length;
    var transferChunkSize = totalEntries > 100000 ? 10000 : 5000;
    var totalChunks = Math.max(1, Math.ceil(totalEntries / transferChunkSize));
    var chunkIndex = 0;

    while (entries.length) {
      assertActive(jobId);
      var chunk = entries.splice(0, transferChunkSize);

      post("entries-chunk", {
        chunkIndex: chunkIndex,
        totalChunks: totalChunks,
        entries: chunk
      }, jobId);

      chunkIndex += 1;
      progress(90 + (chunkIndex / totalChunks) * 9, "Transfiriendo resultados " + chunkIndex + " de " + totalChunks, jobId);
      await yieldControl();
    }

    assertActive(jobId);
    post("done", {
      summary: result.summary || {},
      metadata: Object.assign({}, result.metadata || {}, {
        processedInWorker: true,
        processingMode: "web-worker-streaming"
      })
    }, jobId);
  }

  self.onmessage = function onWorkerMessage(event) {
    var message = event.data || {};

    if (message.type === "cancel") {
      if (!message.jobId || String(message.jobId) === activeJobId) activeJobId = "";
      return;
    }

    if (message.type !== "scan") return;

    processJob(message).catch(function handleWorkerError(error) {
      var jobId = String(message.jobId || "");
      if (error && error.name === "ScanCancelledError") return;

      post("error", {
        name: error && error.name ? error.name : "ScanWorkerError",
        message: friendlyError(error)
      }, jobId);
    });
  };
})(self);
