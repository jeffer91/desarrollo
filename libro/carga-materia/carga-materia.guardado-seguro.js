/* =========================================================
Nombre completo: carga-materia.guardado-seguro.js
Ruta o ubicación: /desarrollo/libro/carga-materia/carga-materia.guardado-seguro.js
Función o funciones:
1. Reforzar el botón Guardar desde la interfaz.
2. Evitar guardar cuando la materia esté incompleta o con error.
3. Bloquear el guardado aunque otro controlador reactive el botón por accidente.
4. Revisar también la validación interna expuesta por LibroCargaMateria.
5. Mantener el flujo visual limpio y simple.
========================================================= */

(function iniciarGuardadoSeguro(window, document) {
  "use strict";

  var intervalId = null;

  function byId(id) {
    return document.getElementById(id);
  }

  function text(value) {
    return String(value == null ? "" : value).trim().toLowerCase();
  }

  function setStatus(element, type, value) {
    if (!element) return;

    element.classList.remove("is-pending", "is-ok", "is-warning", "is-error");
    element.classList.add(type || "is-pending");
    element.textContent = value || "Sin procesar";
  }

  function setUserMessage(type, value) {
    var message = byId("user-message");
    if (!message) return;

    message.classList.remove("is-pending", "is-ok", "is-warning", "is-error");
    message.classList.add(type || "is-pending");
    message.textContent = value || "Completa la información para procesar la materia.";
  }

  function getCargaState() {
    if (!window.LibroCargaMateria || typeof window.LibroCargaMateria.getState !== "function") {
      return null;
    }

    try {
      return window.LibroCargaMateria.getState();
    } catch (error) {
      return null;
    }
  }

  function hasValidationErrors() {
    var state = getCargaState();
    var errors = state && state.validacion && Array.isArray(state.validacion.errores)
      ? state.validacion.errores
      : [];

    return errors.length > 0;
  }

  function hasProcessedMateria() {
    var state = getCargaState();
    return Boolean(state && state.expediente && state.materiaConsolidada && state.validacion);
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

  function shouldBlockSave() {
    var status = byId("expediente-status");

    return !hasProcessedMateria() ||
      hasValidationErrors() ||
      isUnsafeStatus(status ? status.textContent : "");
  }

  function applySafeState() {
    var saveButton = byId("guardar-btn");
    if (!saveButton) return;

    if (shouldBlockSave()) {
      saveButton.disabled = true;
    }
  }

  function blockClickIfUnsafe(event) {
    if (!shouldBlockSave()) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    setStatus(byId("expediente-status"), "is-warning", "Sin guardar");
    setUserMessage("is-warning", "Primero procesa la materia sin errores para poder guardar.");
    applySafeState();
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

  function bindSaveGuard() {
    var saveButton = byId("guardar-btn");
    if (!saveButton) return;

    saveButton.addEventListener("click", blockClickIfUnsafe, true);
  }

  function startSafetyLoop() {
    if (intervalId) return;
    intervalId = window.setInterval(applySafeState, 600);
  }

  function boot() {
    bindSaveGuard();
    observeStatus();
    applySafeState();
    startSafetyLoop();
  }

  document.addEventListener("DOMContentLoaded", boot);
})(window, document);
