/* =========================================================
Nombre completo: scan.manifest.js
Ruta o ubicación: /audit/scan/scan.manifest.js
Función o funciones:
- Declarar que el módulo SCAN está instalado y disponible.
- Permitir que el menú de Audit compruebe SCAN sin importar su código interno.
- Exponer versión y capacidades del módulo autónomo.
========================================================= */

(function registerScanManifest(window) {
  "use strict";

  window.AUDIT_MODULES = window.AUDIT_MODULES || {};
  window.AUDIT_MODULES.scan = Object.freeze({
    id: "scan",
    name: "SCAN",
    version: "1.3.0",
    available: true,
    entry: "./scan.index.html",
    standalone: true,
    capabilities: Object.freeze([
      "offline",
      "zip-central-directory",
      "zip64",
      "path-list",
      "folder-list",
      "metadata",
      "web-worker",
      "streaming-read",
      "main-thread-fallback",
      "memory-guard",
      "progress",
      "cancel",
      "risk-detection"
    ])
  });
})(window);
