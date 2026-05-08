/* =========================================================
Nombre completo: titulacion-capitulo-marco-legal.js
Ruta: /Titulacion/frontend/js/capitulos/titulacion-capitulo-marco-legal.js
Función o funciones:
- Crear el capítulo Marco Legal del informe final.
- Adaptar el texto según período regular o PVC.
- Corregir la lectura de contexto cuando llega como { rows, contexto }.
- Registrar el capítulo dentro de TITULACION_CAPITULOS.
========================================================= */

(function (window) {
  "use strict";

  var MODULE_ID = "marco-legal";

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

  function baseParagraphs() {
    return [
      "El presente marco legal fundamenta el proceso de titulación en el Instituto Superior Tecnológico Quito Metropolitano, en concordancia con las disposiciones constitucionales, legales, reglamentarias e institucionales aplicables a la educación superior.",
      "La educación superior se orienta a garantizar la formación académica y profesional con pertinencia, calidad, igualdad de oportunidades, inclusión y vinculación con las necesidades sociales y productivas del país.",
      "La Ley Orgánica de Educación Superior reconoce el derecho de los estudiantes al acceso, permanencia, egreso y titulación sin discriminación, conforme a sus méritos académicos y al cumplimiento de los requisitos establecidos.",
      "El Reglamento de Régimen Académico establece que la unidad de titulación permite validar los conocimientos, habilidades, desempeños y competencias adquiridas durante la formación profesional.",
      "La institución mantiene la responsabilidad de planificar, ejecutar, verificar y documentar los procesos de titulación, garantizando transparencia, trazabilidad y respaldo académico en cada período."
    ];
  }

  function regularParagraphs() {
    return [
      "Para los períodos regulares, el proceso de titulación se articula con actividades académicas de preparación, verificación de requisitos, habilitación, evaluación y cierre documental.",
      "La organización del proceso debe garantizar que los estudiantes cuenten con información clara sobre requisitos, cronograma, actividades académicas, evaluaciones y condiciones de habilitación.",
      "La documentación generada constituye respaldo institucional del cumplimiento de actividades y resultados alcanzados en el período evaluado."
    ];
  }

  function pvcParagraphs() {
    return [
      "Para períodos PVC, el proceso se interpreta conforme a la naturaleza acelerada del Programa de Validación de Conocimientos y al desarrollo del artículo académico como eje de cierre.",
      "La documentación del período PVC debe diferenciarse de los procesos regulares, evitando mezclar componentes propios del examen complexivo cuando no correspondan.",
      "El informe debe dejar constancia de la planificación, revisión, aprobación y cierre del artículo académico, conforme a las condiciones institucionales definidas para este tipo de período."
    ];
  }

  function createSection(args) {
    var pvc = isPvc(args);
    var paragraphs = baseParagraphs().concat(pvc ? pvcParagraphs() : regularParagraphs());

    return {
      id: MODULE_ID,
      titulo: "Marco Legal",
      tipo: "capitulo",
      visible: true,
      contenido: paragraphs,
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
    nombreCompleto: "titulacion-capitulo-marco-legal.js",
    ruta: "Titulacion/frontend/js/capitulos/titulacion-capitulo-marco-legal.js",
    id: MODULE_ID,
    createSection: createSection,
    getDefaultSection: getDefaultSection,
    appendToDocument: appendToDocument
  };

  window.TITULACION_CAPITULOS = window.TITULACION_CAPITULOS || {};
  window.TITULACION_CAPITULOS[MODULE_ID] = api;
  window.TITULACION_CAPITULO_MARCO_LEGAL = api;
})(window);