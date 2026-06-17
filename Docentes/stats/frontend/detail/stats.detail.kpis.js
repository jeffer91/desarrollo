/*
Nombre del archivo: stats.detail.kpis.js
Ruta: stats/frontend/detail/stats.detail.kpis.js
Función:
- Construye y renderiza los KPI del detalle estadístico
- Alterna entre vista global y vista por capacitación
*/
(function attachStatsDetailKpis(window) {
  "use strict";

  window.STATS = window.STATS || {};

  function buildKpiGrid(items, Helpers) {
    return [
      '<div class="stats-kpis-grid">',
      items.map(function eachItem(item) {
        return [
          '<div class="stats-kpi-card">',
          '<div class="stats-kpi-label">', Helpers.escapeHtml(item[0]), "</div>",
          '<div class="stats-kpi-value">', Helpers.escapeHtml(item[1]), "</div>",
          "</div>"
        ].join("");
      }).join(""),
      "</div>"
    ].join("");
  }

  function buildGlobalKpis(state, Helpers) {
    var metrics = Helpers.getMetrics(state);

    return [
      ["Docentes únicos", metrics.docentesUnicosConCapacitacion || 0],
      ["Capacitaciones visibles", metrics.capacitacionesAsignadasUnicas || 0],
      ["Asignaciones visibles", metrics.asignacionesTotales || 0],
      ["Horas visibles", metrics.horasTotales || 0],
      ["Promedio horas/asignación", metrics.promedioHorasPorAsignacion || 0],
      ["Promedio cap/docente", metrics.promedioCapacitacionesPorDocente || 0]
    ];
  }

  function buildDetailKpis(detail) {
    return [
      ["Docentes participantes", detail.kpis.docentesParticipantes || 0],
      ["Carreras involucradas", detail.kpis.carrerasInvolucradas || 0],
      ["Horas capacitación", detail.kpis.horasCapacitacion || 0],
      ["Asignaciones registradas", detail.kpis.asignacionesRegistradas || 0],
      ["Mujeres", detail.kpis.mujeres || 0],
      ["Hombres", detail.kpis.hombres || 0]
    ];
  }

  function render(state) {
    var Helpers = window.STATS.DetailHelpers;
    var host = Helpers.getElement("statsKpisHost");
    var detail = Helpers.getDetail(state);

    if (!host) return;

    host.innerHTML = buildKpiGrid(
      detail && detail.kpis ? buildDetailKpis(detail) : buildGlobalKpis(state, Helpers),
      Helpers
    );
  }

  window.STATS.DetailKpis = {
    render: render
  };
})(window);