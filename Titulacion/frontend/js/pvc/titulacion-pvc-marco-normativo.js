/* ============================================================
  Nombre completo: titulacion-pvc-marco-normativo.js
  Ruta: Titulacion/frontend/js/pvc/titulacion-pvc-marco-normativo.js

  Funcion:
  - Crear sección PVC de marco normativo.
  - Registrar el módulo dentro de TITULACION_PVC.
  - Mantener normativa PVC fuera del core.
  - Evitar dependencias de servidor o imports ES.
============================================================ */

(function () {
  'use strict';

  var MODULE_ID = 'pvc-marco-normativo';

  function createSection(data) {
    var safeData = data || {};

    return {
      id: MODULE_ID,
      titulo: 'PVC - Marco normativo',
      contenido: [
        safeData.introduccion || 'El marco normativo PVC reúne lineamientos, disposiciones y criterios aplicables al proceso.',
        safeData.normativa || 'La sección puede incorporar reglamentos institucionales, resoluciones y criterios académicos.',
        safeData.observacion || 'La información normativa definitiva debe ser validada por la instancia correspondiente.'
      ]
    };
  }

  function getDefaultSection() {
    return createSection({});
  }

  function appendToDocument(documentData, data) {
    var safeDocument = documentData || {};
    var sections = Array.isArray(safeDocument.secciones)
      ? safeDocument.secciones.slice()
      : [];

    sections = sections.filter(function (section) {
      return section && section.id !== MODULE_ID;
    });

    sections.push(createSection(data));

    return {
      titulo: safeDocument.titulo || 'Documento de Titulación',
      subtitulo: safeDocument.subtitulo || '',
      secciones: sections
    };
  }

  var api = {
    nombreCompleto: 'titulacion-pvc-marco-normativo.js',
    ruta: 'Titulacion/frontend/js/pvc/titulacion-pvc-marco-normativo.js',
    id: MODULE_ID,
    funciones: [
      'createSection',
      'getDefaultSection',
      'appendToDocument'
    ],
    createSection: createSection,
    getDefaultSection: getDefaultSection,
    appendToDocument: appendToDocument
  };

  window.TITULACION_PVC = window.TITULACION_PVC || {};
  window.TITULACION_PVC[MODULE_ID] = api;
  window.TITULACION_PVC_MARCO_NORMATIVO = api;
})();