/* =========================================================
Nombre del archivo: menu.router.js
Ruta o ubicación: /Curriculo/menu/menu.router.js
Función o funciones:
- Maneja la navegación por hash del menú Currículo
- Permite leer, cambiar y normalizar la opción activa
- Mantiene la URL sincronizada con Carrera y Materias
- Da soporte a navegación estable en navegador y archivo local
========================================================= */

(function attachCurriculoMenuRouter(window) {
  "use strict";

  var onChangeHandler = null;

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
    if (!match || !match[1]) return "";
    return normalizeId(match[1]);
  }

  function notify() {
    if (typeof onChangeHandler === "function") {
      onChangeHandler(getCurrentId());
    }
  }

  function go(id) {
    var nextHash = buildHash(id);
    if (window.location.hash === nextHash) {
      notify();
      return;
    }
    window.location.hash = nextHash;
  }

  function init(handler) {
    onChangeHandler = typeof handler === "function" ? handler : null;
    window.addEventListener("hashchange", notify);
    notify();
  }

  window.CurriculoMenuRouter = {
    init: init,
    go: go,
    getCurrentId: getCurrentId,
    normalizeId: normalizeId
  };
})(window);