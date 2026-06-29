/* =========================================================
Nombre completo: lb.ui.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.ui.js
Función o funciones:
1. Controlar elementos visuales básicos de Gen libro.
2. Renderizar mensajes simples para el usuario.
3. Habilitar o bloquear botones según estado.
4. Mantener la pantalla limpia y sin datos técnicos visibles.
========================================================= */

(function attachLbUi(window, document) {
  "use strict";

  function byId(id) {
    return document.getElementById(id);
  }

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function setMessage(type, message) {
    var element = byId("lb-message");
    if (!element) return;

    element.classList.remove("is-pending", "is-ok", "is-warning", "is-error");
    element.classList.add(type || "is-pending");
    element.textContent = message || "Selecciona una carrera y una materia para generar el libro.";
  }

  function setStatus(text) {
    var element = byId("lb-status");
    if (!element) return;
    element.textContent = text || "Sin materia";
  }

  function fillSelect(selectId, items, placeholder, getValue, getLabel) {
    var select = byId(selectId);
    if (!select) return;

    select.innerHTML = "";

    var option = document.createElement("option");
    option.value = "";
    option.textContent = placeholder || "Seleccionar";
    select.appendChild(option);

    (items || []).forEach(function eachItem(item) {
      var itemOption = document.createElement("option");
      itemOption.value = getValue ? getValue(item) : String(item || "");
      itemOption.textContent = getLabel ? getLabel(item) : String(item || "");
      select.appendChild(itemOption);
    });
  }

  function setGenerateEnabled(enabled) {
    var button = byId("lb-generate-btn");
    if (!button) return;
    button.disabled = !enabled;
  }

  function getSelectedCarrera() {
    var select = byId("lb-carrera-select");
    return clean(select ? select.value : "");
  }

  function getSelectedMateria() {
    var select = byId("lb-materia-select");
    return clean(select ? select.value : "");
  }

  function renderInitial() {
    setMessage("is-pending", "Selecciona una carrera y una materia para generar el libro.");
    setStatus("Sin materia");
    setGenerateEnabled(false);
  }

  window.LibroGenLibroUI = {
    byId: byId,
    setMessage: setMessage,
    setStatus: setStatus,
    fillSelect: fillSelect,
    setGenerateEnabled: setGenerateEnabled,
    getSelectedCarrera: getSelectedCarrera,
    getSelectedMateria: getSelectedMateria,
    renderInitial: renderInitial
  };
})(window, document);
