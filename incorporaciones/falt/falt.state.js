/*
=========================================================
Nombre completo: falt.state.js
Ruta o ubicación: /incorporaciones/falt/falt.state.js

Función o funciones:
1. Administrar el estado general del módulo Faltantes.
2. Guardar período seleccionado, estudiantes del período y estudiantes seleccionados.
3. Guardar resultados del pop-up de búsqueda.
4. Persistir los estudiantes seleccionados hasta que el usuario presione Limpiar.
5. Notificar cambios a falt.app.js y falt.table.js.

Con qué se conecta:
- falt.config.js
- falt.search.js
- falt.app.js
- falt.table.js
- falt.message.js
- localStorage
=========================================================
*/

(function (window) {
  "use strict";

  var STORAGE_KEY = "itsqmet.incorporaciones.falt.seleccionados.v2";

  var state = {
    periodoId: "",
    periodoTexto: "",
    periodos: [],
    estudiantesPeriodo: [],
    seleccionados: [],
    visibles: [],
    filtros: {
      texto: "",
      estado: "todos",
      canal: "todos"
    },
    resultadosBusqueda: {
      totalConsultas: 0,
      encontrados: [],
      multiples: [],
      noEncontrados: []
    },
    seleccionadoId: "",
    cargando: false,
    mensaje: "",
    error: "",
    modalAbierto: false
  };

  var listeners = [];

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function notify() {
    var snapshot = obtener();

    listeners.forEach(function (listener) {
      try {
        listener(snapshot);
      } catch (error) {
        console.error("[falt-state] Error en listener:", error);
      }
    });
  }

  function obtener() {
    return clone(state);
  }

  function suscribir(listener) {
    if (typeof listener !== "function") return function () {};

    listeners.push(listener);

    return function unsubscribe() {
      listeners = listeners.filter(function (item) {
        return item !== listener;
      });
    };
  }

  function set(partial) {
    state = Object.assign({}, state, partial || {});
    notify();
  }

  function asText(value) {
    return String(value == null ? "" : value).trim();
  }

  function getCedula(row) {
    var meta = row && row._falt ? row._falt : {};
    return asText(
      meta.cedula ||
        row.cedula ||
        row.Cedula ||
        row.CEDULA ||
        row.numeroIdentificacion ||
        row.identificacion
    );
  }

  function cedulaKey(value) {
    var digits = asText(value).replace(/\D+/g, "");

    if (digits.length === 9) digits = "0" + digits;

    return digits || asText(value);
  }

  function getStorageKey(periodoId) {
    return STORAGE_KEY + "." + (asText(periodoId) || "sin_periodo");
  }

  function readSelected(periodoId) {
    try {
      var raw = window.localStorage.getItem(getStorageKey(periodoId));
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn("[falt-state] No se pudo leer selección guardada:", error);
      return [];
    }
  }

  function saveSelected(periodoId, list) {
    try {
      window.localStorage.setItem(
        getStorageKey(periodoId),
        JSON.stringify(Array.isArray(list) ? list : [])
      );
      return true;
    } catch (error) {
      console.warn("[falt-state] No se pudo guardar selección:", error);
      return false;
    }
  }

  function dedupe(list) {
    var seen = {};
    var result = [];

    (list || []).forEach(function (row) {
      var key = cedulaKey(getCedula(row));
      var meta = row && row._falt ? row._falt : {};

      if (!key) {
        key = asText(meta.id) || "row_" + result.length;
      }

      if (seen[key]) return;

      seen[key] = true;
      result.push(row);
    });

    return result;
  }

  function setPeriodos(periodos) {
    set({
      periodos: Array.isArray(periodos) ? periodos : []
    });
  }

  function setPeriodo(periodoId, periodoTexto) {
    var cleanId = asText(periodoId);
    var cleanText = asText(periodoTexto) || cleanId;

    state.periodoId = cleanId;
    state.periodoTexto = cleanText;
    state.estudiantesPeriodo = [];
    state.seleccionados = readSelected(cleanId);
    state.visibles = state.seleccionados;
    state.resultadosBusqueda = {
      totalConsultas: 0,
      encontrados: [],
      multiples: [],
      noEncontrados: []
    };
    state.seleccionadoId = "";
    state.error = "";

    notify();
  }

  function setEstudiantesPeriodo(rows) {
    set({
      estudiantesPeriodo: Array.isArray(rows) ? rows : []
    });
  }

  function setSeleccionados(rows, persistir) {
    var list = dedupe(Array.isArray(rows) ? rows : []);

    state.seleccionados = list;
    state.visibles = list;

    if (persistir !== false) {
      saveSelected(state.periodoId, list);
    }

    notify();
  }

  function agregarSeleccionados(rows) {
    var actuales = Array.isArray(state.seleccionados) ? state.seleccionados : [];
    var nuevos = Array.isArray(rows) ? rows : [];
    setSeleccionados(actuales.concat(nuevos), true);
  }

  function quitarSeleccionado(idOrCedula) {
    var key = cedulaKey(idOrCedula);

    var nuevos = (state.seleccionados || []).filter(function (row) {
      var rowKey = cedulaKey(getCedula(row));
      var meta = row && row._falt ? row._falt : {};
      var metaKey = cedulaKey(meta.id);

      return rowKey !== key && metaKey !== key;
    });

    setSeleccionados(nuevos, true);
  }

  function limpiarSeleccionados() {
    state.seleccionados = [];
    state.visibles = [];
    state.seleccionadoId = "";
    state.resultadosBusqueda = {
      totalConsultas: 0,
      encontrados: [],
      multiples: [],
      noEncontrados: []
    };

    try {
      window.localStorage.removeItem(getStorageKey(state.periodoId));
    } catch (error) {
      console.warn("[falt-state] No se pudo limpiar selección:", error);
    }

    notify();
  }

  function setFiltros(filtros) {
    state.filtros = Object.assign({}, state.filtros, filtros || {});
    notify();
  }

  function setVisibles(rows) {
    set({
      visibles: Array.isArray(rows) ? rows : []
    });
  }

  function setResultadosBusqueda(resultados) {
    set({
      resultadosBusqueda: resultados || {
        totalConsultas: 0,
        encontrados: [],
        multiples: [],
        noEncontrados: []
      }
    });
  }

  function setSeleccionadoId(id) {
    set({
      seleccionadoId: asText(id)
    });
  }

  function setCargando(value) {
    set({
      cargando: Boolean(value)
    });
  }

  function setMensaje(message) {
    set({
      mensaje: asText(message)
    });
  }

  function setError(message) {
    set({
      error: asText(message)
    });
  }

  function abrirModal() {
    set({
      modalAbierto: true
    });
  }

  function cerrarModal() {
    set({
      modalAbierto: false
    });
  }

  function reset() {
    state = {
      periodoId: "",
      periodoTexto: "",
      periodos: [],
      estudiantesPeriodo: [],
      seleccionados: [],
      visibles: [],
      filtros: {
        texto: "",
        estado: "todos",
        canal: "todos"
      },
      resultadosBusqueda: {
        totalConsultas: 0,
        encontrados: [],
        multiples: [],
        noEncontrados: []
      },
      seleccionadoId: "",
      cargando: false,
      mensaje: "",
      error: "",
      modalAbierto: false
    };

    notify();
  }

  window.FaltState = {
    obtener: obtener,
    suscribir: suscribir,
    set: set,
    setPeriodos: setPeriodos,
    setPeriodo: setPeriodo,
    setEstudiantesPeriodo: setEstudiantesPeriodo,
    setSeleccionados: setSeleccionados,
    agregarSeleccionados: agregarSeleccionados,
    quitarSeleccionado: quitarSeleccionado,
    limpiarSeleccionados: limpiarSeleccionados,
    setFiltros: setFiltros,
    setVisibles: setVisibles,
    setResultadosBusqueda: setResultadosBusqueda,
    setSeleccionadoId: setSeleccionadoId,
    setCargando: setCargando,
    setMensaje: setMensaje,
    setError: setError,
    abrirModal: abrirModal,
    cerrarModal: cerrarModal,
    reset: reset,
    readSelected: readSelected,
    saveSelected: saveSelected
  };
})(window);