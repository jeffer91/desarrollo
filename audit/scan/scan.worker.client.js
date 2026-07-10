/* =========================================================
Nombre completo: scan.worker.client.js
Ruta o ubicación: /audit/scan/scan.worker.client.js
Función o funciones:
- Crear y controlar el Web Worker de SCAN desde la interfaz.
- Recibir progreso y resultados divididos en bloques.
- Transmitir límites de entradas y directorio central.
- Cancelar realmente el proceso terminando el worker activo.
- Evitar operaciones masivas de inserción sobre bloques grandes.
========================================================= */

(function attachScanWorkerClient(window) {
  "use strict";

  window.AuditScan = window.AuditScan || {};

  var active = null;
  var sequence = 0;
  var MAX_IDLE_MS = 15 * 60 * 1000;

  function supported() {
    return typeof window.Worker === "function";
  }

  function createError(message, name) {
    var error = new Error(message || "Error del proceso independiente de SCAN.");
    error.name = name || "ScanWorkerError";
    return error;
  }

  function cleanup(job) {
    if (!job) return;
    window.clearTimeout(job.idleTimer);

    if (job.worker) {
      job.worker.onmessage = null;
      job.worker.onerror = null;
      job.worker.onmessageerror = null;
      try {
        job.worker.terminate();
      } catch (error) {
        console.warn("No fue posible terminar el worker de SCAN.", error);
      }
    }

    if (active === job) active = null;
  }

  function refreshIdleTimer(job) {
    window.clearTimeout(job.idleTimer);
    job.idleTimer = window.setTimeout(function workerIdleTimeout() {
      if (active !== job) return;
      cleanup(job);
      job.reject(createError(
        "El proceso independiente dejó de responder durante demasiado tiempo.",
        "ScanWorkerTimeoutError"
      ));
    }, MAX_IDLE_MS);
  }

  function cancel() {
    if (!active) return false;

    var job = active;
    try {
      job.worker.postMessage({ type: "cancel", jobId: job.id });
    } catch (_error) {
      // La terminación posterior garantiza la cancelación.
    }

    cleanup(job);
    job.reject(createError("El escaneo fue cancelado.", "ScanCancelledError"));
    return true;
  }

  function appendChunk(target, chunk) {
    for (var index = 0; index < chunk.length; index += 1) {
      target.push(chunk[index]);
    }
  }

  function scan(file, options) {
    options = options || {};

    if (!supported()) {
      return Promise.reject(createError(
        "Este entorno no admite Web Workers.",
        "ScanWorkerUnsupportedError"
      ));
    }

    cancel();
    sequence += 1;

    return new Promise(function workerPromise(resolve, reject) {
      var worker;

      try {
        worker = new window.Worker("./scan.worker.js");
      } catch (error) {
        reject(createError(
          "No fue posible iniciar el proceso independiente de SCAN: " + (error.message || error),
          "ScanWorkerStartError"
        ));
        return;
      }

      var job = {
        id: "scan_worker_" + Date.now() + "_" + sequence,
        worker: worker,
        resolve: resolve,
        reject: reject,
        entries: [],
        idleTimer: null
      };
      active = job;
      refreshIdleTimer(job);

      worker.onmessage = function onWorkerMessage(event) {
        if (active !== job) return;
        refreshIdleTimer(job);

        var message = event.data || {};
        if (message.jobId && message.jobId !== job.id) return;

        if (message.type === "progress") {
          if (typeof options.onProgress === "function") {
            options.onProgress({
              value: Number(message.value) || 0,
              label: message.label || "Procesando en segundo plano"
            });
          }
          return;
        }

        if (message.type === "entries-chunk") {
          if (Array.isArray(message.entries)) appendChunk(job.entries, message.entries);
          return;
        }

        if (message.type === "done") {
          var result = {
            entries: job.entries,
            summary: message.summary || {},
            metadata: message.metadata || null
          };
          cleanup(job);
          resolve(result);
          return;
        }

        if (message.type === "error") {
          var workerError = createError(
            message.message || "El worker no pudo analizar el ZIP.",
            message.name || "ScanWorkerError"
          );
          cleanup(job);
          reject(workerError);
        }
      };

      worker.onerror = function onWorkerError(event) {
        var message = event && event.message
          ? event.message
          : "El proceso independiente de SCAN falló al iniciar o cargar sus dependencias.";
        cleanup(job);
        reject(createError(message, "ScanWorkerRuntimeError"));
      };

      worker.onmessageerror = function onWorkerMessageError() {
        cleanup(job);
        reject(createError(
          "No fue posible transferir los resultados desde el worker.",
          "ScanWorkerTransferError"
        ));
      };

      try {
        worker.postMessage({
          type: "scan",
          jobId: job.id,
          file: file,
          maxEntries: Number(options.maxEntries) || 1000000,
          maxCentralDirectoryBytes: Number(options.maxCentralDirectoryBytes) || 512 * 1024 * 1024
        });
      } catch (error) {
        cleanup(job);
        reject(createError(
          "No fue posible enviar el ZIP al proceso independiente: " + (error.message || error),
          "ScanWorkerTransferError"
        ));
      }
    });
  }

  function isRunning() {
    return Boolean(active);
  }

  window.AuditScan.WorkerClient = {
    scan: scan,
    cancel: cancel,
    isRunning: isRunning,
    isSupported: supported
  };
})(window);
