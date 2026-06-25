/* =========================================================
Nombre completo: menu.router.js
Ruta o ubicación: /Curriculo/menu/menu.router.js
Función o funciones:
- Manejar la navegación por hash del menú Currículo
- Normalizar ids de módulos
- Recordar la última pantalla en localStorage
- Mantener la URL sincronizada sin recargar la app completa
========================================================= */
(function attachCurriculoMenuRouter(window) {
  "use strict";

  var onChangeHandler = null;

  function getConfig() {
    return window.CurriculoMenuConfig || {};
  }

  function getStorageKey() {
    return String(getConfig().storageKey || "curriculo_menu_last_id");
  }

  function normalizeId(value) {
    return String(value == null ? "" : value)
      .trim()
      .toLowerCase()
      .replace(/^#/, "")
      .replace(/^\/+/, "")
      .replace(/^modulo\//i, "")
      .replace(/^curriculo\//i, "")
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
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
    var normalized = normalizeId(id);
    if (!normalized) return;

    try {
      window.localStorage.setItem(getStorageKey(), normalized);
    } catch (error) {
      try {
        window.sessionStorage.setItem(getStorageKey(), normalized);
      } catch (fallbackError) {
        return;
      }
    }
  }

  function getLastId() {
    var value = "";

    try {
      value = normalizeId(window.localStorage.getItem(getStorageKey()));
    } catch (error) {
      value = "";
    }

    if (value) return value;

    try {
      return normalizeId(window.sessionStorage.getItem(getStorageKey()));
    } catch (fallbackError) {
      return "";
    }
  }

  function emitChange() {
    var id = getCurrentId();

    if (id) {
      saveLastId(id);
    }

    if (typeof onChangeHandler === "function") {
      onChangeHandler(id);
    }
  }

  function go(id, options) {
    var normalized = normalizeId(id);
    var nextHash;
    var currentHash = String(window.location.hash || "");
    var url;

    if (!normalized) return;

    nextHash = buildHash(normalized);
    saveLastId(normalized);

    if (currentHash === nextHash) {
      emitChange();
      return;
    }

    if (options && options.replace) {
      url = window.location.pathname + window.location.search + nextHash;
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
    getLastId: getLastId,
    saveLastId: saveLastId
  };
})(window);
