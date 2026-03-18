/*
=========================================================
Nombre del archivo: app.router.js
Ruta o ubicación: /desarrollo/app/app.router.js
Función o funciones:
- Maneja la navegación por hash del shell principal
- Permite abrir módulos sin recargar toda la pantalla
- Expone funciones para leer y cambiar el módulo actual
=========================================================
*/
(function attachAppRouter(window) {
  "use strict";

  window.DESARROLLO = window.DESARROLLO || {};

  var routeChangeHandler = null;

  function normalizeModuleId(value) {
    return String(value == null ? "" : value)
      .trim()
      .replace(/^#/, "")
      .replace(/^\/+/, "")
      .replace(/^modulo\//i, "")
      .replace(/\s+/g, "-")
      .toLowerCase();
  }

  function buildHash(moduleId) {
    return "#/modulo/" + normalizeModuleId(moduleId);
  }

  function getCurrentId() {
    var hash = String(window.location.hash || "");
    var match = hash.match(/^#\/modulo\/(.+)$/i);
    if (!match || !match[1]) return "";
    return normalizeModuleId(match[1]);
  }

  function notify() {
    if (typeof routeChangeHandler === "function") {
      routeChangeHandler(getCurrentId());
    }
  }

  function goTo(moduleId) {
    var nextHash = buildHash(moduleId);
    if (window.location.hash === nextHash) {
      notify();
      return;
    }
    window.location.hash = nextHash;
  }

  function init(onChange) {
    routeChangeHandler = typeof onChange === "function" ? onChange : null;
    window.addEventListener("hashchange", notify);
    notify();
  }

  window.DESARROLLO.Router = {
    init: init,
    goTo: goTo,
    getCurrentId: getCurrentId
  };
})(window);