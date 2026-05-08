/* =========================================================
Nombre completo: titulacion-graficos.js
Ruta: /Titulacion/frontend/js/graficos/titulacion-graficos.js
Función o funciones:
- Generar gráficos simples en HTML/CSS sin librerías externas.
- Crear gráficos de barras para resultados.
- Crear tarjetas de indicadores.
- Preparar contenido visual compatible con vista previa e impresión.
========================================================= */

(function (window) {
  "use strict";

  function utils() {
    return window.TITULACION_UTILS || {};
  }

  function asText(value) {
    var U = utils();
    if (typeof U.asText === "function") return U.asText(value);
    return String(value == null ? "" : value).trim();
  }

  function esc(value) {
    var U = utils();
    if (typeof U.escapeHtml === "function") return U.escapeHtml(value);

    return asText(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function toNumber(value) {
    var number = Number(value);
    return Number.isFinite(number) ? number : 0;
  }

  function maxValue(items) {
    var list = Array.isArray(items) ? items : [];
    var max = 0;

    list.forEach(function (item) {
      max = Math.max(max, toNumber(item.value || item.total || 0));
    });

    return max || 1;
  }

  function normalizeItems(items) {
    return (Array.isArray(items) ? items : []).map(function (item, index) {
      return {
        label: asText(item.label || item.name || item.carrera || "Indicador " + String(index + 1)),
        value: toNumber(item.value || item.total || item.cantidad || 0)
      };
    });
  }

  function createBarChartHtml(items, options) {
    var list = normalizeItems(items);
    var opts = options || {};
    var max = maxValue(list);

    if (!list.length) {
      return '<div class="titulacion-chart-empty">No existen datos para graficar.</div>';
    }

    return [
      '<section class="titulacion-chart">',
      opts.title ? '<h3>' + esc(opts.title) + '</h3>' : "",
      '<div class="chart-bars">',
      list.map(function (item) {
        var width = Math.round((item.value / max) * 100);

        return [
          '<div class="chart-row">',
          '<div class="chart-label">', esc(item.label), '</div>',
          '<div class="chart-track">',
          '<div class="chart-fill" style="width:', String(width), '%;"></div>',
          '</div>',
          '<div class="chart-value">', String(item.value), '</div>',
          '</div>'
        ].join("");
      }).join(""),
      '</div>',
      '</section>'
    ].join("");
  }

  function createIndicatorCardsHtml(items) {
    var list = normalizeItems(items);

    if (!list.length) {
      return '<div class="indicator-empty">No existen indicadores disponibles.</div>';
    }

    return [
      '<section class="indicator-grid">',
      list.map(function (item) {
        return [
          '<article class="indicator-card">',
          '<div class="indicator-value">', String(item.value), '</div>',
          '<div class="indicator-label">', esc(item.label), '</div>',
          '</article>'
        ].join("");
      }).join(""),
      '</section>'
    ].join("");
  }

  function createResultadosChartData(resumen) {
    var r = resumen || {};

    return [
      { label: "Aprobados", value: Number(r.aprobados || 0) },
      { label: "Pendientes", value: Number(r.pendientes || 0) },
      { label: "No aprobados", value: Number(r.noAprobados || 0) },
      { label: "Retirados", value: Number(r.retirados || 0) }
    ];
  }

  function createResultadosChartHtml(resumen) {
    return createBarChartHtml(createResultadosChartData(resumen), {
      title: "Resultados generales"
    });
  }

  window.TITULACION_GRAFICOS = {
    normalizeItems: normalizeItems,
    createBarChartHtml: createBarChartHtml,
    createIndicatorCardsHtml: createIndicatorCardsHtml,
    createResultadosChartData: createResultadosChartData,
    createResultadosChartHtml: createResultadosChartHtml
  };
})(window);