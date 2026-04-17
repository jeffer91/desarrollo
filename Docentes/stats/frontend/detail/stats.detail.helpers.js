/*
Nombre del archivo: stats.detail.helpers.js
Ruta: stats/frontend/detail/stats.detail.helpers.js
Función:
- Centraliza utilidades compartidas del detalle estadístico
- Evita duplicar acceso a estado, formato y helpers de render
- Soporta acordeones y vistas independientes por bloque
*/
(function attachStatsDetailHelpers(window) {
  "use strict";

  window.STATS = window.STATS || {};

  function getElement(id) {
    return document.getElementById(id);
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function asText(value) {
    return value == null ? "" : String(value).trim();
  }

  function asNumber(value) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function escapeHtml(value) {
    if (window.STATS.UI && typeof window.STATS.UI.escapeHtml === "function") {
      return window.STATS.UI.escapeHtml(value);
    }

    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function buildEmpty(message) {
    if (window.STATS.Tables && typeof window.STATS.Tables.buildEmpty === "function") {
      return window.STATS.Tables.buildEmpty(message);
    }

    return '<div class="stats-empty">' + escapeHtml(message || "Sin datos para mostrar.") + "</div>";
  }

  function formatDate(value) {
    if (window.STATS.UI && typeof window.STATS.UI.formatDate === "function") {
      return window.STATS.UI.formatDate(value);
    }

    var text = asText(value);
    var parts = text.split("-");
    if (parts.length !== 3) return text || "—";
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }

  function uniqueBy(list, getKey) {
    var output = [];
    var seen = {};

    asArray(list).forEach(function eachItem(item) {
      var key = typeof getKey === "function" ? asText(getKey(item)) : "";
      if (!key || seen[key]) return;
      seen[key] = true;
      output.push(item);
    });

    return output;
  }

  function sumBy(list, getValue) {
    return asArray(list).reduce(function reducer(acc, item) {
      return acc + asNumber(typeof getValue === "function" ? getValue(item) : 0);
    }, 0);
  }

  function getDetail(state) {
    return state && state.derived && state.derived.detail ? state.derived.detail : null;
  }

  function getMetrics(state) {
    /* Corrección:
       - El detalle estaba leyendo solo state.derived.metrics.
       - stats.metrics.js actualmente entrega los KPIs en state.derived.kpis.
       - Se agrega fallback para evitar que los paneles muestren 0 cuando sí hay datos calculados. */
    if (!state || !state.derived) return {};
    return state.derived.metrics || state.derived.kpis || {};
  }

  function getFilters(state) {
    return state && state.filters ? state.filters : {};
  }

  function getFilteredAsignaciones(state) {
    return state && state.derived && Array.isArray(state.derived.filteredAsignaciones)
      ? state.derived.filteredAsignaciones
      : [];
  }

  function getFilteredInconsistencias(state) {
    return state && state.derived && Array.isArray(state.derived.filteredInconsistencias)
      ? state.derived.filteredInconsistencias
      : [];
  }

  function buildGroupedTotals(list, fieldName) {
    var grouped = {};

    asArray(list).forEach(function eachItem(item) {
      var key = asText(item && item[fieldName]) || "Sin dato";
      if (!grouped[key]) {
        grouped[key] = {
          label: key,
          total: 0
        };
      }
      grouped[key].total += 1;
    });

    return Object.keys(grouped).map(function eachKey(key) {
      return grouped[key];
    }).sort(function sorter(a, b) {
      return b.total - a.total;
    });
  }

  function buildGroupedHours(list, fieldName) {
    var grouped = {};

    asArray(list).forEach(function eachItem(item) {
      var key = asText(item && item[fieldName]) || "Sin dato";
      if (!grouped[key]) {
        grouped[key] = {
          label: key,
          total: 0
        };
      }
      grouped[key].total += asNumber(item && item.horas);
    });

    return Object.keys(grouped).map(function eachKey(key) {
      return grouped[key];
    }).sort(function sorter(a, b) {
      return b.total - a.total;
    });
  }

  function buildTopParticipantsSeries(participantes) {
    return asArray(participantes)
      .map(function eachItem(item) {
        return {
          label: item && item.docenteNombre ? item.docenteNombre : "Sin dato",
          total: asNumber(item && item.horas)
        };
      })
      .sort(function sorter(a, b) {
        return b.total - a.total;
      })
      .slice(0, 10);
  }

  function getPeriodoText(filters) {
    var periodo = filters && filters.periodo ? filters.periodo : "todos";

    if (Array.isArray(periodo)) {
      return periodo.filter(function eachItem(item) {
        return asText(item) && asText(item) !== "todos";
      }).join(" | ") || "Todos";
    }

    return asText(periodo) && asText(periodo) !== "todos" ? periodo : "Todos";
  }

  function buildSectionToolbar(kind, current, options) {
    var settings = options && typeof options === "object" ? options : {};
    var blockId = settings.blockId ? asText(settings.blockId) : "";
    var views = asArray(settings.allowedViews).length
      ? settings.allowedViews
      : [
          ["bars", "Barras"],
          ["pie", "Pastel"],
          ["donut", "Dona"],
          ["ranking", "Ranking"],
          ["table", "Tabla"],
          ["details", "Detalles"]
        ];

    return [
      '<div class="stats-switcher">',
      views.map(function eachView(item) {
        var viewId = item[0];
        var viewLabel = item[1];
        var attrs = [
          'type="button"',
          'class="stats-view-btn ' + (current === viewId ? "is-active" : "") + '"',
          'data-stats-' + kind + '-view="' + escapeHtml(viewId) + '"'
        ];

        if (kind === "tables" && blockId) {
          attrs.push('data-stats-table-id="' + escapeHtml(blockId) + '"');
        }

        return [
          "<button ",
          attrs.join(" "),
          ">",
          escapeHtml(viewLabel),
          "</button>"
        ].join("");
      }).join(""),
      "</div>"
    ].join("");
  }

  function buildInteractiveAttrs(kind, scope) {
    return function itemAttributesBuilder(item) {
      return {
        "data-stats-open": "1",
        "data-kind": kind,
        "data-value": item && item.label ? item.label : "",
        "data-scope": scope || "global"
      };
    };
  }

  function buildSummaryLine(items) {
    var safeItems = asArray(items).filter(function eachItem(item) {
      return item && item.label != null;
    });

    if (!safeItems.length) {
      return '<span class="stats-chip">Sin resumen</span>';
    }

    return safeItems.map(function eachItem(item) {
      var suffix = item && item.suffix != null ? String(item.suffix) : "";
      var value = item && item.value != null ? String(item.value) : "0";
      return [
        '<span class="stats-chip">',
        "<strong>", escapeHtml(item.label), ":</strong> ",
        escapeHtml(value + suffix),
        "</span>"
      ].join("");
    }).join("");
  }

  window.STATS.DetailHelpers = {
    getElement: getElement,
    asArray: asArray,
    asText: asText,
    asNumber: asNumber,
    escapeHtml: escapeHtml,
    buildEmpty: buildEmpty,
    formatDate: formatDate,
    uniqueBy: uniqueBy,
    sumBy: sumBy,
    getDetail: getDetail,
    getMetrics: getMetrics,
    getFilters: getFilters,
    getFilteredAsignaciones: getFilteredAsignaciones,
    getFilteredInconsistencias: getFilteredInconsistencias,
    buildGroupedTotals: buildGroupedTotals,
    buildGroupedHours: buildGroupedHours,
    buildTopParticipantsSeries: buildTopParticipantsSeries,
    getPeriodoText: getPeriodoText,
    buildSectionToolbar: buildSectionToolbar,
    buildInteractiveAttrs: buildInteractiveAttrs,
    buildSummaryLine: buildSummaryLine
  };
})(window);