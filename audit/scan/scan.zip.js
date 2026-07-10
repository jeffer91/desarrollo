/* =========================================================
Nombre completo: scan.zip.js
Ruta o ubicación: /audit/scan/scan.zip.js
Función o funciones:
- Exponer el lector ZIP compatible usado como respaldo.
- Delegar en el mismo lector progresivo utilizado por el Web Worker.
- Aplicar límites seguros aunque el llamador solicite valores mayores.
- Evitar dependencias externas y duplicación de lógica.
- Mantener progreso y cancelación en entornos sin Web Worker.
========================================================= */

(function attachScanZipReader(window) {
  "use strict";

  window.AuditScan = window.AuditScan || {};

  function getSafeLimits(options) {
    var client = window.AuditScan.WorkerClient;
    if (client && typeof client.getSafeLimits === "function") {
      return client.getSafeLimits(options || {});
    }

    var guard = window.AuditScan.Guard;
    var memory = Number(window.navigator && window.navigator.deviceMemory) || null;
    var calculated = guard && typeof guard.getLimits === "function"
      ? guard.getLimits(memory)
      : { maxEntries: 180000, maxCentralDirectoryBytes: 128 * 1024 * 1024 };

    return {
      maxEntries: calculated.maxEntries,
      maxCentralDirectoryBytes: calculated.maxCentralDirectoryBytes
    };
  }

  async function read(file, options, control) {
    var reader = window.AuditScan.ArchiveReader;

    if (!reader || typeof reader.read !== "function") {
      throw new Error("El lector ZIP progresivo de SCAN no está disponible.");
    }

    var limits = getSafeLimits(options);
    var result = await reader.read(file, Object.assign({}, options || {}, limits), control || {});

    result.metadata = Object.assign({}, result.metadata || {}, {
      processedInWorker: false,
      processingMode: "main-thread-streaming-fallback",
      appliedLimits: limits
    });

    return result;
  }

  window.AuditScan.ZipReader = {
    read: read
  };
})(window);
