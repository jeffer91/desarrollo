/* ============================================================
  Nombre completo: titulacion-db.js
  Ruta: Titulacion/basedatos/titulacion-db.js

  Funcion:
  - Gestionar documento actual en memoria.
  - Leer y guardar documento en localStorage.
  - Construir documento inicial desde datos demo y semillas.
  - No usar fetch para mantener compatibilidad con file://.
============================================================ */

(function () {
  'use strict';

  var memory = {
    documentData: null
  };

  var STORAGE_KEY = 'titulacion.documento.actual';

  function getSchema() {
    return window.TITULACION_SCHEMA || null;
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function normalizeDocument(documentData) {
    var schema = getSchema();

    if (schema && typeof schema.normalizeDocument === 'function') {
      return schema.normalizeDocument(documentData);
    }

    return documentData;
  }

  function readStorage() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);

      if (!raw) {
        return null;
      }

      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  function writeStorage(documentData) {
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(documentData, null, 2)
      );

      return true;
    } catch (error) {
      return false;
    }
  }

  function getDemoDocument() {
    if (window.TITULACION_DATA_DEMO) {
      return clone(window.TITULACION_DATA_DEMO);
    }

    return {
      titulo: 'Documento de Titulación',
      subtitulo: 'Base inicial',
      secciones: []
    };
  }

  function getSeedSections() {
    var sections = [];

    if (
      window.TITULACION_SEED_COHORTE &&
      Array.isArray(window.TITULACION_SEED_COHORTE.secciones)
    ) {
      sections = sections.concat(window.TITULACION_SEED_COHORTE.secciones);
    }

    if (
      window.TITULACION_SEED_CAPITULOS &&
      Array.isArray(window.TITULACION_SEED_CAPITULOS.secciones)
    ) {
      sections = sections.concat(window.TITULACION_SEED_CAPITULOS.secciones);
    }

    if (
      window.TITULACION_SEED_PVC &&
      Array.isArray(window.TITULACION_SEED_PVC.secciones)
    ) {
      sections = sections.concat(window.TITULACION_SEED_PVC.secciones);
    }

    return sections;
  }

  function buildInitialDocument() {
    var base = getDemoDocument();
    var seedSections = getSeedSections();

    if (seedSections.length > 0) {
      base.secciones = base.secciones.concat(seedSections);
    }

    return normalizeDocument(base);
  }

  function getInitialDocument() {
    var stored = readStorage();

    if (stored) {
      memory.documentData = normalizeDocument(stored);
      return clone(memory.documentData);
    }

    memory.documentData = buildInitialDocument();
    return clone(memory.documentData);
  }

  function getCurrentDocument() {
    if (!memory.documentData) {
      return getInitialDocument();
    }

    return clone(memory.documentData);
  }

  function saveDocument(documentData) {
    memory.documentData = normalizeDocument(documentData);
    writeStorage(memory.documentData);

    return clone(memory.documentData);
  }

  function resetDocument() {
    memory.documentData = buildInitialDocument();
    writeStorage(memory.documentData);

    return clone(memory.documentData);
  }

  function clearStorage() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      memory.documentData = null;
      return true;
    } catch (error) {
      return false;
    }
  }

  window.TITULACION_DB = {
    nombreCompleto: 'titulacion-db.js',
    ruta: 'Titulacion/basedatos/titulacion-db.js',
    funciones: [
      'getInitialDocument',
      'getCurrentDocument',
      'saveDocument',
      'resetDocument',
      'clearStorage'
    ],
    getInitialDocument: getInitialDocument,
    getCurrentDocument: getCurrentDocument,
    saveDocument: saveDocument,
    resetDocument: resetDocument,
    clearStorage: clearStorage
  };
})();