/*
=========================================================
Nombre completo: inc-menu.memory.js
Ruta o ubicación: /incorporaciones/menu/inc-menu.memory.js

Función o funciones:
1. Guardar la última pantalla usada dentro del módulo Incorporaciones.
2. Recuperar automáticamente la última pantalla abierta.
3. Validar que la pantalla recordada todavía exista en el catálogo de rutas.
4. Usar Distribución como respaldo cuando no exista memoria válida.

Con qué se une:
- /incorporaciones/index.html
- /incorporaciones/menu/inc-menu.routes.js
- /incorporaciones/menu/inc-menu.app.js
- localStorage del navegador
=========================================================
*/

(function attachIncMenuMemory(window) {
  "use strict";

  var STORAGE_KEY = "itsqmet_incorporaciones_menu_memoria_v1";
  var LAST_ROUTE_KEY = "itsqmet_incorporaciones_ultima_pantalla_v1";

  function nowIso() {
    return new Date().toISOString();
  }

  function safeJsonParse(text, fallback) {
    try {
      return JSON.parse(text);
    } catch (error) {
      return fallback;
    }
  }

  function canUseLocalStorage() {
    try {
      var testKey = "__inc_menu_test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  function normalizeRouteId(routeId) {
    return String(routeId || "").trim();
  }

  function isValidRoute(routeId, validIds) {
    var normalizedId = normalizeRouteId(routeId);

    if (!normalizedId) {
      return false;
    }

    if (!Array.isArray(validIds) || validIds.length === 0) {
      return true;
    }

    return validIds.indexOf(normalizedId) >= 0;
  }

  function readMemory() {
    if (!canUseLocalStorage()) {
      return null;
    }

    var raw = window.localStorage.getItem(STORAGE_KEY);
    var parsed = safeJsonParse(raw, null);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed;
  }

  function saveRoute(routeId, routeInfo) {
    var normalizedId = normalizeRouteId(routeId);

    if (!normalizedId || !canUseLocalStorage()) {
      return false;
    }

    var payload = {
      routeId: normalizedId,
      label: routeInfo && routeInfo.label ? String(routeInfo.label) : normalizedId,
      path: routeInfo && routeInfo.path ? String(routeInfo.path) : "",
      parentId: routeInfo && routeInfo.parentId ? String(routeInfo.parentId) : "",
      parentLabel: routeInfo && routeInfo.parentLabel ? String(routeInfo.parentLabel) : "",
      savedAt: nowIso()
    };

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    window.localStorage.setItem(LAST_ROUTE_KEY, normalizedId);

    return true;
  }

  function getLastRouteId(validIds, fallbackId) {
    var fallback = normalizeRouteId(fallbackId);
    var memory = readMemory();

    if (memory && isValidRoute(memory.routeId, validIds)) {
      return normalizeRouteId(memory.routeId);
    }

    if (canUseLocalStorage()) {
      var simpleLast = window.localStorage.getItem(LAST_ROUTE_KEY);

      if (isValidRoute(simpleLast, validIds)) {
        return normalizeRouteId(simpleLast);
      }
    }

    return fallback;
  }

  function clearMemory() {
    if (!canUseLocalStorage()) {
      return false;
    }

    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LAST_ROUTE_KEY);

    return true;
  }

  function getDebugInfo() {
    return {
      storageKey: STORAGE_KEY,
      lastRouteKey: LAST_ROUTE_KEY,
      localStorageAvailable: canUseLocalStorage(),
      memory: readMemory()
    };
  }

  window.IncMenuMemory = {
    saveRoute: saveRoute,
    getLastRouteId: getLastRouteId,
    clearMemory: clearMemory,
    readMemory: readMemory,
    getDebugInfo: getDebugInfo
  };
})(window);