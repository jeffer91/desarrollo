/* =========================================================
Nombre completo: lb.progress-monitor.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.progress-monitor.js
Función o funciones:
1. Registrar cada etapa de progreso de la generación del libro.
2. Guardar historial simple para diagnóstico.
3. Detectar en qué fase quedó el proceso si ocurre un error.
========================================================= */

(function attachLbProgressMonitor(window) {
  "use strict";

  var history = [];
  var originalRender = null;
  var originalComplete = null;
  var originalReset = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function push(stepId, label, percent, status) {
    var item = {
      stepId: stepId || "idle",
      label: label || "",
      percent: Math.max(0, Math.min(100, Number(percent || 0))),
      status: status || "running",
      createdAt: new Date().toISOString()
    };

    history.push(item);
    history = history.slice(-80);

    try {
      window.localStorage.setItem("libro.genLibro.progressHistory", JSON.stringify(history));
    } catch (_error) {}

    return item;
  }

  function patchProgress() {
    var Progress = window.LibroGenLibroProgress;

    if (!Progress || Progress.__lbMonitorPatched) return;

    originalRender = Progress.render;
    originalComplete = Progress.complete;
    originalReset = Progress.reset;

    Progress.render = function monitoredRender(stepId, label, percent) {
      push(stepId, label, percent, "running");
      return originalRender.apply(Progress, arguments);
    };

    Progress.complete = function monitoredComplete() {
      push("download", "Libro generado correctamente", 100, "done");
      return originalComplete.apply(Progress, arguments);
    };

    Progress.reset = function monitoredReset() {
      push("idle", "Reinicio de progreso", 0, "reset");
      return originalReset.apply(Progress, arguments);
    };

    Progress.__lbMonitorPatched = true;
  }

  function getHistory() {
    return clone(history);
  }

  function getLastStep() {
    return history.length ? clone(history[history.length - 1]) : null;
  }

  function clear() {
    history = [];
    try {
      window.localStorage.removeItem("libro.genLibro.progressHistory");
    } catch (_error) {}
  }

  patchProgress();

  window.LibroGenLibroProgressMonitor = {
    push: push,
    getHistory: getHistory,
    getLastStep: getLastStep,
    clear: clear,
    patchProgress: patchProgress
  };
})(window);
