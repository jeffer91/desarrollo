/*
Nombre del archivo: stats.detail.tables.js
Ruta: stats/frontend/detail/stats.detail.tables.js
Función:
- Construye la configuración y el render de tablas del detalle estadístico
- Separa cada tabla en su propio panel
- Usa acordeón por bloque y evita repetición visual entre tablas
*/
(function attachStatsDetailTables(window) {
  "use strict";

  window.STATS = window.STATS || {};

  function buildTableConfigs(detail, state) {
    var Helpers = window.STATS.DetailHelpers;
    var filteredAsignaciones = Helpers.getFilteredAsignaciones(state);

    if (detail && detail.capacitacion) {
      var participantes = Helpers.uniqueBy(Helpers.asArray(detail.participantes), function getKey(item) {
        return [
          item && item.docenteId,
          item && item.capacitacionId,
          item && item.periodoLabel
        ].join("|");
      });

      var resumenCarrera = Helpers.uniqueBy(Helpers.asArray(detail.resumenCarrera), function getKey(item) {
        return item && item.label;
      });

      var resumenSexo = Helpers.uniqueBy(Helpers.asArray(detail.resumenSexo), function getKey(item) {
        return item && item.label;
      });

      return [
        {
          id: "participantes",
          title: "Participantes nominales",
          subtitle: "Doble click para abrir el detalle del docente visible en esta capacitación.",
          kind: "participante",
          scope: "detail",
          summaryItems: [
            { label: "Filas", value: participantes.length },
            { label: "Horas", value: Helpers.sumBy(participantes, function getHoras(item) { return item && item.horas; }), suffix: " h" }
          ],
          series: Helpers.buildTopParticipantsSeries(participantes),
          rows: participantes.map(function eachItem(item) {
            return {
              label: item.docenteNombre || "—",
              meta: (item.carreraNombre || "—") + " · " + (item.sexo || "—"),
              value: (item.horas || 0) + " h"
            };
          }),
          tableHeaders: ["#", "Docente", "Carrera", "Sexo", "Horas", "Estado"],
          tableRows: participantes.map(function eachItem(item, index) {
            return [
              index + 1,
              item.docenteNombre || "—",
              item.carreraNombre || "—",
              item.sexo || "—",
              item.horas || 0,
              item.estadoRegistro || "Válido"
            ];
          }),
          tableAttrs: participantes.map(function eachItem(item) {
            return {
              "data-stats-open": "1",
              "data-kind": "participante",
              "data-value": item.docenteNombre || "",
              "data-scope": "detail"
            };
          })
        },
        {
          id: "resumen-carrera",
          title: "Resumen por carrera",
          subtitle: "Doble click para abrir los participantes de la carrera seleccionada.",
          kind: "carrera",
          scope: "detail",
          summaryItems: [
            { label: "Carreras", value: resumenCarrera.length },
            { label: "Participantes", value: resumenCarrera.reduce(function reducer(acc, item) { return acc + Helpers.asNumber(item && item.participantes); }, 0) }
          ],
          series: resumenCarrera.map(function eachItem(item) {
            return {
              label: item.label || "—",
              total: Helpers.asNumber(item && item.participantes)
            };
          }),
          rows: resumenCarrera.map(function eachItem(item) {
            return {
              label: item.label || "—",
              meta: "Participantes: " + (item.participantes || 0) + " · Horas: " + (item.horas || 0),
              value: item.porcentaje || "0%"
            };
          }),
          tableHeaders: ["#", "Carrera", "Participantes", "Porcentaje", "Horas"],
          tableRows: resumenCarrera.map(function eachItem(item, index) {
            return [
              index + 1,
              item.label || "—",
              item.participantes || 0,
              item.porcentaje || "0%",
              item.horas || 0
            ];
          }),
          tableAttrs: resumenCarrera.map(function eachItem(item) {
            return {
              "data-stats-open": "1",
              "data-kind": "carrera",
              "data-value": item.label || "",
              "data-scope": "detail"
            };
          })
        },
        {
          id: "resumen-sexo",
          title: "Resumen por sexo",
          subtitle: "Doble click para abrir los participantes del grupo seleccionado.",
          kind: "sexo",
          scope: "detail",
          summaryItems: [
            { label: "Grupos", value: resumenSexo.length },
            { label: "Participantes", value: resumenSexo.reduce(function reducer(acc, item) { return acc + Helpers.asNumber(item && item.participantes); }, 0) }
          ],
          series: resumenSexo.map(function eachItem(item) {
            return {
              label: item.label || "—",
              total: Helpers.asNumber(item && item.participantes)
            };
          }),
          rows: resumenSexo.map(function eachItem(item) {
            return {
              label: item.label || "—",
              meta: "Participantes: " + (item.participantes || 0),
              value: item.porcentaje || "0%"
            };
          }),
          tableHeaders: ["#", "Sexo", "Participantes", "Porcentaje"],
          tableRows: resumenSexo.map(function eachItem(item, index) {
            return [
              index + 1,
              item.label || "—",
              item.participantes || 0,
              item.porcentaje || "0%"
            ];
          }),
          tableAttrs: resumenSexo.map(function eachItem(item) {
            return {
              "data-stats-open": "1",
              "data-kind": "sexo",
              "data-value": item.label || "",
              "data-scope": "detail"
            };
          })
        }
      ];
    }

    var capsRows = Helpers.buildGroupedTotals(filteredAsignaciones, "capacitacionNombre");
    var carreraRows = Helpers.buildGroupedTotals(filteredAsignaciones, "carreraNombre");
    var sexoRows = Helpers.buildGroupedTotals(filteredAsignaciones, "sexo");
    var periodoRows = Helpers.buildGroupedTotals(filteredAsignaciones, "periodoLabel");

    return [
      {
        id: "global-capacitaciones",
        title: "Resumen global por capacitaciones",
        subtitle: "Doble click para abrir el detalle visible de la capacitación.",
        kind: "capacitacion",
        scope: "global",
        summaryItems: [
          { label: "Bloques", value: capsRows.length },
          { label: "Asignaciones", value: capsRows.reduce(function reducer(acc, item) { return acc + Helpers.asNumber(item && item.total); }, 0) }
        ],
        series: capsRows,
        rows: capsRows.map(function eachItem(item) {
          return {
            label: item.label || "—",
            meta: "Asignaciones visibles",
            value: item.total || 0
          };
        }),
        tableHeaders: ["#", "Capacitación", "Asignaciones"],
        tableRows: capsRows.map(function eachItem(item, index) {
          return [index + 1, item.label || "—", item.total || 0];
        }),
        tableAttrs: capsRows.map(function eachItem(item) {
          return {
            "data-stats-open": "1",
            "data-kind": "capacitacion",
            "data-value": item.label || "",
            "data-scope": "global"
          };
        })
      },
      {
        id: "global-carrera",
        title: "Resumen global por carrera",
        subtitle: "Doble click para abrir el detalle nominal de la carrera.",
        kind: "carrera",
        scope: "global",
        summaryItems: [
          { label: "Carreras", value: carreraRows.length },
          { label: "Asignaciones", value: carreraRows.reduce(function reducer(acc, item) { return acc + Helpers.asNumber(item && item.total); }, 0) }
        ],
        series: carreraRows,
        rows: carreraRows.map(function eachItem(item) {
          return {
            label: item.label || "—",
            meta: "Asignaciones visibles",
            value: item.total || 0
          };
        }),
        tableHeaders: ["#", "Carrera", "Asignaciones"],
        tableRows: carreraRows.map(function eachItem(item, index) {
          return [index + 1, item.label || "—", item.total || 0];
        }),
        tableAttrs: carreraRows.map(function eachItem(item) {
          return {
            "data-stats-open": "1",
            "data-kind": "carrera",
            "data-value": item.label || "",
            "data-scope": "global"
          };
        })
      },
      {
        id: "global-sexo",
        title: "Resumen global por sexo",
        subtitle: "Doble click para abrir el detalle nominal del grupo.",
        kind: "sexo",
        scope: "global",
        summaryItems: [
          { label: "Grupos", value: sexoRows.length },
          { label: "Asignaciones", value: sexoRows.reduce(function reducer(acc, item) { return acc + Helpers.asNumber(item && item.total); }, 0) }
        ],
        series: sexoRows,
        rows: sexoRows.map(function eachItem(item) {
          return {
            label: item.label || "—",
            meta: "Asignaciones visibles",
            value: item.total || 0
          };
        }),
        tableHeaders: ["#", "Sexo", "Asignaciones"],
        tableRows: sexoRows.map(function eachItem(item, index) {
          return [index + 1, item.label || "—", item.total || 0];
        }),
        tableAttrs: sexoRows.map(function eachItem(item) {
          return {
            "data-stats-open": "1",
            "data-kind": "sexo",
            "data-value": item.label || "",
            "data-scope": "global"
          };
        })
      },
      {
        id: "global-periodo",
        title: "Resumen global por período",
        subtitle: "Doble click para abrir el detalle nominal del período.",
        kind: "periodo",
        scope: "global",
        summaryItems: [
          { label: "Períodos", value: periodoRows.length },
          { label: "Asignaciones", value: periodoRows.reduce(function reducer(acc, item) { return acc + Helpers.asNumber(item && item.total); }, 0) }
        ],
        series: periodoRows,
        rows: periodoRows.map(function eachItem(item) {
          return {
            label: item.label || "—",
            meta: "Asignaciones visibles",
            value: item.total || 0
          };
        }),
        tableHeaders: ["#", "Período", "Asignaciones"],
        tableRows: periodoRows.map(function eachItem(item, index) {
          return [index + 1, item.label || "—", item.total || 0];
        }),
        tableAttrs: periodoRows.map(function eachItem(item) {
          return {
            "data-stats-open": "1",
            "data-kind": "periodo",
            "data-value": item.label || "",
            "data-scope": "global"
          };
        })
      }
    ];
  }

  function buildDetailList(config) {
    var Helpers = window.STATS.DetailHelpers;
    var rows = Helpers.asArray(config.rows);

    if (!rows.length) {
      return Helpers.buildEmpty("Sin detalle para mostrar.");
    }

    return [
      '<div class="stats-detail-list">',
      rows.map(function eachItem(item) {
        return [
          '<div class="stats-detail-row-card is-clickable"',
          ' data-stats-open="1"',
          ' data-kind="', Helpers.escapeHtml(config.kind), '"',
          ' data-value="', Helpers.escapeHtml(item.label || ""), '"',
          ' data-scope="', Helpers.escapeHtml(config.scope || "global"), '">',
          '<div class="stats-detail-row-top">',
          '<div class="stats-detail-row-title">', Helpers.escapeHtml(item.label || "—"), "</div>",
          item.value != null ? '<span class="stats-badge">' + Helpers.escapeHtml(item.value) + "</span>" : "",
          "</div>",
          item.meta ? '<div class="stats-detail-row-meta">' + Helpers.escapeHtml(item.meta) + "</div>" : "",
          "</div>"
        ].join("");
      }).join(""),
      "</div>"
    ].join("");
  }

  function buildTableBody(config, currentView, Charts, Tables, Helpers) {
    if (currentView === "bars") {
      if (!Charts || typeof Charts.buildBars !== "function") {
        return Helpers.buildEmpty("No se encontró el módulo de gráficos.");
      }
      return Charts.buildBars(config.title, config.series, {
        subtitle: config.subtitle,
        itemAttributesBuilder: Helpers.buildInteractiveAttrs(config.kind, config.scope)
      });
    }

    if (currentView === "pie") {
      if (!Charts || typeof Charts.buildPieChart !== "function") {
        return Helpers.buildEmpty("No se encontró el módulo de gráficos.");
      }
      return Charts.buildPieChart(config.title, config.series, {
        subtitle: config.subtitle,
        itemAttributesBuilder: Helpers.buildInteractiveAttrs(config.kind, config.scope)
      });
    }

    if (currentView === "donut") {
      if (!Charts || typeof Charts.buildDonutChart !== "function") {
        return Helpers.buildEmpty("No se encontró el módulo de gráficos.");
      }
      return Charts.buildDonutChart(config.title, config.series, {
        subtitle: config.subtitle,
        itemAttributesBuilder: Helpers.buildInteractiveAttrs(config.kind, config.scope)
      });
    }

    if (currentView === "ranking") {
      if (!Charts || typeof Charts.buildRankingChart !== "function") {
        return Helpers.buildEmpty("No se encontró el módulo de gráficos.");
      }
      return Charts.buildRankingChart(config.title, config.series, {
        subtitle: config.subtitle,
        itemAttributesBuilder: Helpers.buildInteractiveAttrs(config.kind, config.scope)
      });
    }

    if (currentView === "details") {
      return [
        '<div class="stats-table-card">',
        '<div class="stats-table-card-header">',
        '<h3 class="stats-table-card-title">', Helpers.escapeHtml(config.title), "</h3>",
        '<p class="stats-table-card-subtitle">', Helpers.escapeHtml(config.subtitle || ""), "</p>",
        "</div>",
        buildDetailList(config),
        "</div>"
      ].join("");
    }

    return Tables.buildTableCard(
      config.title,
      config.subtitle,
      config.tableHeaders,
      config.tableRows,
      {
        rowAttributes: config.tableAttrs,
        rowClass: "is-clickable"
      }
    );
  }

  function buildAccordionBlock(config, currentView, isOpen, Charts, Tables, Helpers) {
    return [
      '<details class="stats-table-accordion" data-stats-table-block="1" data-stats-table-block-id="',
      Helpers.escapeHtml(config.id),
      '"',
      isOpen ? " open" : "",
      ">",
      '<summary class="stats-table-accordion-summary">',
      '<div class="stats-table-accordion-summary-main">',
      '<span class="stats-table-accordion-title">', Helpers.escapeHtml(config.title), "</span>",
      '<span class="stats-table-accordion-subtitle">', Helpers.escapeHtml(config.subtitle || ""), "</span>",
      "</div>",
      '<div class="stats-summary-chips">',
      Helpers.buildSummaryLine(config.summaryItems),
      "</div>",
      '<span class="stats-accordion-icon" aria-hidden="true"></span>',
      "</summary>",
      '<div class="stats-table-accordion-body">',
      Helpers.buildSectionToolbar("tables", currentView, {
        blockId: config.id
      }),
      buildTableBody(config, currentView, Charts, Tables, Helpers),
      "</div>",
      "</details>"
    ].join("");
  }

  function render(state, options) {
    var Helpers = window.STATS.DetailHelpers;
    var Charts = window.STATS.Charts;
    var Tables = window.STATS.Tables;
    var host = Helpers.getElement("statsDetailTablesHost");
    var detail = Helpers.getDetail(state);
    var configs = buildTableConfigs(detail, state);
    var getTableView = options && typeof options.getTableView === "function"
      ? options.getTableView
      : function defaultGetTableView() { return "table"; };
    var isTableBlockOpen = options && typeof options.isTableBlockOpen === "function"
      ? options.isTableBlockOpen
      : function defaultIsTableBlockOpen() { return false; };

    if (!host || !Tables) return;

    host.innerHTML = [
      '<div class="stats-results-stack">',
      configs.map(function eachConfig(config) {
        return buildAccordionBlock(
          config,
          getTableView(config.id),
          isTableBlockOpen(config.id),
          Charts,
          Tables,
          Helpers
        );
      }).join(""),
      "</div>"
    ].join("");

    if (options && typeof options.bindSectionEvents === "function") {
      options.bindSectionEvents(host, state);
    }
  }

  window.STATS.DetailTables = {
    buildTableConfigs: buildTableConfigs,
    buildDetailList: buildDetailList,
    render: render
  };
})(window);