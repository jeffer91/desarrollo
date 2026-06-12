/*
=========================================================
Nombre completo: distribucion.dom.js
Ruta o ubicación: /incorporaciones/sedes/distribucion/distribucion.dom.js
Función o funciones:
- Centralizar elementos HTML de la pantalla Distribución.
- Evitar repetir selectores en varios archivos.
- Proveer utilidades para texto seguro, estados y mensajes.
Con qué se une:
- distribucion.index.html
- distribucion.app.js
- distribucion.board.js
- distribucion.table.js
- distribucion.alerts.js
=========================================================
*/

(function () {
  "use strict";

  function byId(id) {
    return document.getElementById(id);
  }

  function getElements() {
    return {
      periodSelect: byId("periodSelect"),
      btnLoadPeriod: byId("btnLoadPeriod"),
      journeyDate: byId("journeyDate"),
      journeyTime: byId("journeyTime"),
      btnAddJourney: byId("btnAddJourney"),
      journeyList: byId("journeyList"),
      btnAutoDistribute: byId("btnAutoDistribute"),
      btnRedistribute: byId("btnRedistribute"),
      approvedList: byId("approvedList"),
      distAlerts: byId("distAlerts"),
      distStatus: byId("distStatus"),
      distBalance: byId("distBalance"),
      distributionBoard: byId("distributionBoard"),
      summaryTableBody: byId("summaryTableBody"),
      btnSaveDraft: byId("btnSaveDraft"),
      btnFinalize: byId("btnFinalize"),
      btnExportDistribution: byId("btnExportDistribution")
    };
  }

  function setStatus(message) {
    const elements = getElements();

    if (elements.distStatus) {
      elements.distStatus.textContent = message;
    }
  }

  function setBalance(message) {
    const elements = getElements();

    if (elements.distBalance) {
      elements.distBalance.textContent = message;
    }
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function clearElement(element) {
    if (element) {
      element.innerHTML = "";
    }
  }

  function option(value, label, selectedValue) {
    const selected = String(value) === String(selectedValue) ? "selected" : "";

    return `<option value="${escapeHtml(value)}" ${selected}>${escapeHtml(label)}</option>`;
  }

  window.DistribucionDOM = {
    byId,
    getElements,
    setStatus,
    setBalance,
    escapeHtml,
    clearElement,
    option
  };
})();