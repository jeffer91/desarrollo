/*
=========================================================
Nombre completo: coordi.dom.js
Ruta o ubicación: /Docentes/coordi/coordi.dom.js
Función o funciones:
- Centralizar la lectura de elementos del DOM.
- Evitar repetir document.getElementById en varios archivos.
- Exponer métodos para mostrar estados, contadores y errores.
Con qué se une:
- coordi.index.html
- coordi.app.js
- coordi.table.js
=========================================================
*/

(function () {
  "use strict";

  function byId(id) {
    return document.getElementById(id);
  }

  function getElements() {
    return {
      tableBody: byId("coordiTableBody"),
      search: byId("coordiSearch"),
      status: byId("coordiStatus"),
      rowCounter: byId("rowCounter"),
      saveStatus: byId("saveStatus"),
      errorPanel: byId("errorPanel"),
      btnRestoreSeed: byId("btnRestoreSeed"),
      btnImport: byId("btnImport"),
      btnExport: byId("btnExport"),
      btnSave: byId("btnSave"),
      btnAddRow: byId("btnAddRow"),
      btnValidate: byId("btnValidate"),
      importFile: byId("coordiImportFile")
    };
  }

  function setRowCounter(total, visible) {
    const elements = getElements();

    if (!elements.rowCounter) {
      return;
    }

    if (typeof visible === "number" && visible !== total) {
      elements.rowCounter.textContent = `${visible} visibles de ${total} registros`;
      return;
    }

    elements.rowCounter.textContent = `${total} registros`;
  }

  function setSaveStatus(message, type = "neutral") {
    const elements = getElements();

    if (!elements.saveStatus) {
      return;
    }

    elements.saveStatus.textContent = message;
    elements.saveStatus.dataset.type = type;
  }

  function showErrors(errors) {
    const elements = getElements();

    if (!elements.errorPanel) {
      return;
    }

    if (!Array.isArray(errors) || errors.length === 0) {
      elements.errorPanel.classList.add("hidden");
      elements.errorPanel.innerHTML = "";
      return;
    }

    const list = errors
      .map((error) => `<li>${escapeHtml(error.message || error)}</li>`)
      .join("");

    elements.errorPanel.innerHTML = `
      <strong>Se encontraron observaciones:</strong>
      <ul>${list}</ul>
    `;

    elements.errorPanel.classList.remove("hidden");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  window.CoordiDOM = {
    byId,
    getElements,
    setRowCounter,
    setSaveStatus,
    showErrors,
    escapeHtml
  };
})();