/* =========================================================
Nombre completo: lb.progress.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.progress.js
Función o funciones:
1. Controlar la barra de progreso de Gen libro.
2. Avanzar por etapas visibles durante la generación del Word.
3. Sincronizar el progreso visual con el estado central.
========================================================= */

(function attachLbProgress(window, document) {
  "use strict";

  var Constants = window.LibroGenLibroConstants || {};
  var State = window.LibroGenLibroState || null;
  var STEPS = Constants.PROGRESS_STEPS || [];

  function byId(id) {
    return document.getElementById(id);
  }

  function clampPercent(value) {
    return Math.max(0, Math.min(100, Number(value || 0)));
  }

  function findStep(stepId) {
    return STEPS.find(function findItem(item) {
      return item.id === stepId;
    }) || null;
  }

  function render(stepId, customLabel, customPercent) {
    var bar = byId("lb-progress-bar");
    var text = byId("lb-progress-text");
    var percentText = byId("lb-progress-percent");
    var step = findStep(stepId);
    var label = customLabel || (step ? step.label : "Esperando selección de materia");
    var percent = clampPercent(customPercent != null ? customPercent : (step ? step.percent : 0));

    if (bar) {
      bar.style.width = percent + "%";
      bar.setAttribute("aria-valuenow", String(percent));
    }

    if (text) text.textContent = label;
    if (percentText) percentText.textContent = percent + "%";

    if (State && typeof State.setProgress === "function") {
      State.setProgress(stepId || "idle", label, percent);
    }
  }

  function reset() {
    render("idle", "Esperando selección de materia", 0);
  }

  function complete() {
    render("download", "Libro generado correctamente", 100);
  }

  window.LibroGenLibroProgress = {
    render: render,
    reset: reset,
    complete: complete,
    steps: STEPS.slice()
  };
})(window, document);
