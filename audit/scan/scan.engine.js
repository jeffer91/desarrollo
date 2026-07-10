/* =========================================================
Nombre completo: scan.engine.js
Ruta o ubicación: /audit/scan/scan.engine.js
Función o funciones:
- Exponer el motor público de escaneo usado por scan.app.js.
- Usar Web Worker progresivo como modo principal.
- Usar el mismo lector progresivo en el hilo principal como respaldo.
- Coordinar progreso, cancelación y resultados.
- Evitar que resultados antiguos sobrescriban un escaneo nuevo.
========================================================= */

(function attachScanEngine(window) {
  "use strict";

  window.AuditScan = window.AuditScan || {};

  var activeJob = null;
  var sequence = 0;

  function createCancelledError() {
    var error = new Error("El escaneo fue cancelado.");
    error.name = "ScanCancelledError";
    return error;
  }

  function canFallback(error) {
    var name = String(error && error.name || "");
    return [
      "ScanWorkerUnsupportedError",
      "ScanWorkerStartError",
      "ScanWorkerRuntimeError",
      "ScanWorkerTimeoutError",
      "ScanWorkerTransferError"
    ].indexOf(name) >= 0;
  }

  function cancel() {
    if (!activeJob) return false;

    activeJob.cancelled = true;

    if (activeJob.mode === "worker") {
      var client = window.AuditScan.WorkerClient;
      if (client && typeof client.cancel === "function") client.cancel();
    }

    return true;
  }

  async function scanOnMainThread(file, options, job) {
    var reader = window.AuditScan.ZipReader;
    if (!reader || typeof reader.read !== "function") {
      throw new Error("El lector ZIP de respaldo no está disponible.");
    }

    job.mode = "main";

    if (typeof options.onProgress === "function") {
      options.onProgress({
        value: 1,
        label: "Worker no disponible; usando lectura progresiva compatible"
      });
    }

    var control = {
      isCancelled: function isCancelled() {
        return job.cancelled || activeJob !== job;
      }
    };

    var result = await reader.read(file, options, control);
    if (control.isCancelled()) throw createCancelledError();

    var currentMetadata = result.metadata || {};
    result.metadata = Object.assign({}, currentMetadata, {
      processedInWorker: false,
      processingMode: currentMetadata.processingMode || "main-thread-streaming-fallback"
    });

    return result;
  }

  async function scan(file, options) {
    options = options || {};
    cancel();

    sequence += 1;
    var job = {
      id: sequence,
      cancelled: false,
      mode: "preparing"
    };
    activeJob = job;

    try {
      var client = window.AuditScan.WorkerClient;
      var useWorker = client &&
        typeof client.scan === "function" &&
        typeof client.isSupported === "function" &&
        client.isSupported();

      if (useWorker) {
        job.mode = "worker";

        try {
          var workerResult = await client.scan(file, options);
          if (job.cancelled || activeJob !== job) throw createCancelledError();

          var workerMetadata = workerResult.metadata || {};
          workerResult.metadata = Object.assign({}, workerMetadata, {
            processedInWorker: true,
            processingMode: workerMetadata.processingMode || "web-worker-streaming"
          });
          return workerResult;
        } catch (workerError) {
          if (workerError && workerError.name === "ScanCancelledError") throw workerError;
          if (!canFallback(workerError)) throw workerError;
          if (job.cancelled || activeJob !== job) throw createCancelledError();

          return await scanOnMainThread(file, options, job);
        }
      }

      return await scanOnMainThread(file, options, job);
    } finally {
      if (activeJob === job) activeJob = null;
    }
  }

  function isRunning() {
    return Boolean(activeJob && !activeJob.cancelled);
  }

  function getMode() {
    return activeJob ? activeJob.mode : "idle";
  }

  window.AuditScan.Engine = {
    scan: scan,
    cancel: cancel,
    isRunning: isRunning,
    getMode: getMode
  };
})(window);
