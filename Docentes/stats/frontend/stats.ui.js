/*
Nombre del archivo: stats.ui.js
Ruta: stats/frontend/stats.ui.js
Función:
- Orquesta el render principal de la aplicación
- Muestra loading, errores y estado general
- Conecta botones de recarga, limpieza y exportación
*/
(function attachStatsUi(window, document) {
  "use strict";

  window.STATS = window.STATS || {};

  var actionsBound = false;
  var autoStarted = false;

  function getElement(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDate(value) {
    var text = value == null ? "" : String(value).trim();
    var parts;

    if (!text) return "—";

    parts = text.split("-");
    if (parts.length !== 3) {
      return text;
    }

    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }

  function buildInfoMessage(state) {
    var derived = state && state.derived ? state.derived : {};
    var metrics = derived && derived.metrics ? derived.metrics : {};

    return [
      '<div class="stats-message stats-message-info">',
      "Docentes únicos: <strong>", escapeHtml(metrics.docentesUnicosConCapacitacion || 0), "</strong> · ",
      "Capacitaciones visibles: <strong>", escapeHtml(metrics.capacitacionesAsignadasUnicas || 0), "</strong> · ",
      "Asignaciones visibles: <strong>", escapeHtml(metrics.asignacionesTotales || 0), "</strong> · ",
      "Horas visibles: <strong>", escapeHtml(metrics.horasTotales || 0), "</strong>",
      "</div>"
    ].join("");
  }

  function renderMessages(state) {
    var host = getElement("statsMessageHost");

    if (!host) return;

    if (state && state.loading) {
      host.innerHTML = '<div class="stats-message stats-message-info">Cargando datos y recalculando la vista activa...</div>';
      return;
    }

    if (state && state.error) {
      host.innerHTML = '<div class="stats-message stats-message-danger">' + escapeHtml(state.error) + "</div>";
      return;
    }

    host.innerHTML = buildInfoMessage(state || {});
  }

  function renderFilters(state) {
    var Filters = window.STATS.Filters;

    if (Filters && typeof Filters.render === "function") {
      Filters.render(state);
    }
  }

  function renderDistribution(state) {
    var Distribution = window.STATS.Distribution;

    if (Distribution && typeof Distribution.render === "function") {
      Distribution.render(state);
    }
  }

  function renderDetail(state) {
    var Detail = window.STATS.Detail;

    if (Detail && typeof Detail.render === "function") {
      Detail.render(state);
    }
  }

  function bindReloadButton() {
    var button = getElement("statsReloadBtn");

    if (!button) return;

    button.addEventListener("click", function onReloadClick() {
      if (window.STATS.App && typeof window.STATS.App.reload === "function") {
        window.STATS.App.reload();
      }
    });
  }

  function bindResetFiltersButton() {
    var button = getElement("statsResetFiltersBtn");

    if (!button) return;

    button.addEventListener("click", function onResetFiltersClick() {
      if (window.STATS.Store && typeof window.STATS.Store.resetFilters === "function") {
        window.STATS.Store.resetFilters();
      }

      if (window.STATS.App && typeof window.STATS.App.refreshDerived === "function") {
        window.STATS.App.refreshDerived();
      }
    });
  }

  function bindExportButton() {
    var Export = window.STATS.Export;

    if (Export && typeof Export.bindExportButton === "function") {
      Export.bindExportButton("statsExportBtn");
    }
  }

  function bindActions() {
    if (actionsBound) return;
    actionsBound = true;

    bindReloadButton();
    bindResetFiltersButton();
    bindExportButton();
  }

  function renderApp(state) {
    bindActions();
    renderMessages(state || {});
    renderFilters(state || {});
    renderDistribution(state || {});
    renderDetail(state || {});

    if (window.STATS.Modal && typeof window.STATS.Modal.ensureRoot === "function") {
      window.STATS.Modal.ensureRoot();
    }
  }

  function startApp() {
    if (autoStarted) return;
    autoStarted = true;

    if (window.STATS.App && typeof window.STATS.App.start === "function") {
      window.STATS.App.start();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApp, { once: true });
  } else {
    setTimeout(startApp, 0);
  }

  window.STATS.UI = {
    getElement: getElement,
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    renderApp: renderApp
  };
})(window, document);