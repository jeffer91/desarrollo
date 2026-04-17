/*
Nombre del archivo: stats.detail.issues.js
Ruta: stats/frontend/detail/stats.detail.issues.js
Función:
- Renderiza la tabla de inconsistencias y abre su modal de detalle
*/
(function attachStatsDetailIssues(window) {
  "use strict";

  window.STATS = window.STATS || {};

  function render(state) {
    var Helpers = window.STATS.DetailHelpers;
    var Tables = window.STATS.Tables;
    var DetailModals = window.STATS.DetailModals;
    var host = Helpers.getElement("statsIssuesHost");
    var issues = Helpers.getFilteredInconsistencias(state);

    if (!host || !Tables || !DetailModals) return;

    if (!issues.length) {
      host.innerHTML = '<div class="stats-message stats-message-success">No se detectaron inconsistencias para el filtro activo.</div>';
      return;
    }

    host.innerHTML = Tables.buildTableCard(
      "Inconsistencias visibles",
      "Doble click sobre una fila para abrir el detalle de la observación.",
      ["#", "Tipo", "Entidad", "Nombre relacionado", "ID", "Observación"],
      issues.map(function eachItem(item, index) {
        return [
          index + 1,
          item.tipo || "issue",
          item.entidad || "entidad",
          item.nombre || item.docenteNombre || "—",
          item.id || item.docenteId || item.capacitacionId || "—",
          item.observacion || "Registro con alerta de calidad de datos."
        ];
      }),
      {
        rowAttributes: issues.map(function eachItem(item, index) {
          return {
            "data-stats-open-issue": String(index)
          };
        }),
        rowClass: "is-clickable"
      }
    );

    host.ondblclick = function onIssuesDoubleClick(event) {
      var target = event.target;
      if (!target || !target.closest) return;

      var row = target.closest("[data-stats-open-issue]");
      if (!row) return;

      // Se usa el índice renderizado para abrir exactamente la inconsistencia visible.
      DetailModals.openIssueModal(state, Number(row.getAttribute("data-stats-open-issue") || "-1"));
    };
  }

  window.STATS.DetailIssues = {
    render: render
  };
})(window);