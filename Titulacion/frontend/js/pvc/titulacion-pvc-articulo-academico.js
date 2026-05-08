/* =========================================================
Nombre completo: titulacion-pvc-articulo-academico.js
Ruta: /Titulacion/frontend/js/pvc/titulacion-pvc-articulo-academico.js
Función o funciones:
- Crear sección específica del artículo académico para períodos PVC.
- Evitar referencias a examen complexivo dentro de PVC.
- Describir fases de tema, título, desarrollo, revisión y cierre.
- Registrar el módulo dentro de TITULACION_PVC.
========================================================= */

(function (window) {
  "use strict";

  var MODULE_ID = "pvc-articulo-academico";

  function createPhases() {
    return [
      {
        titulo: "Selección del tema",
        descripcion: "Identificación de una problemática, necesidad o área de análisis vinculada con la carrera."
      },
      {
        titulo: "Formulación del título",
        descripcion: "Construcción de un título técnico, delimitado y coherente con el tema aprobado."
      },
      {
        titulo: "Desarrollo del artículo",
        descripcion: "Elaboración del documento académico con estructura, argumentación y respaldo bibliográfico."
      },
      {
        titulo: "Revisión académica",
        descripcion: "Verificación de coherencia, pertinencia, redacción, originalidad y cumplimiento de criterios institucionales."
      },
      {
        titulo: "Cierre y registro",
        descripcion: "Consolidación del resultado final y archivo de evidencias del proceso PVC."
      }
    ];
  }

  function createSection(args) {
    var options = args || {};
    var phases = Array.isArray(options.phases) ? options.phases : createPhases();

    return {
      id: MODULE_ID,
      titulo: "Artículo Académico",
      tipo: "pvc",
      visible: true,
      data: {
        phases: phases
      },
      contenido: [
        "El artículo académico constituye el eje principal del proceso de titulación en períodos PVC.",
        "Su desarrollo permite evidenciar la aplicación de conocimientos, análisis crítico y construcción de una propuesta académica pertinente."
      ].concat(phases.map(function (phase, index) {
        return String(index + 1) + ". " + phase.titulo + ": " + phase.descripcion;
      }))
    };
  }

  function appendToDocument(documentData, args) {
    var doc = documentData || {};
    var sections = Array.isArray(doc.secciones) ? doc.secciones.slice() : [];

    sections = sections.filter(function (section) {
      return section && section.id !== MODULE_ID;
    });

    sections.push(createSection(args));

    return Object.assign({}, doc, {
      secciones: sections
    });
  }

  var api = {
    nombreCompleto: "titulacion-pvc-articulo-academico.js",
    ruta: "Titulacion/frontend/js/pvc/titulacion-pvc-articulo-academico.js",
    id: MODULE_ID,
    createPhases: createPhases,
    createSection: createSection,
    appendToDocument: appendToDocument
  };

  window.TITULACION_PVC = window.TITULACION_PVC || {};
  window.TITULACION_PVC[MODULE_ID] = api;
  window.TITULACION_PVC_ARTICULO_ACADEMICO = api;
})(window);