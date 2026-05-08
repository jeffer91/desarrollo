/* =========================================================
Nombre completo: titulacion-capitulo-metodologia-nucleos.js
Ruta: /Titulacion/frontend/js/capitulos/titulacion-capitulo-metodologia-nucleos.js
Función o funciones:
- Crear capítulo metodológico del proceso de titulación.
- Explicar núcleos para período regular.
- Explicar metodología de artículo académico para PVC.
- Corregir la lectura de contexto cuando llega como { rows, contexto }.
========================================================= */

(function (window) {
  "use strict";

  var MODULE_ID = "metodologia-nucleos";

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

  function regularMethodology() {
    return [
      "La metodología del proceso regular de titulación se organiza a partir de actividades académicas planificadas, orientadas a consolidar los conocimientos adquiridos durante la formación profesional.",
      "Los núcleos estructurantes permiten integrar saberes teóricos, prácticos y metodológicos vinculados con el perfil de egreso de cada carrera.",
      "Cada carrera organiza sus contenidos conforme a campos de conocimiento relevantes, resultados de aprendizaje y necesidades del contexto profesional.",
      "La metodología permite realizar seguimiento al avance estudiantil, identificar dificultades, consolidar resultados y documentar evidencias del proceso.",
      "El cierre del proceso se sustenta en la consolidación de resultados por carrera, modalidad y cohorte."
    ];
  }

  function pvcMethodology() {
    return [
      "La metodología del proceso PVC se orienta a la validación de conocimientos y al desarrollo del artículo académico como producto central de cierre.",
      "El acompañamiento académico se enfoca en la delimitación del tema, formulación del título, construcción del documento, revisión de coherencia y cumplimiento de criterios institucionales.",
      "La estructura metodológica del PVC debe ser simple, práctica y adecuada al tiempo acelerado del programa.",
      "La evaluación del proceso se centra en el avance, revisión y aprobación del artículo académico, evitando incluir componentes propios del examen complexivo.",
      "El cierre del proceso se documenta mediante resultados consolidados, evidencias y recomendaciones institucionales."
    ];
  }

  function createSection(args) {
    var pvc = isPvc(args);

    return {
      id: MODULE_ID,
      titulo: pvc ? "Metodología del Proceso PVC" : "Metodología de Núcleos Estructurantes",
      tipo: "capitulo",
      visible: true,
      contenido: pvc ? pvcMethodology() : regularMethodology(),
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
    nombreCompleto: "titulacion-capitulo-metodologia-nucleos.js",
    ruta: "Titulacion/frontend/js/capitulos/titulacion-capitulo-metodologia-nucleos.js",
    id: MODULE_ID,
    createSection: createSection,
    getDefaultSection: getDefaultSection,
    appendToDocument: appendToDocument
  };

  window.TITULACION_CAPITULOS = window.TITULACION_CAPITULOS || {};
  window.TITULACION_CAPITULOS[MODULE_ID] = api;
  window.TITULACION_CAPITULO_METODOLOGIA_NUCLEOS = api;
})(window);