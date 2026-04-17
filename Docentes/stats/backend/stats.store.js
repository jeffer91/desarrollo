/*
Nombre del archivo: stats.store.js
Ruta: stats/backend/stats.store.js
Función:
- Mantiene el estado global de la app
- Guarda datos crudos, normalizados y cruzados
- Guarda filtros activos incluyendo capacitación
- Expone getters, setters y suscripción segura
*/
(function attachStatsStore(window) {
  "use strict";

  window.STATS = window.STATS || {};

  var listeners = [];

  function clone(value) {
    if (value === undefined) return undefined;
    if (value === null) return null;
    return JSON.parse(JSON.stringify(value));
  }

  function getDefaultFilters() {
    if (
      window.STATS.Config &&
      typeof window.STATS.Config.getDefaultFilters === "function"
    ) {
      return clone(window.STATS.Config.getDefaultFilters());
    }

    return {
      carrera: "todos",
      periodo: "todos",
      capacitacion: "todos",
      sexo: "todos",
      texto: ""
    };
  }

  var initialState = {
    loading: false,
    error: "",
    viewMode: "detail",
    raw: {
      docentes: [],
      capacitaciones: []
    },
    normalized: {
      docentes: [],
      capacitaciones: []
    },
    crossed: {
      docentes: [],
      capacitaciones: [],
      asignaciones: [],
      inconsistencias: []
    },
    filters: getDefaultFilters(),
    derived: {
      filteredDocentes: [],
      filteredCapacitaciones: [],
      filteredAsignaciones: [],
      filteredInconsistencias: [],
      metrics: {},
      detail: null
    }
  };

  var state = clone(initialState);

  function notify() {
    var snapshot = getState();

    listeners.slice().forEach(function eachListener(listener) {
      try {
        listener(snapshot);
      } catch (error) {
        console.error("Error en listener de STATS.Store:", error);
      }
    });
  }

  function getState() {
    return clone(state);
  }

  function get(path) {
    var parts;
    var current;
    var index = 0;

    if (!path) return getState();

    parts = String(path).split(".");
    current = state;

    while (index < parts.length) {
      if (current == null) return undefined;
      current = current[parts[index]];
      index += 1;
    }

    return clone(current);
  }

  function set(path, value, silent) {
    var parts;
    var current;
    var index = 0;

    if (!path) return;

    parts = String(path).split(".");
    current = state;

    while (index < parts.length - 1) {
      if (!current[parts[index]] || typeof current[parts[index]] !== "object") {
        current[parts[index]] = {};
      }
      current = current[parts[index]];
      index += 1;
    }

    current[parts[parts.length - 1]] = clone(value);

    if (!silent) {
      notify();
    }
  }

  function merge(path, partial, silent) {
    var current = get(path);
    var safeCurrent = current && typeof current === "object" ? current : {};
    var safePartial = partial && typeof partial === "object" ? partial : {};

    set(path, Object.assign({}, safeCurrent, safePartial), silent);
  }

  function resetFilters(silent) {
    state.filters = getDefaultFilters();
    if (!silent) notify();
  }

  function setFilter(key, value, silent) {
    if (!key) return;
    state.filters[key] = clone(value);
    if (!silent) notify();
  }

  function setFilters(partial, silent) {
    var safePartial = partial && typeof partial === "object" ? partial : {};
    state.filters = Object.assign({}, state.filters, clone(safePartial));
    if (!silent) notify();
  }

  function clearError(silent) {
    state.error = "";
    if (!silent) notify();
  }

  function setError(message, silent) {
    state.error = message || "";
    if (!silent) notify();
  }

  function setLoading(value, silent) {
    state.loading = !!value;
    if (!silent) notify();
  }

  function setViewMode(mode, silent) {
    state.viewMode = mode || "detail";
    if (!silent) notify();
  }

  function resetData(silent) {
    state.raw = clone(initialState.raw);
    state.normalized = clone(initialState.normalized);
    state.crossed = clone(initialState.crossed);
    state.derived = clone(initialState.derived);
    if (!silent) notify();
  }

  function resetAll(silent) {
    state = clone(initialState);
    state.filters = getDefaultFilters();
    if (!silent) notify();
  }

  function subscribe(listener) {
    if (typeof listener !== "function") {
      return function unsubscribeNoop() {};
    }

    listeners.push(listener);

    return function unsubscribe() {
      listeners = listeners.filter(function eachItem(item) {
        return item !== listener;
      });
    };
  }

  window.STATS.Store = {
    getState: getState,
    get: get,
    set: set,
    merge: merge,
    resetFilters: resetFilters,
    setFilter: setFilter,
    setFilters: setFilters,
    clearError: clearError,
    setError: setError,
    setLoading: setLoading,
    setViewMode: setViewMode,
    resetData: resetData,
    resetAll: resetAll,
    subscribe: subscribe,
    notify: notify
  };
})(window);