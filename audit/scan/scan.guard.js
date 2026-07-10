/* =========================================================
Nombre completo: scan.guard.js
Ruta o ubicación: /audit/scan/scan.guard.js
Función o funciones:
- Evaluar tamaño, memoria estimada y riesgos antes de escanear un ZIP.
- Emitir advertencias para archivos grandes sin bloquear casos normales.
- Rechazar archivos vacíos o excesivamente grandes para el entorno actual.
- Mantener la validación separada del motor y de la interfaz.
========================================================= */

(function attachScanGuard(window) {
  "use strict";

  window.AuditScan = window.AuditScan || {};

  var MB = 1024 * 1024;
  var GB = 1024 * MB;

  function getDeviceMemoryGb() {
    var value = Number(window.navigator && window.navigator.deviceMemory);
    return Number.isFinite(value) && value > 0 ? value : 4;
  }

  function evaluate(file) {
    var size = Number(file && file.size) || 0;
    var memoryGb = getDeviceMemoryGb();
    var recommended = Math.min(4 * GB, Math.max(512 * MB, memoryGb * 256 * MB));
    var hardLimit = Math.min(8 * GB, Math.max(2 * GB, recommended * 2));
    var warnings = [];
    var errors = [];

    if (!file) {
      errors.push("No se recibió un archivo ZIP válido.");
    }

    if (file && size === 0) {
      errors.push("El archivo ZIP está vacío.");
    }

    if (size > recommended) {
      warnings.push("El ZIP supera el tamaño recomendado para este equipo y puede consumir bastante memoria.");
    }

    if (size > hardLimit) {
      errors.push("El ZIP supera el límite seguro estimado para este equipo.");
    }

    if (memoryGb <= 4 && size > 1024 * MB) {
      warnings.push("El equipo reporta poca memoria disponible para un ZIP mayor a 1 GB.");
    }

    return {
      allowed: errors.length === 0,
      errors: errors,
      warnings: warnings,
      size: size,
      deviceMemoryGb: memoryGb,
      recommendedBytes: recommended,
      hardLimitBytes: hardLimit,
      risk: errors.length ? "blocked" : warnings.length ? "high" : "normal"
    };
  }

  window.AuditScan.Guard = {
    evaluate: evaluate
  };
})(window);
