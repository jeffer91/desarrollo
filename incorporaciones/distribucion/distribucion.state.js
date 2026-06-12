/*
=========================================================
Nombre completo: distribucion.state.js
Ruta o ubicación: /incorporaciones/sedes/distribucion/distribucion.state.js
Función o funciones:
- Mantener el estado de la pantalla Distribución.
- Guardar período seleccionado, carreras aprobadas, jornadas y distribución.
- Controlar estado Borrador o Finalizada.
- Registrar cambios manuales realizados por arrastre.
Con qué se une:
- distribucion.app.js
- distribucion.logic.js
- distribucion.dragdrop.js
- distribucion.board.js
- distribucion.table.js
- distribucion.repo.js
=========================================================
*/

(function () {
  "use strict";

  const INITIAL_STATE = {
    periodoId: "",
    periodoNombre: "",
    periodos: [],
    aprobadosPorCarrera: [],
    coordiRows: [],
    jornadas: [],
    distribucion: [],
    estado: "borrador",
    cambiosManuales: [],
    alerts: [],
    dirty: false,
    loadedDistributionId: null
  };

  let state = clone(INITIAL_STATE);

  function clone(value) {
    try {
      return structuredClone(value);
    } catch (error) {
      return JSON.parse(JSON.stringify(value));
    }
  }

  function createId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function getState() {
    return clone(state);
  }

  function setPeriodos(periodos) {
    state.periodos = Array.isArray(periodos) ? clone(periodos) : [];
  }

  function setPeriodo(periodoId, periodoNombre) {
    state.periodoId = String(periodoId || "");
    state.periodoNombre = String(periodoNombre || "");
    state.dirty = true;
  }

  function setAprobados(rows) {
    state.aprobadosPorCarrera = Array.isArray(rows) ? clone(rows) : [];
  }

  function setCoordiRows(rows) {
    state.coordiRows = Array.isArray(rows) ? clone(rows) : [];
  }

  function addJornada(fecha, hora) {
    const jornada = {
      id: createId("jornada"),
      fecha: String(fecha || ""),
      hora: String(hora || ""),
      nombre: buildJourneyName(fecha, hora),
      orden: state.jornadas.length + 1
    };

    state.jornadas.push(jornada);
    state.dirty = true;

    return clone(jornada);
  }

  function removeJornada(jornadaId) {
    state.jornadas = state.jornadas.filter((jornada) => jornada.id !== jornadaId);
    state.distribucion = state.distribucion.filter((item) => item.jornadaId !== jornadaId);
    state.dirty = true;
  }

  function setJornadas(jornadas) {
    state.jornadas = Array.isArray(jornadas) ? clone(jornadas) : [];
    state.dirty = true;
  }

  function setDistribucion(distribucion) {
    state.distribucion = Array.isArray(distribucion) ? clone(distribucion) : [];
    state.dirty = true;
  }

  function moveCarrera(carreraKey, fromJornadaId, toJornadaId) {
    const item = state.distribucion.find((row) => row.carreraKey === carreraKey);

    if (!item) {
      return null;
    }

    item.jornadaId = toJornadaId;
    item.updatedAt = new Date().toISOString();

    state.cambiosManuales.push({
      id: createId("manual"),
      carreraKey,
      fromJornadaId,
      toJornadaId,
      at: new Date().toISOString()
    });

    state.dirty = true;

    return clone(item);
  }

  function setEstado(estado) {
    state.estado = estado === "finalizada" ? "finalizada" : "borrador";
    state.dirty = true;
  }

  function setAlerts(alerts) {
    state.alerts = Array.isArray(alerts) ? clone(alerts) : [];
  }

  function markSaved(distributionId) {
    state.dirty = false;

    if (distributionId) {
      state.loadedDistributionId = distributionId;
    }
  }

  function loadDistribution(payload) {
    state.periodoId = payload.periodoId || "";
    state.periodoNombre = payload.periodoNombre || "";
    state.jornadas = Array.isArray(payload.jornadas) ? clone(payload.jornadas) : [];
    state.distribucion = Array.isArray(payload.distribucion) ? clone(payload.distribucion) : [];
    state.estado = payload.estado || "borrador";
    state.cambiosManuales = Array.isArray(payload.cambiosManuales)
      ? clone(payload.cambiosManuales)
      : [];
    state.loadedDistributionId = payload.id || null;
    state.dirty = false;
  }

  function buildJourneyName(fecha, hora) {
    const dateText = String(fecha || "").trim();
    const timeText = String(hora || "").trim();

    if (!dateText && !timeText) {
      return `Jornada ${state.jornadas.length + 1}`;
    }

    return `${formatDate(dateText)} ${formatTime(timeText)}`.trim();
  }

  function formatDate(value) {
    if (!value) {
      return "";
    }

    const parts = value.split("-");

    if (parts.length !== 3) {
      return value;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  function formatTime(value) {
    if (!value) {
      return "";
    }

    return value.replace(":", "h");
  }

  window.DistribucionState = {
    getState,
    setPeriodos,
    setPeriodo,
    setAprobados,
    setCoordiRows,
    addJornada,
    removeJornada,
    setJornadas,
    setDistribucion,
    moveCarrera,
    setEstado,
    setAlerts,
    markSaved,
    loadDistribution,
    createId,
    formatDate,
    formatTime
  };
})();