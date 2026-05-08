/* =========================================================
Nombre completo: titulacion-bus.js
Ruta: /Titulacion/frontend/js/core/titulacion-bus.js
Función o funciones:
- Crear un bus simple de eventos internos para el módulo Titulación.
- Permitir comunicación entre core, anexos, importación, exportación y PDF.
- Evitar dependencias directas innecesarias entre archivos.
========================================================= */

(function (window) {
  "use strict";

  var events = {};

  function asText(value) {
    return String(value === null || value === undefined ? "" : value).trim();
  }

  function on(eventName, handler) {
    var name = asText(eventName);

    if (!name || typeof handler !== "function") {
      return function () {};
    }

    events[name] = events[name] || [];
    events[name].push(handler);

    return function () {
      off(name, handler);
    };
  }

  function once(eventName, handler) {
    if (typeof handler !== "function") {
      return function () {};
    }

    var unsubscribe = on(eventName, function (payload) {
      unsubscribe();
      handler(payload);
    });

    return unsubscribe;
  }

  function off(eventName, handler) {
    var name = asText(eventName);

    if (!name || !events[name]) {
      return;
    }

    events[name] = events[name].filter(function (fn) {
      return fn !== handler;
    });

    if (events[name].length === 0) {
      delete events[name];
    }
  }

  function emit(eventName, payload) {
    var name = asText(eventName);

    if (!name || !events[name]) {
      return [];
    }

    return events[name].slice().map(function (handler) {
      try {
        return {
          ok: true,
          value: handler(payload)
        };
      } catch (error) {
        console.error("[TITULACION_BUS]", name, error);

        return {
          ok: false,
          error: error && error.message ? error.message : String(error)
        };
      }
    });
  }

  function clear(eventName) {
    var name = asText(eventName);

    if (name) {
      delete events[name];
      return;
    }

    events = {};
  }

  function getEvents() {
    return Object.keys(events);
  }

  window.TITULACION_BUS = {
    on: on,
    once: once,
    off: off,
    emit: emit,
    clear: clear,
    getEvents: getEvents
  };
})(window);