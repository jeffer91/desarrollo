/* =========================================================
Nombre completo: scan.guard.js
Ruta o ubicación: /audit/scan/scan.guard.js
Función o funciones:
- Evaluar riesgos básicos antes de escanear un ZIP.
- Adaptar los límites al lector progresivo del directorio central.
- Advertir sobre archivos extremadamente grandes sin usar límites falsos de RAM.
- Rechazar archivos vacíos o fuera del rango práctico del navegador.
========================================================= */

(function attachScanGuard(window) {
  "use strict";

  window.AuditScan = window.AuditScan || {};

  var GB = 1024 * 1024 * 1024;
  var RECOMMENDED_BYTES = 8 * GB;
  var HARD_LIMIT_BYTES = 128 * GB;

  function getDeviceMemoryGb() {
    var value = Number(window.navigator && window.navigator.deviceMemory);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  function evaluate(file) {
    var size = Number(file && file.size) || 0;
    var memoryGb = getDeviceMemoryGb();
    var warnings = [];
    var errors = [];

    if (!file) {
      errors.push("No se recibió un archivo ZIP válido.");
    }

    if (file && size === 0) {
      errors.push("El archivo ZIP está vacío.");
    }

    if (size > RECOMMENDED_BYTES) {
      warnings.push("El ZIP es muy grande. SCAN leerá únicamente su directorio central y no descomprimirá los archivos.");
    }

    if (size > HARD_LIMIT_BYTES) {
      errors.push("El ZIP supera el límite práctico de 128 GB admitido por esta versión de SCAN.");
    }

    if (memoryGb && memoryGb <= 4 && size > 32 * GB) {
      warnings.push("El equipo reporta poca memoria; la organización final de una cantidad muy alta de rutas podría tardar.");
    }

    return {
      allowed: errors.length === 0,
      errors: errors,
      warnings: warnings,
      size: size,
      deviceMemoryGb: memoryGb,
      recommendedBytes: RECOMMENDED_BYTES,
      hardLimitBytes: HARD_LIMIT_BYTES,
      streamingReader: true,
      risk: errors.length ? "blocked" : warnings.length ? "high" : "normal"
    };
  }

  window.AuditScan.Guard = {
    evaluate: evaluate
  };
})(window);
