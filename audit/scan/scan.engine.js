/* =========================================================
Nombre completo: scan.engine.js
Ruta o ubicación: /audit/scan/scan.engine.js
Función o funciones:
- Exponer el motor público de escaneo usado por scan.app.js.
- Coordinar lectura ZIP, progreso, cancelación y resultados.
- Evitar que resultados antiguos sobrescriban un escaneo nuevo.
- Mantener la implementación independiente de Audit Menu y BL.
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

  function cancel() {
    if (!activeJob) return false;
    activeJob.cancelled = true;
    return true;
  }

  async function scan(file, options) {
    var reader = window.AuditScan.ZipReader;
    if (!reader || typeof reader.read !== "function") {
      throw new Error("El lector ZIP de SCAN no está disponible.");
    }

    cancel();

    sequence += 1;
    var job = {
      id: sequence,
      cancelled: false
    };
    activeJob = job;

    var control = {
      isCancelled: function isCancelled() {
        return job.cancelled || activeJob !== job;
      }
    };

    try {
      var result = await reader.read(file, options || {}, control);

      if (control.isCancelled()) {
        throw createCancelledError();
      }

      return result;
    } finally {
      if (activeJob === job) activeJob = null;
    }
  }

  function isRunning() {
    return Boolean(activeJob && !activeJob.cancelled);
  }

  window.AuditScan.Engine = {
    scan: scan,
    cancel: cancel,
    isRunning: isRunning
  };
})(window);
