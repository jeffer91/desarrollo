/* =========================================================
Nombre completo: scan.zip.js
Ruta o ubicación: /audit/scan/scan.zip.js
Función o funciones:
- Exponer el lector ZIP compatible usado como respaldo.
- Delegar en el mismo lector progresivo utilizado por el Web Worker.
- Evitar dependencias externas y duplicación de lógica.
- Mantener progreso y cancelación en entornos sin Web Worker.
========================================================= */

(function attachScanZipReader(window) {
  "use strict";

  window.AuditScan = window.AuditScan || {};

  async function read(file, options, control) {
    var reader = window.AuditScan.ArchiveReader;

    if (!reader || typeof reader.read !== "function") {
      throw new Error("El lector ZIP progresivo de SCAN no está disponible.");
    }

    var result = await reader.read(file, Object.assign({
      maxEntries: 1000000,
      maxCentralDirectoryBytes: 512 * 1024 * 1024
    }, options || {}), control || {});

    result.metadata = Object.assign({}, result.metadata || {}, {
      processedInWorker: false,
      processingMode: "main-thread-streaming-fallback"
    });

    return result;
  }

  window.AuditScan.ZipReader = {
    read: read
  };
})(window);
