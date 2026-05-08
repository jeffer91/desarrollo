/* =========================================================
Nombre completo: titulacion-capitulo-reglamento-complexivo.js
Ruta: /Titulacion/frontend/js/capitulos/titulacion-capitulo-reglamento-complexivo.js
Función o funciones:
- Crear capítulo normativo del proceso regular.
- Generar capítulo alternativo para PVC sin hablar de examen complexivo.
- Corregir la lectura de contexto cuando llega como { rows, contexto }.
- Evitar contradicciones entre período regular y PVC.
========================================================= */

(function (window) {
  "use strict";

  var MODULE_ID = "reglamento-complexivo";

  function asText(value) {
    if (
      window.TITULACION_UTILS &&
      typeof window.TITULACION_UTILS.asText === "function"
    ) {
      return window.TITULACION_UTILS.asText(value);
    }

    return String(value === null || value === undefined ? "" : value).trim();
  }

  function getContext(input) {
    var source = input || {};
    var ctx = source.contexto && typeof source.contexto === "object" ? source.contexto : source;

    return {
      tipoPeriodo: asText(ctx.tipoPeriodo || ctx.tipo || ""),
      tipo: asText(ctx.tipo || ctx.tipoPeriodo || ""),
      periodoLabel: asText(ctx.periodoLabel || ctx.periodo || ""),
      modalidadLabel: asText(ctx.modalidadLabel || ctx.modalidad || "")
    };
  }

  function isPvc(input) {
    var ctx = getContext(input);
    return asText(ctx.tipoPeriodo || ctx.tipo).toLowerCase() === "pvc";
  }

  function regularContent() {
    return [
      "El proceso regular de titulación se desarrolla conforme a la planificación institucional establecida para el período académico correspondiente.",
      "La organización contempla la verificación de requisitos, la planificación de actividades académicas, la preparación estudiantil, la evaluación de resultados y el cierre documental del proceso.",
      "Las actividades académicas vinculadas a núcleos, preparación y evaluación deben responder al perfil de egreso de cada carrera y a los resultados de aprendizaje definidos institucionalmente.",
      "La evaluación del proceso debe mantenerse documentada mediante registros, listados, actas, reportes, evidencias y resultados consolidados por carrera.",
      "Los resultados finales permiten identificar estudiantes aprobados, pendientes, no aprobados o retirados, manteniendo trazabilidad académica y administrativa."
    ];
  }

  function pvcContent() {
    return [
      "El proceso PVC se desarrolla conforme a una planificación diferenciada, orientada a validar conocimientos previos y consolidar el cierre académico mediante el artículo académico.",
      "En este tipo de período, el informe no debe estructurarse alrededor del examen complexivo, sino del seguimiento, revisión, aprobación y cierre del artículo académico.",
      "La documentación debe reflejar el avance de los estudiantes, la validación de temas, la revisión de artículos, los resultados finales y las condiciones de habilitación que correspondan.",
      "Los resultados del período PVC deben presentarse de forma separada de los períodos regulares, garantizando coherencia entre modalidad, cronograma y evidencias.",
      "El cierre documental debe dejar constancia de estudiantes aprobados, pendientes, no aprobados o retirados dentro del marco específico del PVC."
    ];
  }

  function createSection(args) {
    var pvc = isPvc(args);

    return {
      id: MODULE_ID,
      titulo: pvc ? "Lineamientos del Proceso PVC" : "Reglamento del Proceso de Titulación Regular",
      tipo: "capitulo",
      visible: true,
      contenido: pvc ? pvcContent() : regularContent(),
      data: {
        tipoPeriodo: pvc ? "pvc" : "regular",
        contexto: getContext(args)
      }
    };
  }

  function getDefaultSection() {
    return createSection({});
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
    nombreCompleto: "titulacion-capitulo-reglamento-complexivo.js",
    ruta: "Titulacion/frontend/js/capitulos/titulacion-capitulo-reglamento-complexivo.js",
    id: MODULE_ID,
    createSection: createSection,
    getDefaultSection: getDefaultSection,
    appendToDocument: appendToDocument
  };

  window.TITULACION_CAPITULOS = window.TITULACION_CAPITULOS || {};
  window.TITULACION_CAPITULOS[MODULE_ID] = api;
  window.TITULACION_CAPITULO_REGLAMENTO_COMPLEXIVO = api;
})(window);