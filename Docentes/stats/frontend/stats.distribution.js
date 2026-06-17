/*
Nombre del archivo: stats.distribution.js
Ruta: stats/frontend/stats.distribution.js
Función:
- Renderiza la división por capacitaciones
- Coloca cada capacitación en su propio acordeón
- Evita mezclar el detalle de varias capacitaciones en un solo panel
*/
(function attachStatsDistribution(window) {
  "use strict";

  window.STATS = window.STATS || {};

  function getHelpers() {
    return window.STATS.DetailHelpers || {};
  }

  function asArray(value) {
    var Helpers = getHelpers();
    return Helpers.asArray ? Helpers.asArray(value) : (Array.isArray(value) ? value : []);
  }

  function asText(value) {
    var Helpers = getHelpers();
    return Helpers.asText ? Helpers.asText(value) : (value == null ? "" : String(value).trim());
  }

  function asNumber(value) {
    var Helpers = getHelpers();
    return Helpers.asNumber ? Helpers.asNumber(value) : (Number(value) || 0);
  }

  function escapeHtml(value) {
    var Helpers = getHelpers();
    if (Helpers.escapeHtml) return Helpers.escapeHtml(value);
    return String(value == null ? "" : value);
  }

  function getFilteredAsignaciones(state) {
    var Helpers = getHelpers();
    return Helpers.getFilteredAsignaciones ? Helpers.getFilteredAsignaciones(state) : [];
  }

  function uniqueDocentes(rows) {
    var seen = {};
    var total = 0;

    asArray(rows).forEach(function eachItem(item) {
      var key = asText(item && item.docenteId);
      if (!key || seen[key]) return;
      seen[key] = true;
      total += 1;
    });

    return total;
  }

  function groupSimple(rows, fieldName) {
    var map = {};

    asArray(rows).forEach(function eachItem(item) {
      var key = asText(item && item[fieldName]) || "Sin dato";
      if (!map[key]) {
        map[key] = {
          label: key,
          total: 0
        };
      }
      map[key].total += 1;
    });

    return Object.keys(map).map(function eachKey(key) {
      return map[key];
    }).sort(function sorter(a, b) {
      return b.total - a.total;
    });
  }

  function buildDistributionRows(asignaciones) {
    var grouped = {};

    asArray(asignaciones).forEach(function eachItem(item) {
      var capId = asText(item && item.capacitacionId) || asText(item && item.capacitacionNombre);
      if (!capId) return;

      if (!grouped[capId]) {
        grouped[capId] = {
          id: capId,
          label: asText(item && item.capacitacionNombre) || "Capacitación sin nombre",
          periodoLabel: asText(item && item.periodoLabel) || "Sin período",
          modalidad: asText(item && item.modalidad) || "Sin modalidad",
          ambito: asText(item && item.ambito) || "Sin ámbito",
          imparte: asText(item && item.imparte) || "Sin entidad",
          horas: asNumber(item && item.horas),
          asignaciones: []
        };
      }

      grouped[capId].asignaciones.push(item);
    });

    return Object.keys(grouped).map(function eachKey(key) {
      var item = grouped[key];
      var resumenCarrera = groupSimple(item.asignaciones, "carreraNombre");
      var resumenSexo = groupSimple(item.asignaciones, "sexo");

      return {
        id: item.id,
        label: item.label,
        periodoLabel: item.periodoLabel,
        modalidad: item.modalidad,
        ambito: item.ambito,
        imparte: item.imparte,
        horas: item.horas,
        totalAsignaciones: item.asignaciones.length,
        totalDocentes: uniqueDocentes(item.asignaciones),
        resumenCarrera: resumenCarrera,
        resumenSexo: resumenSexo,
        asignaciones: item.asignaciones
      };
    }).sort(function sorter(a, b) {
      return b.totalAsignaciones - a.totalAsignaciones;
    });
  }

  function buildTopSummary(rows, Charts) {
    var topSeries = asArray(rows).slice(0, 8).map(function eachItem(item) {
      return {
        label: item.label,
        total: item.totalAsignaciones
      };
    });

    return Charts.buildBars(
      "Capacitaciones más visibles",
      topSeries,
      {
        subtitle: "Resumen rápido de las capacitaciones con mayor cantidad de asignaciones visibles.",
        itemAttributesBuilder: function itemAttributesBuilder(item) {
          return {
            "data-stats-open": "1",
            "data-kind": "capacitacion",
            "data-value": item.label,
            "data-scope": "global"
          };
        }
      }
    );
  }

  function buildCapAccordion(row, Tables) {
    var carreraHeaders = ["#", "Carrera", "Asignaciones"];
    var carreraRows = asArray(row.resumenCarrera).map(function eachItem(item, index) {
      return [index + 1, item.label || "—", item.total || 0];
    });
    var carreraAttrs = asArray(row.resumenCarrera).map(function eachItem(item) {
      return {
        "data-stats-open": "1",
        "data-kind": "carrera",
        "data-value": item.label || "",
        "data-scope": "global"
      };
    });

    var sexoHeaders = ["#", "Sexo", "Asignaciones"];
    var sexoRows = asArray(row.resumenSexo).map(function eachItem(item, index) {
      return [index + 1, item.label || "—", item.total || 0];
    });
    var sexoAttrs = asArray(row.resumenSexo).map(function eachItem(item) {
      return {
        "data-stats-open": "1",
        "data-kind": "sexo",
        "data-value": item.label || "",
        "data-scope": "global"
      };
    });

    return [
      '<details class="stats-table-accordion" data-stats-distribution-accordion="1">',
      '<summary class="stats-table-accordion-summary">',
      '<div class="stats-table-accordion-summary-main">',
      '<span class="stats-table-accordion-title">', escapeHtml(row.label), "</span>",
      '<span class="stats-table-accordion-subtitle">', escapeHtml(row.periodoLabel + " · " + row.modalidad + " · " + row.ambito), "</span>",
      "</div>",
      '<div class="stats-summary-chips">',
      '<span class="stats-chip"><strong>Docentes:</strong> ', escapeHtml(row.totalDocentes), "</span>",
      '<span class="stats-chip"><strong>Asignaciones:</strong> ', escapeHtml(row.totalAsignaciones), "</span>",
      '<span class="stats-chip"><strong>Horas:</strong> ', escapeHtml(row.horas + " h"), "</span>",
      "</div>",
      '<span class="stats-accordion-icon" aria-hidden="true"></span>',
      "</summary>",
      '<div class="stats-table-accordion-body">',
      '<div class="stats-modal-info-grid">',
      '<div class="stats-modal-info-card"><div class="stats-modal-info-label">Entidad</div><div class="stats-modal-info-value">', escapeHtml(row.imparte), "</div></div>",
      '<div class="stats-modal-info-card"><div class="stats-modal-info-label">Modalidad</div><div class="stats-modal-info-value">', escapeHtml(row.modalidad), "</div></div>",
      '<div class="stats-modal-info-card"><div class="stats-modal-info-label">Ámbito</div><div class="stats-modal-info-value">', escapeHtml(row.ambito), "</div></div>",
      '<div class="stats-modal-info-card"><div class="stats-modal-info-label">Período</div><div class="stats-modal-info-value">', escapeHtml(row.periodoLabel), "</div></div>",
      "</div>",
      Tables.buildTableCard(
        "Resumen por carrera",
        "Doble click sobre una fila para abrir el detalle nominal de la carrera.",
        carreraHeaders,
        carreraRows,
        {
          rowAttributes: carreraAttrs,
          rowClass: "is-clickable"
        }
      ),
      Tables.buildTableCard(
        "Resumen por sexo",
        "Doble click sobre una fila para abrir el detalle nominal del grupo.",
        sexoHeaders,
        sexoRows,
        {
          rowAttributes: sexoAttrs,
          rowClass: "is-clickable"
        }
      ),
      '<div class="stats-message stats-message-info">Doble click sobre el nombre de la capacitación en el resumen o sobre las filas internas para abrir el detalle.</div>',
      "</div>",
      "</details>"
    ].join("");
  }

  function openCapacitacionModal(state, value) {
    var DetailModals = window.STATS.DetailModals;
    if (!DetailModals || typeof DetailModals.openFieldModal !== "function") return;
    DetailModals.openFieldModal(state, "capacitacion", value, "global");
  }

  function renderContent(state, rows) {
    var Helpers = getHelpers();
    var Charts = window.STATS.Charts;
    var Tables = window.STATS.Tables;
    var host = Helpers.getElement ? Helpers.getElement("statsDistributionChartHost") : document.getElementById("statsDistributionChartHost");

    if (!host || !Charts || !Tables) return;

    if (!rows.length) {
      host.innerHTML = Tables.buildEmpty("No hay capacitaciones visibles para el filtro activo.");
      host.ondblclick = null;
      return;
    }

    host.innerHTML = [
      buildTopSummary(rows, Charts),
      '<div class="stats-results-stack">',
      rows.map(function eachRow(row) {
        return buildCapAccordion(row, Tables);
      }).join(""),
      "</div>"
    ].join("");

    host.ondblclick = function onDoubleClick(event) {
      var target = event.target;
      var opener;

      if (!target || !target.closest) return;

      opener = target.closest("[data-stats-open='1'][data-kind='capacitacion']");
      if (!opener) return;

      openCapacitacionModal(state, opener.getAttribute("data-value") || "");
    };
  }

  function render(state) {
    var rows = buildDistributionRows(getFilteredAsignaciones(state));
    renderContent(state, rows);
  }

  window.STATS.Distribution = {
    render: render,
    buildDistributionRows: buildDistributionRows,
    openCapacitacionModal: openCapacitacionModal
  };
})(window);