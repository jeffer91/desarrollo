/* =========================================================
Nombre completo: scan.dom.js
Ruta o ubicación: /audit/scan/scan.dom.js
Función o funciones:
- Centralizar referencias DOM del módulo SCAN.
- Formatear tamaños, fechas y textos de forma segura.
- Renderizar resúmenes, estados, archivo seleccionado y tabla.
- Mostrar alertas de tamaño, compresión y rutas detectadas.
- Limitar filas visibles para evitar bloqueos con ZIP grandes.
- Mantener la lógica visual separada del controlador principal.
========================================================= */

(function attachScanDom(window, document) {
  "use strict";

  window.AuditScan = window.AuditScan || {};

  var MAX_RENDER_ROWS = 2000;

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

  function formatNumber(value) {
    try {
      return new Intl.NumberFormat("es-EC").format(Number(value) || 0);
    } catch (error) {
      return String(Number(value) || 0);
    }
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
    var progressTrack = $("scanProgressTrack");
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
    if (progressTrack) progressTrack.setAttribute("aria-valuenow", String(value));
  }

  function renderSummary(summary) {
    summary = summary || {};
    setText("scanSummaryFiles", formatNumber(summary.files || 0));
    setText("scanSummaryFolders", formatNumber(summary.folders || 0));
    setText("scanSummarySize", formatBytes(summary.totalSize || 0));
    setText("scanSummaryAlerts", formatNumber(summary.alerts || 0));

    var alertsValue = $("scanSummaryAlerts");
    if (alertsValue) {
      var details = [
        "Vacíos: " + formatNumber(summary.emptyFiles || 0),
        "Rutas inseguras: " + formatNumber(summary.unsafePaths || 0),
        "Rutas duplicadas: " + formatNumber(summary.duplicatePaths || 0)
      ];

      if (summary.suspiciousCompression) details.push("Compresión sospechosa");
      if (summary.hugeExpandedSize) details.push("Tamaño expandido muy alto");
      if (summary.excessiveEntries) details.push("Cantidad extrema de elementos");

      alertsValue.title = details.join(" · ");
    }
  }

  function getVisibleEntries(state) {
    var entries = Array.isArray(state.entries) ? state.entries : [];
    var search = text(state.filters && state.filters.search).toLowerCase();
    var type = text(state.filters && state.filters.type) || "all";

    return entries.filter(function filterEntry(entry) {
      var entryType = text(entry && entry.type) || "file";
      if (type !== "all" && entryType !== type) return false;

      if (!search) return true;

      return [entry.path, entry.originalPath, entry.name, entry.extension, entry.parent]
        .map(text)
        .join(" ")
        .toLowerCase()
        .indexOf(search) >= 0;
    });
  }

  function getEmptyMessage(state) {
    if (!state.file) return "Seleccione un ZIP para preparar el escaneo.";
    if (state.status === "running") return "SCAN está leyendo y organizando el contenido del ZIP.";
    if (state.status === "completed") return "El ZIP no contiene archivos ni carpetas visibles.";
    return "El archivo está preparado. Pulse Iniciar escaneo para analizarlo.";
  }

  function renderTable(state) {
    var body = $("scanResultsBody");
    var meta = $("scanResultsMeta");
    if (!body) return;

    var entries = getVisibleEntries(state);
    var renderedEntries = entries.slice(0, MAX_RENDER_ROWS);

    if (meta) {
      meta.textContent = entries.length > MAX_RENDER_ROWS
        ? formatNumber(renderedEntries.length) + " de " + formatNumber(entries.length) + " resultados"
        : formatNumber(entries.length) + " resultado" + (entries.length === 1 ? "" : "s");
      meta.title = entries.length > MAX_RENDER_ROWS
        ? "La tabla limita la vista para mantener el rendimiento. Todos los registros permanecen disponibles para exportación."
        : "";
    }

    if (!entries.length) {
      body.innerHTML = [
        '<tr class="scan-empty-row">',
        '<td colspan="7">',
        escapeHtml(getEmptyMessage(state)),
        "</td>",
        "</tr>"
      ].join("");
      return;
    }

    body.innerHTML = renderedEntries.map(function renderEntry(entry, index) {
      var flags = [];
      if (entry.unsafePath) flags.push("Ruta insegura normalizada");
      if (entry.empty) flags.push("Archivo vacío");
      if (entry.implicit) flags.push("Carpeta inferida");
      if (entry.encrypted) flags.push("Elemento cifrado");

      var rowClass = flags.length ? ' class="scan-result-row has-alert"' : ' class="scan-result-row"';
      var pathTitle = entry.originalPath && entry.originalPath !== entry.path
        ? "Original: " + entry.originalPath + " | Normalizada: " + entry.path
        : entry.path;

      return [
        "<tr" + rowClass + ' title="' + escapeHtml(flags.join(" · ")) + '">',
        "<td>" + (index + 1) + "</td>",
        '<td><span class="scan-type-pill is-' + escapeHtml(entry.type || "file") + '">' +
          escapeHtml(entry.type === "folder" ? "Carpeta" : "Archivo") + "</span></td>",
        '<td class="scan-path-cell" title="' + escapeHtml(pathTitle) + '">' + escapeHtml(entry.path) + "</td>",
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
    var blocked = Boolean(state.guard && state.guard.allowed === false);
    var hasResults = Array.isArray(state.entries) && state.entries.length > 0;
    var startButton = $("scanStartButton");

    setDisabled("scanStartButton", !hasFile || running || blocked);
    setDisabled("scanCancelButton", !running);
    setDisabled("scanClearButton", !hasFile && !hasResults);
    setDisabled("scanExportTxtButton", !hasResults || running);
    setDisabled("scanExportPdfButton", !hasResults || running);
    setDisabled("scanSaveBlButton", !hasResults || running);

    if (startButton) {
      startButton.title = blocked
        ? "Este ZIP fue bloqueado por la validación de tamaño y memoria."
        : "";
    }
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
