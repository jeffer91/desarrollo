/*
=========================================================
Nombre completo: distribucion.app.js
Ruta o ubicación: /incorporaciones/sedes/distribucion/distribucion.app.js
Función o funciones:
- Inicializar la pantalla Distribución.
- Cargar períodos existentes.
- Cargar estudiantes aprobados por carrera.
- Crear jornadas manualmente con fecha y hora.
- Generar distribución automática.
- Guardar distribución como Borrador o Finalizada.
Con qué se une:
- distribucion.index.html
- distribucion.state.js
- distribucion.dom.js
- distribucion.repo.js
- distribucion.periodos.js
- distribucion.aprobados.js
- distribucion.coordi.js
- distribucion.logic.js
- distribucion.dragdrop.js
- distribucion.board.js
- distribucion.table.js
- distribucion.validate.js
- distribucion.alerts.js
- distribucion.export.js
=========================================================
*/

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bindEvents();
    await loadPeriodos();
    renderAll();
  }

  function bindEvents() {
    const elements = window.DistribucionDOM.getElements();

    if (elements.btnLoadPeriod) {
      elements.btnLoadPeriod.addEventListener("click", handleLoadPeriod);
    }

    if (elements.btnAddJourney) {
      elements.btnAddJourney.addEventListener("click", handleAddJourney);
    }

    if (elements.btnAutoDistribute) {
      elements.btnAutoDistribute.addEventListener("click", handleAutoDistribute);
    }

    if (elements.btnRedistribute) {
      elements.btnRedistribute.addEventListener("click", handleRedistribute);
    }

    if (elements.btnSaveDraft) {
      elements.btnSaveDraft.addEventListener("click", () => handleSave("borrador"));
    }

    if (elements.btnFinalize) {
      elements.btnFinalize.addEventListener("click", () => handleSave("finalizada"));
    }

    if (elements.btnExportDistribution) {
      elements.btnExportDistribution.addEventListener("click", handleExport);
    }
  }

  async function loadPeriodos() {
    const elements = window.DistribucionDOM.getElements();

    try {
      const periodos = await window.DistribucionPeriodos.loadPeriodos();

      window.DistribucionState.setPeriodos(periodos);

      if (!elements.periodSelect) {
        return;
      }

      if (periodos.length === 0) {
        elements.periodSelect.innerHTML = `
          <option value="">No se encontraron períodos</option>
        `;
        return;
      }

      elements.periodSelect.innerHTML = `
        <option value="">Selecciona un período</option>
        ${periodos
          .map((periodo) => {
            return window.DistribucionDOM.option(periodo.id, periodo.nombre, "");
          })
          .join("")}
      `;
    } catch (error) {
      console.error(error);

      if (elements.periodSelect) {
        elements.periodSelect.innerHTML = `
          <option value="">Error al cargar períodos</option>
        `;
      }
    }
  }

  async function handleLoadPeriod() {
    const elements = window.DistribucionDOM.getElements();
    const periodoId = elements.periodSelect ? elements.periodSelect.value : "";

    if (!periodoId) {
      alert("Selecciona un período antes de continuar.");
      return;
    }

    const selectedOption = elements.periodSelect.options[elements.periodSelect.selectedIndex];
    const periodoNombre = selectedOption ? selectedOption.textContent : periodoId;

    window.DistribucionState.setPeriodo(periodoId, periodoNombre);
    window.DistribucionDOM.setStatus("Cargando datos del período...");

    const savedDistribution = await window.DistribucionRepo.findByPeriodo(periodoId);

    if (savedDistribution) {
      window.DistribucionState.loadDistribution(savedDistribution);
      window.DistribucionDOM.setStatus(`Distribución cargada: ${savedDistribution.estado}`);
    }

    const aprobados = await window.DistribucionAprobados.loadAprobadosPorCarrera(periodoId);
    const coordiRows = window.DistribucionCoordi
      ? await window.DistribucionCoordi.loadCoordi()
      : [];

    window.DistribucionState.setAprobados(aprobados);
    window.DistribucionState.setCoordiRows(coordiRows);

    renderAll();

    if (aprobados.length === 0) {
      window.DistribucionDOM.setStatus("No se encontraron aprobados para este período.");
      return;
    }

    window.DistribucionDOM.setStatus("Período cargado correctamente.");
  }

  function handleAddJourney() {
    const elements = window.DistribucionDOM.getElements();
    const fecha = elements.journeyDate ? elements.journeyDate.value : "";
    const hora = elements.journeyTime ? elements.journeyTime.value : "";

    if (!fecha || !hora) {
      alert("Ingresa fecha y hora para agregar la jornada.");
      return;
    }

    window.DistribucionState.addJornada(fecha, hora);

    if (elements.journeyDate) {
      elements.journeyDate.value = "";
    }

    if (elements.journeyTime) {
      elements.journeyTime.value = "";
    }

    renderAll();
  }

  function handleAutoDistribute() {
    const state = window.DistribucionState.getState();

    if (!window.DistribucionValidate.validateCanDistribute(state)) {
      return;
    }

    const result = window.DistribucionLogic.generateDistribution({
      carreras: state.aprobadosPorCarrera,
      jornadas: state.jornadas,
      coordiRows: state.coordiRows,
      cambiosManuales: []
    });

    window.DistribucionState.setDistribucion(result.distribucion);
    window.DistribucionState.setAlerts(result.alerts || []);
    window.DistribucionDOM.setStatus("Distribución automática generada.");
    renderAll();
  }

  function handleRedistribute() {
    const state = window.DistribucionState.getState();

    if (!window.DistribucionValidate.validateCanDistribute(state)) {
      return;
    }

    const result = window.DistribucionLogic.generateDistribution({
      carreras: state.aprobadosPorCarrera,
      jornadas: state.jornadas,
      coordiRows: state.coordiRows,
      cambiosManuales: state.cambiosManuales
    });

    window.DistribucionState.setDistribucion(result.distribucion);
    window.DistribucionState.setAlerts(result.alerts || []);
    window.DistribucionDOM.setStatus("Redistribución generada respetando cambios manuales.");
    renderAll();
  }

  async function handleSave(estado) {
    const state = window.DistribucionState.getState();

    if (state.estado === "finalizada") {
      const confirmed = confirm(
        "Esta distribución ya está finalizada. ¿Deseas editarla y guardar cambios?"
      );

      if (!confirmed) {
        return;
      }
    }

    const validation = window.DistribucionValidate.validateForSave(state);

    if (!validation.valid) {
      window.DistribucionAlerts.show(validation.errors);
      return;
    }

    window.DistribucionState.setEstado(estado);

    const updatedState = window.DistribucionState.getState();
    const payload = await window.DistribucionRepo.saveDistribution(updatedState, estado);

    window.DistribucionState.markSaved(payload.id);
    window.DistribucionDOM.setStatus(
      estado === "finalizada"
        ? "Distribución finalizada y guardada."
        : "Borrador guardado correctamente."
    );

    renderAll();
  }

  function handleExport() {
    if (!window.DistribucionExport) {
      alert("La exportación se activará cuando se agregue distribucion.export.js.");
      return;
    }

    window.DistribucionExport.download(window.DistribucionState.getState());
  }

  function renderAll() {
    const state = window.DistribucionState.getState();

    renderApprovedList(state);
    renderJourneyList(state);

    if (window.DistribucionAlerts) {
      window.DistribucionAlerts.show(state.alerts);
    }

    if (window.DistribucionBoard) {
      window.DistribucionBoard.render(state);
    }

    if (window.DistribucionTable) {
      window.DistribucionTable.render(state);
    }

    if (window.DistribucionLogic) {
      const balance = window.DistribucionLogic.calculateBalance(state.distribucion, state.jornadas);
      window.DistribucionDOM.setBalance(balance.message);
    }
  }

  function renderApprovedList(state) {
    const elements = window.DistribucionDOM.getElements();

    if (!elements.approvedList) {
      return;
    }

    if (!state.aprobadosPorCarrera || state.aprobadosPorCarrera.length === 0) {
      elements.approvedList.innerHTML = "Selecciona un período para cargar datos.";
      return;
    }

    elements.approvedList.innerHTML = state.aprobadosPorCarrera
      .map((item) => {
        return `
          <div class="approved-item">
            <strong>${window.DistribucionDOM.escapeHtml(item.carrera)}</strong>
            <span>${item.total}</span>
          </div>
        `;
      })
      .join("");
  }

  function renderJourneyList(state) {
    const elements = window.DistribucionDOM.getElements();

    if (!elements.journeyList) {
      return;
    }

    if (!state.jornadas || state.jornadas.length === 0) {
      elements.journeyList.innerHTML = "";
      return;
    }

    elements.journeyList.innerHTML = state.jornadas
      .map((jornada, index) => {
        return `
          <div class="journey-item">
            <div>
              <strong>Jornada ${index + 1}</strong>
              <span>${window.DistribucionState.formatDate(jornada.fecha)} - ${window.DistribucionState.formatTime(jornada.hora)}</span>
            </div>
            <button
              type="button"
              class="btn btn-light"
              data-remove-journey="${jornada.id}"
            >
              Quitar
            </button>
          </div>
        `;
      })
      .join("");

    elements.journeyList.querySelectorAll("[data-remove-journey]").forEach((button) => {
      button.addEventListener("click", () => {
        const confirmed = confirm("¿Deseas quitar esta jornada?");

        if (!confirmed) {
          return;
        }

        window.DistribucionState.removeJornada(button.dataset.removeJourney);
        renderAll();
      });
    });
  }
})();