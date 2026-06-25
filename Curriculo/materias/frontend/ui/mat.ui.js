/*
Nombre del archivo: mat.ui.js
Ubicación: /Curriculo/materias/frontend/ui/mat.ui.js
Función:
- Centralizar utilidades de interfaz
- Manejar status, preview, resumen y botón guardar
- Refrescar estado de guardado local y sincronización
*/

(function (window, document) {
  "use strict";

  window.MAT = window.MAT || {};
  var MAT = window.MAT;

  MAT.ui = MAT.ui || {};

  MAT.ui.getSelector = function (name, fallback) {
    var selectors = (MAT.config && MAT.config.selectors) || {};
    return selectors[name] || fallback || "";
  };

  MAT.ui.getEl = function (name, fallback) {
    var selector = MAT.ui.getSelector(name, fallback);
    return selector ? document.querySelector(selector) : null;
  };

  MAT.ui.escapeHtml = function (value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  MAT.ui.setStatus = function (message, type) {
    var el = MAT.ui.getEl("status");
    if (!el) return;
    el.className = "mat-status";
    if (type) el.classList.add(type);
    el.textContent = String(message || "");
  };

  MAT.ui.refreshSyncStatus = async function () {
    var helper = MAT.localPatch && typeof MAT.localPatch.refreshStatus === "function" ? MAT.localPatch : null;
    var status = null;

    if (helper) {
      status = await helper.refreshStatus();
    } else if (window.CurriculoSyncStatus && typeof window.CurriculoSyncStatus.refresh === "function") {
      status = await window.CurriculoSyncStatus.refresh();
    }

    return status;
  };

  MAT.ui.setSaveEnabled = function (enabled) {
    var el = MAT.ui.getEl("saveButton");
    if (el) el.disabled = !enabled;
  };

  MAT.ui.setEditorHint = function (text) {
    var el = MAT.ui.getEl("editorHint");
    if (el) el.textContent = String(text || "");
  };

  MAT.ui.clearPreview = function () {
    var el = MAT.ui.getEl("previewBody");
    if (el) el.innerHTML = "Aún no hay datos procesados en esta importación.";
  };

  MAT.ui.renderPreview = function (analysis) {
    var el = MAT.ui.getEl("previewBody");
    var html = "";
    var summary;
    var key;

    if (!el) return;
    if (!analysis || typeof analysis !== "object") {
      MAT.ui.clearPreview();
      return;
    }

    summary = analysis.summary || {};
    html += "<div><b>Tipo detectado:</b> " + MAT.ui.escapeHtml(analysis.kind) + "</div>";
    html += "<div style='margin-top:6px;'><b>Líneas útiles:</b> " + MAT.ui.escapeHtml(String(analysis.totalLines || 0)) + "</div>";

    if (analysis.kind === "materias-carrera" || analysis.kind === "transversales") {
      html += "<ul>";
      ["nivel1", "nivel2", "nivel3", "nivel4", "sinNivel"].forEach(function (part) {
        html += "<li><b>" + MAT.ui.escapeHtml(part) + ":</b> " + MAT.ui.escapeHtml(String(Array.isArray(summary[part]) ? summary[part].length : 0)) + "</li>";
      });
      html += "</ul>";
    } else {
      for (key in summary) {
        if (Object.prototype.hasOwnProperty.call(summary, key) && key !== "items") {
          html += "<div style='margin-top:6px;'><b>" + MAT.ui.escapeHtml(key) + ":</b> " + MAT.ui.escapeHtml(String(summary[key])) + "</div>";
        }
      }
      if (Array.isArray(summary.items) && summary.items.length) {
        html += "<ul>";
        summary.items.forEach(function (item) { html += "<li>" + MAT.ui.escapeHtml(item) + "</li>"; });
        html += "</ul>";
      }
    }

    el.innerHTML = html;
  };

  MAT.ui.renderEditorPlaceholder = function (message) {
    var el = MAT.ui.getEl("editor");
    var text = String(message || "Aquí se mostrará el editor dinámico.");
    if (!el) return;
    el.innerHTML = "<strong>Editor dinámico</strong><p>" + MAT.ui.escapeHtml(text) + "</p>";
  };

  MAT.ui.setSummaryHtml = function (html) {
    var el = MAT.ui.getEl("saveSummary", "#mat-save-summary");
    if (el) el.innerHTML = String(html || "");
  };

  MAT.ui.clearSummary = function (message) {
    var text = String(message || "Aún no has guardado cambios.");
    MAT.ui.setSummaryHtml("<p style='margin:0;color:#64748b;'>" + MAT.ui.escapeHtml(text) + "</p>");
  };

  MAT.ui.setCareerQuickSummaryHtml = function (html) {
    var el = MAT.ui.getEl("careerQuickSummary");
    if (!el) return;
    el.className = "mat-quick-summary";
    el.innerHTML = String(html || "");
  };

  MAT.ui.clearCareerQuickSummary = function (message) {
    var text = String(message || "Selecciona una carrera para ver qué está cargado.");
    MAT.ui.setCareerQuickSummaryHtml(
      "<div class='mat-quick-summary-title'>Resumen de carga</div>" +
      "<div class='mat-quick-summary-line'>" +
      "<span class='mat-quick-summary-label'>Estado:</span>" +
      "<span class='mat-quick-summary-text'>" + MAT.ui.escapeHtml(text) + "</span>" +
      "</div>"
    );
  };
})(window, document);
