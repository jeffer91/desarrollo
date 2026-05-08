/* ============================================================
  Nombre completo: titulacion-pvc-aspectos-generales.js
  Ruta: Titulacion/frontend/js/pvc/titulacion-pvc-aspectos-generales.js

  Funcion:
  - Crear sección PVC de aspectos generales.
  - Registrar el módulo dentro de TITULACION_PVC.
  - Separar contenido PVC del core principal.
  - Funcionar con doble click, Live Server y Electron.
============================================================ */

(function () {
  'use strict';

  var MODULE_ID = 'pvc-aspectos-generales';

  function createSection(data) {
    var safeData = data || {};

    return {
      id: MODULE_ID,
      titulo: 'PVC - Aspectos generales',
      contenido: [
        safeData.descripcion || 'Los aspectos generales del PVC describen el propósito, alcance y organización del proceso.',
        safeData.alcance || 'El módulo PVC permite estructurar lineamientos, fases, resultados y recomendaciones específicas.',
        safeData.observacion || 'Este contenido es una base inicial y puede ajustarse a criterios institucionales.'
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
    nombreCompleto: 'titulacion-pvc-aspectos-generales.js',
    ruta: 'Titulacion/frontend/js/pvc/titulacion-pvc-aspectos-generales.js',
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
  window.TITULACION_PVC_ASPECTOS_GENERALES = api;
})();