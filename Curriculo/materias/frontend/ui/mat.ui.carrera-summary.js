/*
Nombre del archivo: mat.ui.carrera-summary.js
Ubicación: /Curriculo/materias/frontend/ui/mat.ui.carrera-summary.js
Función:
- Construir resumen compacto de carga por carrera
- Contar materias, transversales, núcleos y ejes
- Mostrar estado local/Firebase de forma corta
*/

(function (window) {
  "use strict";

  window.MAT = window.MAT || {};
  var MAT = window.MAT;

  MAT.ui = MAT.ui || {};
  MAT.ui.carreraSummary = MAT.ui.carreraSummary || {};

  function esc(value) {
    return MAT.ui && typeof MAT.ui.escapeHtml === "function" ? MAT.ui.escapeHtml(value) : String(value || "");
  }

  function toArray(value) { return Array.isArray(value) ? value.filter(function (item) { return String(item || "").trim(); }) : []; }

  function sumArrays(doc, keys) {
    return keys.reduce(function (total, key) { return total + toArray(doc && doc[key]).length; }, 0);
  }

  function getStats(doc) {
    var data = doc && typeof doc === "object" ? doc : {};
    return {
      materias: sumArrays(data, ["materiasNivel1", "materiasNivel2", "materiasNivel3", "materiasNivel4"]),
      transversales: sumArrays(data, ["materiasTransversal1", "materiasTransversal2", "materiasTransversal3", "materiasTransversal4"]),
      nucleos: toArray(data.nucleos).length,
      ejes: toArray(data.ejes).length,
      actualizadoLocal: String(data.updatedAtLocal || "")
    };
  }

  function splitLoadedAndMissing(stats) {
    var loaded = [];
    var missing = [];
    if (stats.materias > 0) loaded.push("Materias " + stats.materias); else missing.push("Materias");
    if (stats.transversales > 0) loaded.push("Transversales " + stats.transversales); else missing.push("Transversales");
    if (stats.nucleos > 0) loaded.push("Núcleos " + stats.nucleos); else missing.push("Núcleos");
    if (stats.ejes > 0) loaded.push("Ejes " + stats.ejes); else missing.push("Ejes");
    return { loaded: loaded, missing: missing };
  }

  function buildHtml(doc) {
    var stats = getStats(doc);
    var parts = splitLoadedAndMissing(stats);
    var loadedText = parts.loaded.length ? parts.loaded.join(" · ") : "Nada";
    var missingText = parts.missing.length ? parts.missing.join(" · ") : "Nada";
    var updatedText = stats.actualizadoLocal ? stats.actualizadoLocal.slice(0, 16).replace("T", " ") : "Sin fecha local";

    return ""
      + "<div class='mat-quick-summary-title'>Resumen de carga</div>"
      + "<div class='mat-quick-summary-line'><span class='mat-quick-summary-label'>Hay:</span><span class='mat-quick-summary-text'>" + esc(loadedText) + "</span></div>"
      + "<div class='mat-quick-summary-line'><span class='mat-quick-summary-label'>Falta:</span><span class='mat-quick-summary-text'>" + esc(missingText) + "</span></div>"
      + "<div class='mat-quick-summary-line'><span class='mat-quick-summary-label'>Local:</span><span class='mat-quick-summary-text'>" + esc(updatedText) + "</span></div>";
  }

  function buildStateHtml(label, text) {
    return ""
      + "<div class='mat-quick-summary-title'>Resumen de carga</div>"
      + "<div class='mat-quick-summary-line'><span class='mat-quick-summary-label'>" + esc(label) + ":</span><span class='mat-quick-summary-text'>" + esc(text) + "</span></div>";
  }

  MAT.ui.carreraSummary.getStats = getStats;

  MAT.ui.carreraSummary.render = function (doc) {
    if (typeof MAT.ui.setCareerQuickSummaryHtml === "function") MAT.ui.setCareerQuickSummaryHtml(buildHtml(doc));
  };

  MAT.ui.carreraSummary.renderLoading = function () {
    if (typeof MAT.ui.setCareerQuickSummaryHtml === "function") MAT.ui.setCareerQuickSummaryHtml(buildStateHtml("Estado", "Revisando carga..."));
  };

  MAT.ui.carreraSummary.renderError = function () {
    if (typeof MAT.ui.clearCareerQuickSummary === "function") MAT.ui.clearCareerQuickSummary("No se pudo leer el resumen.");
  };
})(window);
