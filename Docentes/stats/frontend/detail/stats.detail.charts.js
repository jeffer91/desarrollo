/*
Nombre del archivo: stats.detail.charts.js
Ruta: stats/frontend/detail/stats.detail.charts.js
Función:
- Construye y renderiza los gráficos de la vista activa
- Soporta detalle por capacitación y resumen global
- Mantiene una sola vista visual por render, sin mezclar controles con tablas
*/
(function attachStatsDetailCharts(window) {
  "use strict";

  window.STATS = window.STATS || {};

  function buildGlobalCapSeries(state, Helpers) {
    return Helpers.buildGroupedTotals(Helpers.getFilteredAsignaciones(state), "capacitacionNombre").slice(0, 10);
  }

  function buildChartConfigs(state) {
    var Helpers = window.STATS.DetailHelpers;
    var detail = Helpers.getDetail(state);
    var metrics = Helpers.getMetrics(state);

    if (detail && detail.capacitacion) {
      return [
        {
          title: "Participación por carrera",
          subtitle: "Top visible de participación por carrera en la capacitación activa.",
          kind: "carrera",
          scope: "detail",
          series: Helpers.asArray(detail.chartParticipacionCarrera)
        },
        {
          title: "Participación por sexo",
          subtitle: "Distribución visible por sexo en la capacitación activa.",
          kind: "sexo",
          scope: "detail",
          series: Helpers.asArray(detail.chartParticipacionSexo)
        },
        {
          title: "Horas acumuladas por carrera",
          subtitle: "Carga horaria visible agrupada por carrera.",
          kind: "carrera",
          scope: "detail",
          series: Helpers.asArray(detail.chartHorasCarrera)
        },
        {
          title: "Cobertura visual",
          subtitle: "Indicador de cobertura del conjunto visible.",
          kind: "capacitacion",
          scope: "detail",
          series: [
            {
              label: detail.capacitacion && detail.capacitacion.nombre ? detail.capacitacion.nombre : "Capacitación",
              total: detail.kpis && detail.kpis.coberturaVisual ? detail.kpis.coberturaVisual : 100
            }
          ]
        }
      ];
    }

    return [
      {
        title: "División por capacitaciones",
        subtitle: "Resumen visible por capacitación en el filtro activo.",
        kind: "capacitacion",
        scope: "global",
        series: buildGlobalCapSeries(state, Helpers)
      },
      {
        title: "Participación por carrera",
        subtitle: "Resumen global de asignaciones visibles por carrera.",
        kind: "carrera",
        scope: "global",
        series: Helpers.asArray(metrics.porCarrera)
      },
      {
        title: "Participación por sexo",
        subtitle: "Resumen global de asignaciones visibles por sexo.",
        kind: "sexo",
        scope: "global",
        series: Helpers.asArray(metrics.porSexo)
      },
      {
        title: "Distribución por período",
        subtitle: "Resumen visible por período dentro de la selección activa.",
        kind: "periodo",
        scope: "global",
        series: Helpers.asArray(metrics.porPeriodo)
      }
    ];
  }

  function getAttrsBuilder(kind, scope) {
    return function itemAttributesBuilder(item) {
      return {
        "data-stats-open": "1",
        "data-kind": kind,
        "data-value": item && item.label ? item.label : "",
        "data-scope": scope || "global"
      };
    };
  }

  function buildChartCard(config, currentView, Charts) {
    var options = {
      subtitle: config.subtitle,
      itemAttributesBuilder: getAttrsBuilder(config.kind, config.scope)
    };

    if (currentView === "pie") {
      return Charts.buildPieChart(config.title, config.series, options);
    }

    if (currentView === "donut") {
      return Charts.buildDonutChart(config.title, config.series, options);
    }

    if (currentView === "ranking") {
      return Charts.buildRankingChart(config.title, config.series, options);
    }

    return Charts.buildBars(config.title, config.series, options);
  }

  function render(state, options) {
    var Helpers = window.STATS.DetailHelpers;
    var Charts = window.STATS.Charts;
    var host = Helpers.getElement("statsDetailChartsHost");
    var currentView = options && options.view ? options.view : "bars";

    if (!host || !Charts) return;

    host.innerHTML = [
      Helpers.buildSectionToolbar("charts", currentView, {
        allowedViews: [
          ["bars", "Barras"],
          ["pie", "Pastel"],
          ["donut", "Dona"],
          ["ranking", "Ranking"]
        ]
      }),
      '<div class="stats-visual-grid">',
      buildChartConfigs(state).map(function eachConfig(config) {
        return buildChartCard(config, currentView, Charts);
      }).join(""),
      "</div>"
    ].join("");

    if (options && typeof options.bindSectionEvents === "function") {
      options.bindSectionEvents(host, state);
    }
  }

  window.STATS.DetailCharts = {
    render: render,
    buildChartConfigs: buildChartConfigs
  };
})(window);