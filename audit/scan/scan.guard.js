/* =========================================================
Nombre completo: scan.guard.js
Ruta o ubicación: /audit/scan/scan.guard.js
Función o funciones:
- Evaluar riesgos básicos antes de escanear un ZIP.
- Adaptar límites de entradas y directorio central a la memoria reportada.
- Permitir ZIP grandes porque se leen progresivamente.
- Evitar cantidades de registros que puedan cerrar la interfaz.
- Rechazar archivos vacíos o fuera del rango práctico del navegador.
========================================================= */

(function attachScanGuard(window) {
  "use strict";

  window.AuditScan = window.AuditScan || {};

  var MB = 1024 * 1024;
  var GB = 1024 * MB;
  var RECOMMENDED_BYTES = 8 * GB;
  var HARD_LIMIT_BYTES = 128 * GB;

  function getDeviceMemoryGb() {
    var value = Number(window.navigator && window.navigator.deviceMemory);
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  function getLimits(memoryGb) {
    var memory = Number(memoryGb) || 4;

    if (memory <= 2) {
      return { maxEntries: 100000, maxCentralDirectoryBytes: 64 * MB };
    }

    if (memory <= 4) {
      return { maxEntries: 180000, maxCentralDirectoryBytes: 128 * MB };
    }

    if (memory <= 8) {
      return { maxEntries: 300000, maxCentralDirectoryBytes: 256 * MB };
    }

    return { maxEntries: 500000, maxCentralDirectoryBytes: 384 * MB };
  }

  function evaluate(file) {
    var size = Number(file && file.size) || 0;
    var memoryGb = getDeviceMemoryGb();
    var limits = getLimits(memoryGb);
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
      maxEntries: limits.maxEntries,
      maxCentralDirectoryBytes: limits.maxCentralDirectoryBytes,
      streamingReader: true,
      risk: errors.length ? "blocked" : warnings.length ? "high" : "normal"
    };
  }

  window.AuditScan.Guard = {
    evaluate: evaluate,
    getLimits: getLimits
  };
})(window);
