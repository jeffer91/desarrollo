/*
=========================================================
Nombre completo: distribucion.board.js
Ruta o ubicación: /incorporaciones/sedes/distribucion/distribucion.board.js
Función o funciones:
- Renderizar el tablero visual de distribución.
- Mostrar cada jornada como columna.
- Mostrar carreras como tarjetas arrastrables.
- Mostrar coordinador como etiqueta secundaria.
- Mostrar total de estudiantes por carrera y por jornada.
Con qué se une:
- distribucion.index.html
- distribucion.dom.js
- distribucion.dragdrop.js
- distribucion.logic.js
=========================================================
*/

(function () {
  "use strict";

  function render(state) {
    const elements = window.DistribucionDOM.getElements();

    if (!elements.distributionBoard) {
      return;
    }

    if (!state.jornadas || state.jornadas.length === 0) {
      elements.distributionBoard.innerHTML = buildEmptyMessage(
        "Agrega jornadas con fecha y hora para crear el tablero."
      );
      return;
    }

    elements.distributionBoard.innerHTML = state.jornadas
      .map((jornada, index) => buildJourneyColumn(jornada, index, state.distribucion))
      .join("");

    if (window.DistribucionDragDrop) {
      window.DistribucionDragDrop.bind();
    }
  }

  function buildJourneyColumn(jornada, index, distribucion) {
    const items = (distribucion || []).filter((item) => item.jornadaId === jornada.id);
    const total = items.reduce((sum, item) => sum + Number(item.total || 0), 0);

    return `
      <article class="journey-column">
        <header class="journey-column-header">
          <h3>Jornada ${index + 1}</h3>
          <p>${escape(jornada.fechaTexto || window.DistribucionState.formatDate(jornada.fecha))} - ${escape(jornada.horaTexto || window.DistribucionState.formatTime(jornada.hora))}</p>
          <span class="journey-total">${total} estudiantes</span>
        </header>

        <div class="career-list" data-drop-journey-id="${escape(jornada.id)}">
          ${
            items.length
              ? items.map((item) => buildCareerCard(item, jornada.id)).join("")
              : '<div class="empty-board">Sin carreras asignadas</div>'
          }
        </div>
      </article>
    `;
  }

  function buildCareerCard(item, jornadaId) {
    const manual = item.lockedManual
      ? '<small>Movimiento manual registrado</small>'
      : "";

    return `
      <div
        class="career-card"
        draggable="true"
        data-career-key="${escape(item.carreraKey)}"
        data-journey-id="${escape(jornadaId)}"
      >
        <strong>${escape(item.carrera)}</strong>
        <small>${escape(item.coordinador || "Sin coordinador")}</small>
        ${manual}
        <span>${Number(item.total || 0)} estudiantes</span>
      </div>
    `;
  }

  function buildEmptyMessage(message) {
    return `
      <div class="empty-board-large">
        ${escape(message)}
      </div>
    `;
  }

  function escape(value) {
    return window.DistribucionDOM.escapeHtml(value);
  }

  window.DistribucionBoard = {
    render
  };
})();