/* =========================================================
Nombre completo: carga-materia.guardado-seguro.js
Ruta o ubicación: /desarrollo/libro/carga-materia/carga-materia.guardado-seguro.js
Función o funciones:
1. Reforzar el botón Guardar desde la interfaz.
2. Evitar guardar cuando la materia esté incompleta o con error.
3. No habilitar el botón por su cuenta; solo bloquear estados inseguros.
4. Mantener el flujo visual limpio y simple.
========================================================= */

(function iniciarGuardadoSeguro(window, document) {
  "use strict";

  function byId(id) {
    return document.getElementById(id);
  }

  function text(value) {
    return String(value == null ? "" : value).trim().toLowerCase();
  }

  function isUnsafeStatus(value) {
    var status = text(value);

    return !status ||
      status.indexOf("sin procesar") >= 0 ||
      status.indexOf("procesando") >= 0 ||
      status.indexOf("guardando") >= 0 ||
      status.indexOf("incompleto") >= 0 ||
      status.indexOf("error") >= 0 ||
      status.indexOf("sin guardar") >= 0;
  }

  function applySafeState() {
    var saveButton = byId("guardar-btn");
    var status = byId("expediente-status");

    if (!saveButton || !status) return;

    if (isUnsafeStatus(status.textContent)) {
      saveButton.disabled = true;
    }
  }

  function observeStatus() {
    var status = byId("expediente-status");
    if (!status || typeof MutationObserver === "undefined") return;

    var observer = new MutationObserver(applySafeState);
    observer.observe(status, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"]
    });
  }

  function boot() {
    observeStatus();
    applySafeState();
  }

  document.addEventListener("DOMContentLoaded", boot);
})(window, document);
