/* =========================================================
Nombre completo: scan.dom.js
Ruta o ubicación: /audit/scan/scan.dom.js
Función o funciones:
- Centralizar referencias DOM del módulo SCAN.
- Formatear tamaños, fechas y textos de forma segura.
- Renderizar resúmenes, estados, archivo seleccionado y tabla.
- Mantener la lógica visual separada del controlador principal.
========================================================= */

(function attachScanDom(window, document) {
  "use strict";

  window.AuditScan = window.AuditScan || {};

  function $(id) {
    return document.getElementById(id);
  }

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function escapeHtml(value) {
    return text(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatBytes(bytes) {
    var value = Number(bytes) || 0;
    if (value <= 0) return "0 B";

    var units = ["B", "KB", "MB", "GB", "TB"];
    var index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    var amount = value / Math.pow(1024, index);
    var decimals = index === 0 || amount >= 100 ? 0 : amount >= 10 ? 1 : 2;

    return amount.toFixed(decimals) + " " + units[index];
  }

  function formatDate(timestamp) {
    if (!timestamp) return "Sin fecha";

    try {
      return new Intl.DateTimeFormat("es-EC", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(timestamp));
    } catch (error) {
      return new Date(timestamp).toLocaleString();
    }
  }

  function setText(id, value) {
    var element = $(id);
    if (element) element.textContent = text(value);
  }

  function setDisabled(id, disabled) {
    var element = $(id);
    if (element) element.disabled = Boolean(disabled);
  }

  function renderFile(file) {
    var empty = $("scanFileEmpty");
    var card = $("scanFileCard");

    if (!file) {
      if (empty) empty.hidden = false;
      if (card) card.hidden = true;
      return;
    }

    if (empty) empty.hidden = true;
    if (card) card.hidden = false;

    setText("scanFileName", file.name || "Archivo ZIP");
    setText("scanFileSize", formatBytes(file.size));
    setText("scanFileModified", formatDate(file.lastModified));
    setText("scanFileType", file.type || "application/zip");
  }

  function renderStatus(state) {
    var status = $("scanStatus");
    var statusText = $("scanStatusText");
    var progress = $("scanProgress");
    var progressBar = $("scanProgressBar");
    var progressValue = $("scanProgressValue");
    var progressLabel = $("scanProgressLabel");

    if (status) {
      status.className = "scan-status is-" + (state.status || "idle");
    }

    if (statusText) statusText.textContent = state.statusMessage || "";
    if (progress) progress.hidden = state.status === "idle" && !state.file;

    var value = Math.max(0, Math.min(100, Number(state.progress) || 0));
    if (progressBar) progressBar.style.width = value + "%";
    if (progressValue) progressValue.textContent = value + "%";
    if (progressLabel) progressLabel.textContent = state.progressLabel || "Sin iniciar";
  }

  function renderSummary(summary) {
    summary = summary || {};
    setText("scanSummaryFiles", summary.files || 0);
    setText("scanSummaryFolders", summary.folders || 0);
    setText("scanSummarySize", formatBytes(summary.totalSize || 0));
    setText("scanSummaryAlerts", summary.alerts || 0);
  }

  function getVisibleEntries(state) {
    var entries = Array.isArray(state.entries) ? state.entries : [];
    var search = text(state.filters && state.filters.search).toLowerCase();
    var type = text(state.filters && state.filters.type) || "all";

    return entries.filter(function filterEntry(entry) {
      var entryType = text(entry && entry.type) || "file";
      if (type !== "all" && entryType !== type) return false;

      if (!search) return true;

      return [entry.path, entry.name, entry.extension, entry.parent]
        .map(text)
        .join(" ")
        .toLowerCase()
        .indexOf(search) >= 0;
    });
  }

  function renderTable(state) {
    var body = $("scanResultsBody");
    var meta = $("scanResultsMeta");
    if (!body) return;

    var entries = getVisibleEntries(state);
    if (meta) meta.textContent = entries.length + " resultado" + (entries.length === 1 ? "" : "s");

    if (!entries.length) {
      body.innerHTML = [
        '<tr class="scan-empty-row">',
        '<td colspan="7">',
        state.file
          ? "El archivo está preparado. El contenido aparecerá cuando se ejecute el motor de escaneo."
          : "Seleccione un ZIP para preparar el escaneo.",
        "</td>",
        "</tr>"
      ].join("");
      return;
    }

    body.innerHTML = entries.map(function renderEntry(entry, index) {
      return [
        "<tr>",
        "<td>" + (index + 1) + "</td>",
        '<td><span class="scan-type-pill is-' + escapeHtml(entry.type || "file") + '">' +
          escapeHtml(entry.type === "folder" ? "Carpeta" : "Archivo") + "</span></td>",
        '<td class="scan-path-cell" title="' + escapeHtml(entry.path) + '">' + escapeHtml(entry.path) + "</td>",
        "<td>" + escapeHtml(entry.name) + "</td>",
        "<td>" + escapeHtml(entry.extension || "-") + "</td>",
        "<td>" + escapeHtml(formatBytes(entry.size || 0)) + "</td>",
        "<td>" + escapeHtml(entry.depth == null ? "-" : entry.depth) + "</td>",
        "</tr>"
      ].join("");
    }).join("");
  }

  function renderActions(state) {
    var hasFile = Boolean(state.file);
    var running = state.status === "running";
    var hasResults = Array.isArray(state.entries) && state.entries.length > 0;

    setDisabled("scanStartButton", !hasFile || running);
    setDisabled("scanCancelButton", !running);
    setDisabled("scanClearButton", !hasFile && !hasResults);
    setDisabled("scanExportTxtButton", !hasResults);
    setDisabled("scanExportPdfButton", !hasResults);
    setDisabled("scanSaveBlButton", !hasResults);
  }

  function renderError(message) {
    var alert = $("scanAlert");
    if (!alert) return;

    var value = text(message);
    alert.hidden = !value;
    alert.textContent = value;
  }

  function render(state) {
    renderFile(state.file);
    renderStatus(state);
    renderSummary(state.summary);
    renderTable(state);
    renderActions(state);
    renderError(state.error);
  }

  window.AuditScan.Dom = {
    $: $,
    text: text,
    formatBytes: formatBytes,
    formatDate: formatDate,
    render: render
  };
})(window, document);
