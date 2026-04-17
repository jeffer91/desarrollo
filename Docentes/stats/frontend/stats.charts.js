/*
Nombre del archivo: stats.charts.js
Ruta: stats/frontend/stats.charts.js
Función:
- Construye gráficos HTML reutilizables sin librerías externas
- Soporta barras, ranking, pie y dona
- Permite interacción por elemento mediante atributos
*/
(function attachStatsCharts(window) {
  "use strict";

  window.STATS = window.STATS || {};

  var COLOR_SET = [
    "#1d4ed8",
    "#2563eb",
    "#3b82f6",
    "#60a5fa",
    "#93c5fd",
    "#0f766e",
    "#14b8a6",
    "#22c55e",
    "#f59e0b",
    "#ef4444"
  ];

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

  function attrsToString(attrs) {
    if (window.STATS.Tables && typeof window.STATS.Tables.attrsToString === "function") {
      return window.STATS.Tables.attrsToString(attrs);
    }

    var safeAttrs = attrs && typeof attrs === "object" ? attrs : {};
    return Object.keys(safeAttrs).map(function eachKey(key) {
      var value = safeAttrs[key];
      if (value === false || value == null) return "";
      if (value === true) return key;
      return key + '="' + escapeHtml(value) + '"';
    }).filter(Boolean).join(" ");
  }

  function normalizeSeries(series) {
    return asArray(series).map(function eachItem(item) {
      return {
        label: asText(item && item.label) || "Sin dato",
        total: asNumber(item && item.total)
      };
    }).filter(function eachItem(item) {
      return item.total >= 0;
    });
  }

  function getMax(series) {
    return normalizeSeries(series).reduce(function reducer(acc, item) {
      return item.total > acc ? item.total : acc;
    }, 0);
  }

  function buildCardWrap(title, subtitle, bodyHtml) {
    return [
      '<div class="stats-chart-card">',
      '<div class="stats-card-head">',
      "<div>",
      '<h3 class="stats-chart-title">', escapeHtml(title || "Gráfico"), "</h3>",
      subtitle ? '<p class="stats-card-subtitle">' + escapeHtml(subtitle) + "</p>" : "",
      "</div>",
      "</div>",
      bodyHtml || buildEmpty("Sin datos para graficar."),
      "</div>"
    ].join("");
  }

  function getItemAttrs(item, options) {
    var settings = options && typeof options === "object" ? options : {};
    var builder = typeof settings.itemAttributesBuilder === "function"
      ? settings.itemAttributesBuilder
      : null;
    var attrs = builder ? builder(item) : {};
    return attrsToString(attrs);
  }

  function buildBars(title, series, options) {
    var safeSeries = normalizeSeries(series);
    var max = getMax(safeSeries) || 1;
    var subtitle = options && options.subtitle ? options.subtitle : "";

    if (!safeSeries.length) {
      return buildCardWrap(title, subtitle, buildEmpty("Sin datos para mostrar."));
    }

    return buildCardWrap(
      title,
      subtitle,
      [
        '<div class="stats-bars">',
        safeSeries.map(function eachItem(item) {
          var width = Math.max(2, Math.round((item.total / max) * 100));
          var attrs = getItemAttrs(item, options);

          return [
            '<div class="stats-bar-row is-clickable"',
            attrs ? " " + attrs : "",
            ">",
            '<div class="stats-bar-top">',
            '<span class="stats-bar-label">', escapeHtml(item.label), "</span>",
            '<span class="stats-bar-value">', escapeHtml(item.total), "</span>",
            "</div>",
            '<div class="stats-bar-track">',
            '<div class="stats-bar-fill" style="width:', width, '%;"></div>',
            "</div>",
            "</div>"
          ].join("");
        }).join(""),
        "</div>"
      ].join("")
    );
  }

  function buildRankingChart(title, series, options) {
    var safeSeries = normalizeSeries(series);
    var subtitle = options && options.subtitle ? options.subtitle : "";

    if (!safeSeries.length) {
      return buildCardWrap(title, subtitle, buildEmpty("Sin datos para mostrar."));
    }

    return buildCardWrap(
      title,
      subtitle,
      [
        '<div class="stats-ranking-list">',
        safeSeries.map(function eachItem(item, index) {
          var attrs = getItemAttrs(item, options);

          return [
            '<div class="stats-ranking-row is-clickable"',
            attrs ? " " + attrs : "",
            ">",
            '<div class="stats-ranking-top">',
            '<span class="stats-ranking-label">', escapeHtml((index + 1) + ". " + item.label), "</span>",
            '<span class="stats-ranking-value">', escapeHtml(item.total), "</span>",
            "</div>",
            '<span class="stats-badge">', escapeHtml(item.total), "</span>",
            "</div>"
          ].join("");
        }).join(""),
        "</div>"
      ].join("")
    );
  }

  function buildCircularChart(title, series, options, withHole) {
    var safeSeries = normalizeSeries(series);
    var subtitle = options && options.subtitle ? options.subtitle : "";
    var total = safeSeries.reduce(function reducer(acc, item) {
      return acc + item.total;
    }, 0);

    if (!safeSeries.length || total <= 0) {
      return buildCardWrap(title, subtitle, buildEmpty("Sin datos para mostrar."));
    }

    var start = 0;
    var gradientParts = safeSeries.map(function eachItem(item, index) {
      var angle = (item.total / total) * 360;
      var color = COLOR_SET[index % COLOR_SET.length];
      var from = start;
      var to = start + angle;
      start = to;
      return color + " " + from.toFixed(2) + "deg " + to.toFixed(2) + "deg";
    });

    var figureStyle = ' style="background:conic-gradient(' + gradientParts.join(",") + ');"';

    return buildCardWrap(
      title,
      subtitle,
      [
        '<div class="stats-donut-layout">',
        '<div class="stats-donut-figure"', figureStyle, ">",
        withHole
          ? '<div class="stats-donut-hole"><div><div class="stats-donut-total">' + escapeHtml(total) + '</div><span class="stats-donut-caption">Total</span></div></div>'
          : "",
        "</div>",
        '<div class="stats-legend">',
        safeSeries.map(function eachItem(item, index) {
          var color = COLOR_SET[index % COLOR_SET.length];
          var attrs = getItemAttrs(item, options);
          var percent = total > 0 ? ((item.total / total) * 100).toFixed(2) + "%" : "0%";

          return [
            '<div class="stats-legend-row is-clickable"',
            attrs ? " " + attrs : "",
            ">",
            '<span class="stats-legend-swatch" style="background:', color, ';"></span>',
            '<span class="stats-legend-label">', escapeHtml(item.label), "</span>",
            '<span class="stats-legend-value">', escapeHtml(item.total + " · " + percent), "</span>",
            "</div>"
          ].join("");
        }).join(""),
        "</div>",
        "</div>"
      ].join("")
    );
  }

  function buildPieChart(title, series, options) {
    return buildCircularChart(title, series, options, false);
  }

  function buildDonutChart(title, series, options) {
    return buildCircularChart(title, series, options, true);
  }

  window.STATS.Charts = {
    buildEmpty: buildEmpty,
    buildBars: buildBars,
    buildRankingChart: buildRankingChart,
    buildPieChart: buildPieChart,
    buildDonutChart: buildDonutChart
  };
})(window);