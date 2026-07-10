/* =========================================================
Nombre completo: scan.state.js
Ruta o ubicación: /audit/scan/scan.state.js
Función o funciones:
- Administrar el estado visual y operativo de SCAN.
- Mantener archivo seleccionado, progreso, resultados, filtros y mensajes.
- Exponer una API pública sin depender del menú ni de BL.
========================================================= */

(function attachScanState(window) {
  "use strict";

  window.AuditScan = window.AuditScan || {};

  var listeners = [];

  function initialState() {
    return {
      file: null,
      status: "idle",
      statusMessage: "Seleccione un archivo ZIP para comenzar.",
      progress: 0,
      progressLabel: "Sin iniciar",
      entries: [],
      summary: {
        files: 0,
        folders: 0,
        totalSize: 0,
        alerts: 0
      },
      filters: {
        search: "",
        type: "all"
      },
      error: ""
    };
  }

  var state = initialState();

  function snapshot() {
    return {
      file: state.file,
      status: state.status,
      statusMessage: state.statusMessage,
      progress: state.progress,
      progressLabel: state.progressLabel,
      entries: state.entries.slice(),
      summary: Object.assign({}, state.summary),
      filters: Object.assign({}, state.filters),
      error: state.error
    };
  }

  function notify() {
    var copy = snapshot();
    listeners.slice().forEach(function callListener(listener) {
      try {
        listener(copy);
      } catch (error) {
        console.error("Error en suscriptor de SCAN.", error);
      }
    });
  }

  function patch(partial) {
    partial = partial || {};

    if (Object.prototype.hasOwnProperty.call(partial, "summary")) {
      state.summary = Object.assign({}, state.summary, partial.summary || {});
    }

    if (Object.prototype.hasOwnProperty.call(partial, "filters")) {
      state.filters = Object.assign({}, state.filters, partial.filters || {});
    }

    Object.keys(partial).forEach(function assignKey(key) {
      if (key === "summary" || key === "filters") return;
      state[key] = partial[key];
    });

    state.progress = Math.max(0, Math.min(100, Number(state.progress) || 0));
    notify();
    return snapshot();
  }

  function reset() {
    state = initialState();
    notify();
    return snapshot();
  }

  function subscribe(listener) {
    if (typeof listener !== "function") return function noop() {};
    listeners.push(listener);
    listener(snapshot());

    return function unsubscribe() {
      listeners = listeners.filter(function keep(item) {
        return item !== listener;
      });
    };
  }

  window.AuditScan.State = {
    get: snapshot,
    patch: patch,
    reset: reset,
    subscribe: subscribe
  };
})(window);
