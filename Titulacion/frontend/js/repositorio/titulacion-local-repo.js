/* =========================================================
Nombre completo: titulacion-local-repo.js
Ruta: /Titulacion/frontend/js/repositorio/titulacion-local-repo.js
Función o funciones:
- Centralizar el almacenamiento local del módulo Titulación.
- Guardar y leer documento actual, período, filas importadas y preferencias.
- Evitar que cada módulo escriba directamente en localStorage.
- Mantener compatibilidad con doble click, Live Server y Electron.
========================================================= */

(function (window) {
  "use strict";

  var PREFIX = "titulacion.repo.";

  function U() {
    return window.TITULACION_UTILS || {};
  }

  function asText(value) {
    return U().asText ? U().asText(value) : String(value == null ? "" : value).trim();
  }

  function read(key, fallback) {
    var fullKey = PREFIX + asText(key);

    if (U().readStorage) {
      return U().readStorage(fullKey, fallback);
    }

    try {
      var raw = window.localStorage.getItem(fullKey);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function write(key, value) {
    var fullKey = PREFIX + asText(key);

    if (U().writeStorage) {
      return U().writeStorage(fullKey, value);
    }

    try {
      window.localStorage.setItem(fullKey, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function remove(key) {
    var fullKey = PREFIX + asText(key);

    try {
      window.localStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  function saveDocument(documentData) {
    return write("documento.actual", {
      data: documentData || {},
      updatedAt: new Date().toISOString()
    });
  }

  function getDocument() {
    var stored = read("documento.actual", null);
    return stored && stored.data ? stored.data : null;
  }

  function saveRows(rows) {
    return write("filas.importadas", {
      rows: Array.isArray(rows) ? rows : [],
      updatedAt: new Date().toISOString()
    });
  }

  function getRows() {
    var stored = read("filas.importadas", null);
    return stored && Array.isArray(stored.rows) ? stored.rows : [];
  }

  function savePeriodo(periodo) {
    return write("periodo.actual", {
      periodo: periodo || {},
      updatedAt: new Date().toISOString()
    });
  }

  function getPeriodo() {
    var stored = read("periodo.actual", null);
    return stored && stored.periodo ? stored.periodo : null;
  }

  function saveSettings(settings) {
    return write("settings", settings || {});
  }

  function getSettings() {
    return read("settings", {});
  }

  function clearAll() {
    [
      "documento.actual",
      "filas.importadas",
      "periodo.actual",
      "settings"
    ].forEach(remove);

    return true;
  }

  window.TITULACION_LOCAL_REPO = {
    read: read,
    write: write,
    remove: remove,
    saveDocument: saveDocument,
    getDocument: getDocument,
    saveRows: saveRows,
    getRows: getRows,
    savePeriodo: savePeriodo,
    getPeriodo: getPeriodo,
    saveSettings: saveSettings,
    getSettings: getSettings,
    clearAll: clearAll
  };
})(window);