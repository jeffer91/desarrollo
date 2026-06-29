/* =========================================================
Nombre completo: lb.state.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.state.js
Función o funciones:
1. Mantener el estado central de la pantalla Gen libro.
2. Guardar selección de carrera, materia, materia consolidada y progreso.
3. Exponer métodos seguros para leer y actualizar estado.
========================================================= */

(function attachLbState(window) {
  "use strict";

  var Constants = window.LibroGenLibroConstants || {};
  var STATUS = Constants.STATUS || {};

  var state = {
    status: STATUS.idle || "idle",
    carrera: "",
    materia: "",
    materiasDisponibles: [],
    materiaSeleccionada: null,
    planLibro: null,
    libroGenerado: null,
    ultimoWord: null,
    progreso: {
      stepId: "idle",
      label: "Esperando selección de materia",
      percent: 0
    },
    mensajes: [],
    error: null,
    creadoEn: new Date().toISOString(),
    actualizadoEn: new Date().toISOString()
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function touch() {
    state.actualizadoEn = new Date().toISOString();
  }

  function getState() {
    return clone(state);
  }

  function setStatus(status) {
    state.status = status || STATUS.idle || "idle";
    touch();
  }

  function setSelection(carrera, materia) {
    state.carrera = String(carrera || "").trim();
    state.materia = String(materia || "").trim();
    touch();
  }

  function setMateriasDisponibles(items) {
    state.materiasDisponibles = Array.isArray(items) ? clone(items) : [];
    touch();
  }

  function setMateriaSeleccionada(item) {
    state.materiaSeleccionada = item ? clone(item) : null;
    touch();
  }

  function setProgress(stepId, label, percent) {
    state.progreso = {
      stepId: stepId || "idle",
      label: label || "Esperando selección de materia",
      percent: Math.max(0, Math.min(100, Number(percent || 0)))
    };
    touch();
  }

  function setPlanLibro(plan) {
    state.planLibro = plan ? clone(plan) : null;
    touch();
  }

  function setLibroGenerado(libro) {
    state.libroGenerado = libro ? clone(libro) : null;
    touch();
  }

  function setUltimoWord(wordInfo) {
    state.ultimoWord = wordInfo ? clone(wordInfo) : null;
    touch();
  }

  function addMessage(type, message) {
    state.mensajes.push({
      type: type || "info",
      message: String(message || "").trim(),
      createdAt: new Date().toISOString()
    });
    state.mensajes = state.mensajes.slice(-20);
    touch();
  }

  function setError(error) {
    state.error = error ? {
      message: error.message || String(error),
      createdAt: new Date().toISOString()
    } : null;
    touch();
  }

  function resetGeneration() {
    state.planLibro = null;
    state.libroGenerado = null;
    state.ultimoWord = null;
    state.error = null;
    setProgress("idle", "Esperando generación", 0);
    touch();
  }

  window.LibroGenLibroState = {
    getState: getState,
    setStatus: setStatus,
    setSelection: setSelection,
    setMateriasDisponibles: setMateriasDisponibles,
    setMateriaSeleccionada: setMateriaSeleccionada,
    setProgress: setProgress,
    setPlanLibro: setPlanLibro,
    setLibroGenerado: setLibroGenerado,
    setUltimoWord: setUltimoWord,
    addMessage: addMessage,
    setError: setError,
    resetGeneration: resetGeneration
  };
})(window);
