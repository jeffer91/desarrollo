/* =========================================================
Nombre completo: lb.error-handler.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.error-handler.js
Función o funciones:
1. Capturar errores controlados y no controlados durante la generación.
2. Mostrar mensajes simples al usuario sin exponer detalles técnicos innecesarios.
3. Guardar el error en el estado central para diagnóstico posterior.
========================================================= */

(function attachLbErrorHandler(window) {
  "use strict";

  function getState() {
    return window.LibroGenLibroState || null;
  }

  function getUI() {
    return window.LibroGenLibroUI || null;
  }

  function getProgress() {
    return window.LibroGenLibroProgress || null;
  }

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalize(error, context) {
    var message = error && error.message ? error.message : text(error) || "Error desconocido.";

    return {
      message: message,
      userMessage: "No se pudo completar la generación. Revisa la información y vuelve a intentar.",
      context: context || "gen-libro",
      stack: error && error.stack ? error.stack : "",
      createdAt: new Date().toISOString()
    };
  }

  function handle(error, context) {
    var normalized = normalize(error, context);
    var State = getState();
    var UI = getUI();
    var Progress = getProgress();

    if (State && typeof State.setError === "function") {
      State.setError(normalized);
    }

    if (State && typeof State.addMessage === "function") {
      State.addMessage("error", normalized.userMessage + " Detalle: " + normalized.message);
    }

    if (UI && typeof UI.setMessage === "function") {
      UI.setMessage("is-error", normalized.userMessage);
    }

    if (UI && typeof UI.setStatus === "function") {
      UI.setStatus("Error en generación");
    }

    if (Progress && typeof Progress.render === "function") {
      Progress.render("error", "Error en generación", 0);
    }

    try {
      window.localStorage.setItem("libro.genLibro.lastError", JSON.stringify(normalized));
    } catch (_error) {}

    return normalized;
  }

  async function safeAsync(task, context) {
    try {
      return await task();
    } catch (error) {
      handle(error, context);
      return null;
    }
  }

  function installGlobalHandlers() {
    window.addEventListener("error", function onWindowError(event) {
      handle(event.error || event.message, "window.error");
    });

    window.addEventListener("unhandledrejection", function onUnhandledRejection(event) {
      handle(event.reason || "Promesa rechazada sin detalle.", "window.unhandledrejection");
    });
  }

  installGlobalHandlers();

  window.LibroGenLibroErrorHandler = {
    handle: handle,
    normalize: normalize,
    safeAsync: safeAsync
  };
})(window);
