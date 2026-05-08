/* ============================================================
  Nombre completo: titulacion-schema.js
  Ruta: Titulacion/basedatos/titulacion-schema.js

  Funcion:
  - Definir la estructura esperada del documento.
  - Crear documentos y secciones base.
  - Normalizar datos antes de guardarlos o renderizarlos.
  - Funcionar sin fetch, sin imports y sin servidor.
============================================================ */

(function () {
  'use strict';

  function isObject(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value);
  }

  function isText(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function createSection(id, titulo, contenido) {
    return {
      id: isText(id) ? id : 'seccion',
      titulo: isText(titulo) ? titulo : 'Sección',
      contenido: Array.isArray(contenido) ? contenido : []
    };
  }

  function createDocument(titulo, subtitulo, secciones) {
    return {
      titulo: isText(titulo) ? titulo : 'Documento de Titulación',
      subtitulo: isText(subtitulo) ? subtitulo : 'Documento base',
      secciones: Array.isArray(secciones) ? secciones : []
    };
  }

  function normalizeSection(section, index) {
    var safeIndex = typeof index === 'number' ? index + 1 : 1;
    var safeSection = isObject(section) ? section : {};

    return createSection(
      isText(safeSection.id) ? safeSection.id : 'seccion-' + safeIndex,
      isText(safeSection.titulo) ? safeSection.titulo : 'Sección ' + safeIndex,
      Array.isArray(safeSection.contenido) ? safeSection.contenido : []
    );
  }

  function normalizeDocument(documentData) {
    var safeDocument = isObject(documentData) ? documentData : {};
    var sections = Array.isArray(safeDocument.secciones)
      ? safeDocument.secciones
      : [];

    return createDocument(
      safeDocument.titulo,
      safeDocument.subtitulo,
      sections.map(function (section, index) {
        return normalizeSection(section, index);
      })
    );
  }

  function getEmptyDocument() {
    return createDocument(
      'Documento de Titulación',
      'Documento vacío',
      []
    );
  }

  window.TITULACION_SCHEMA = {
    nombreCompleto: 'titulacion-schema.js',
    ruta: 'Titulacion/basedatos/titulacion-schema.js',
    funciones: [
      'createSection',
      'createDocument',
      'normalizeSection',
      'normalizeDocument',
      'getEmptyDocument'
    ],
    createSection: createSection,
    createDocument: createDocument,
    normalizeSection: normalizeSection,
    normalizeDocument: normalizeDocument,
    getEmptyDocument: getEmptyDocument
  };
})();