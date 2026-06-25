/* =========================================================
Nombre completo: menu.router.js
Ruta o ubicación: /menu/menu.router.js
Función o funciones:
- Manejar la navegación por hash del menú Currículo
- Permitir leer, cambiar y normalizar la opción activa
- Mantener la URL sincronizada con el módulo seleccionado
- Recordar la última opción activa dentro de la sesión
========================================================= */
(function attachCurriculoMenuRouter(window) {
  "use strict";

  var onChangeHandler = null;
  var STORAGE_KEY = "curriculo_menu_last_id";

  function normalizeId(value) {
    return String(value == null ? "" : value)
      .trim()
      .toLowerCase()
      .replace(/^#/, "")
      .replace(/^\/+/, "")
      .replace(/^modulo\//i, "")
      .replace(/\s+/g, "-");
  }

  function buildHash(id) {
    return "#/modulo/" + normalizeId(id);
  }

  function getCurrentId() {
    var hash = String(window.location.hash || "");
    var match = hash.match(/^#\/modulo\/(.+)$/i);

    if (match && match[1]) {
      return normalizeId(match[1]);
    }

    return "";
  }

  function saveLastId(id) {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, normalizeId(id));
    } catch (error) {
      return;
    }
  }

  function getLastId() {
    try {
      return normalizeId(window.sessionStorage.getItem(STORAGE_KEY));
    } catch (error) {
      return "";
    }
  }

  function emitChange() {
    if (typeof onChangeHandler !== "function") {
      return;
    }

    var id = getCurrentId();
    saveLastId(id);
    onChangeHandler(id);
  }

  function go(id, options) {
    var nextHash = buildHash(id);
    var currentHash = String(window.location.hash || "");

    saveLastId(id);

    if (currentHash === nextHash) {
      emitChange();
      return;
    }

    if (options && options.replace) {
      var url = window.location.pathname + window.location.search + nextHash;
      window.history.replaceState(null, "", url);
      emitChange();
      return;
    }

    window.location.hash = nextHash;
  }

  function init(callback) {
    onChangeHandler = callback;
    window.addEventListener("hashchange", emitChange);
  }

  window.CurriculoMenuRouter = {
    init: init,
    go: go,
    getCurrentId: getCurrentId,
    normalizeId: normalizeId,
    buildHash: buildHash,
    getLastId: getLastId
  };
})(window);
