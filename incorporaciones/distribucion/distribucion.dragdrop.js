/*
=========================================================
Nombre completo: distribucion.dragdrop.js
Ruta o ubicación: /incorporaciones/sedes/distribucion/distribucion.dragdrop.js
Función o funciones:
- Permitir arrastrar carreras entre jornadas.
- Pedir confirmación antes de mover una carrera.
- Actualizar totales, tablero y tabla resumen después del movimiento.
- Registrar cambios manuales para redistribución futura.
Con qué se une:
- distribucion.board.js
- distribucion.state.js
- distribucion.table.js
- distribucion.logic.js
=========================================================
*/

(function () {
  "use strict";

  let draggedCareerKey = null;
  let draggedFromJourneyId = null;

  function bind() {
    bindDraggables();
    bindDropZones();
  }

  function bindDraggables() {
    document.querySelectorAll("[data-career-key]").forEach((card) => {
      card.addEventListener("dragstart", handleDragStart);
      card.addEventListener("dragend", handleDragEnd);
    });
  }

  function bindDropZones() {
    document.querySelectorAll("[data-drop-journey-id]").forEach((zone) => {
      zone.addEventListener("dragover", handleDragOver);
      zone.addEventListener("drop", handleDrop);
    });
  }

  function handleDragStart(event) {
    const card = event.currentTarget;

    draggedCareerKey = card.dataset.careerKey;
    draggedFromJourneyId = card.dataset.journeyId;

    card.classList.add("dragging");

    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedCareerKey);
    }
  }

  function handleDragEnd(event) {
    event.currentTarget.classList.remove("dragging");

    draggedCareerKey = null;
    draggedFromJourneyId = null;
  }

  function handleDragOver(event) {
    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = "move";
    }
  }

  function handleDrop(event) {
    event.preventDefault();

    const toJourneyId = event.currentTarget.dataset.dropJourneyId;

    if (!draggedCareerKey || !toJourneyId || draggedFromJourneyId === toJourneyId) {
      return;
    }

    const state = window.DistribucionState.getState();
    const carrera = state.distribucion.find((item) => item.carreraKey === draggedCareerKey);

    if (!carrera) {
      return;
    }

    const confirmed = confirm(
      `¿Deseas mover "${carrera.carrera}" a otra jornada?`
    );

    if (!confirmed) {
      return;
    }

    window.DistribucionState.moveCarrera(
      draggedCareerKey,
      draggedFromJourneyId,
      toJourneyId
    );

    rerender();
  }

  function rerender() {
    const state = window.DistribucionState.getState();

    if (window.DistribucionBoard) {
      window.DistribucionBoard.render(state);
    }

    if (window.DistribucionTable) {
      window.DistribucionTable.render(state);
    }

    if (window.DistribucionLogic) {
      const balance = window.DistribucionLogic.calculateBalance(
        state.distribucion,
        state.jornadas
      );

      window.DistribucionDOM.setBalance(balance.message);
    }

    window.DistribucionDOM.setStatus("Distribución modificada manualmente.");
  }

  window.DistribucionDragDrop = {
    bind
  };
})();