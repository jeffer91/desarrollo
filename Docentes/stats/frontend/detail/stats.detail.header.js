/*
Nombre del archivo: stats.detail.header.js
Ruta: stats/frontend/detail/stats.detail.header.js
Función:
- Construye y renderiza la ficha técnica del detalle estadístico
- Muestra resumen global o ficha técnica de la capacitación activa
*/
(function attachStatsDetailHeader(window) {
  "use strict";

  window.STATS = window.STATS || {};

  function buildInfoCards(items) {
    return [
      '<div class="stats-modal-info-grid">',
      items.map(function eachItem(item) {
        return [
          '<div class="stats-modal-info-card">',
          '<div class="stats-modal-info-label">', item[0], "</div>",
          '<div class="stats-modal-info-value">', item[1], "</div>",
          "</div>"
        ].join("");
      }).join(""),
      "</div>"
    ].join("");
  }

  function renderGlobal(state, host, Helpers) {
    var metrics = Helpers.getMetrics(state);
    var filters = Helpers.getFilters(state);

    host.innerHTML = [
      '<div class="stats-table-card">',
      /* Corrección:
         - Se elimina el título y subtítulo internos del bloque global.
         - Evita duplicar encabezados porque la sección "Ficha técnica" ya los muestra en el contenedor padre.
         - Hace la ficha más compacta sin alterar la data ni la estructura de tarjetas. */
      buildInfoCards([
        ["Carrera activa", Helpers.escapeHtml(filters.carrera || "todos")],
        ["Período visible", Helpers.escapeHtml(Helpers.getPeriodoText(filters))],
        ["Capacitación activa", Helpers.escapeHtml(filters.capacitacion || "todos")],
        ["Sexo activo", Helpers.escapeHtml(filters.sexo || "todos")],
        /* Corrección:
           - Este detalle leía claves antiguas de métricas.
           - Ahora usa las claves reales que entrega stats.metrics.js.
           - Evita que la ficha técnica muestre 0 con datos ya calculados. */
        ["Docentes únicos", Helpers.escapeHtml(metrics.docentesUnicos || 0)],
        ["Capacitaciones visibles", Helpers.escapeHtml(metrics.capacitacionesVisibles || 0)],
        ["Asignaciones visibles", Helpers.escapeHtml(metrics.asignacionesVisibles || 0)],
        ["Horas visibles", Helpers.escapeHtml(metrics.horasVisibles || 0)]
      ]),
      "</div>"
    ].join("");
  }

  function renderDetail(state, host, Helpers, detail) {
    var cap = detail.capacitacion || {};

    host.innerHTML = [
      '<div class="stats-table-card">',
      /* Corrección:
         - Se elimina el título y subtítulo internos del detalle de capacitación.
         - Evita duplicar encabezados porque la sección "Ficha técnica" ya los muestra en el contenedor padre.
         - Hace la ficha más compacta sin alterar la data ni la estructura de tarjetas. */
      buildInfoCards([
        ["Nombre", Helpers.escapeHtml(cap.nombre || "—")],
        ["Período", Helpers.escapeHtml(cap.periodoLabel || "—")],
        ["Fecha de inicio", Helpers.escapeHtml(Helpers.formatDate(cap.fechaInicio))],
        ["Fecha de finalización", Helpers.escapeHtml(Helpers.formatDate(cap.fechaFin))],
        ["Horas", Helpers.escapeHtml(cap.horas || 0)],
        ["Entidad", Helpers.escapeHtml(cap.imparte || "—")],
        ["Modalidad", Helpers.escapeHtml(cap.modalidad || "—")],
        ["Ámbito", Helpers.escapeHtml(cap.ambito || "—")]
      ]),
      "</div>"
    ].join("");
  }

  function render(state) {
    var Helpers = window.STATS.DetailHelpers;
    var host = Helpers.getElement("statsDetailHeaderHost");
    var detail = Helpers.getDetail(state);

    if (!host) return;

    if (detail && detail.capacitacion) {
      renderDetail(state, host, Helpers, detail);
      return;
    }

    renderGlobal(state, host, Helpers);
  }

  window.STATS.DetailHeader = {
    render: render
  };
})(window);