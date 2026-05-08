/* =========================================================
Nombre completo: titulacion-capitulo-infografia.js
Ruta: /Titulacion/frontend/js/capitulos/titulacion-capitulo-infografia.js
Función o funciones:
- Crear capítulo de infografía o ruta del proceso.
- Adaptar pasos según proceso regular o PVC.
- Corregir la lectura de contexto cuando llega como { rows, contexto }.
- Registrar el módulo dentro de TITULACION_CAPITULOS.
========================================================= */

(function (window) {
  "use strict";

  var MODULE_ID = "infografia";

  function asText(value) {
    if (
      window.TITULACION_UTILS &&
      typeof window.TITULACION_UTILS.asText === "function"
    ) {
      return window.TITULACION_UTILS.asText(value);
    }

    return String(value === null || value === undefined ? "" : value).trim();
  }

  function esc(value) {
    if (
      window.TITULACION_UTILS &&
      typeof window.TITULACION_UTILS.escapeHtml === "function"
    ) {
      return window.TITULACION_UTILS.escapeHtml(value);
    }

    return asText(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
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

  function regularSteps() {
    return [
      { titulo: "Verificación de requisitos", descripcion: "Revisión académica, documental, financiera y administrativa." },
      { titulo: "Planificación del proceso", descripcion: "Definición de cronograma, carreras, responsables y actividades." },
      { titulo: "Desarrollo de actividades", descripcion: "Ejecución de núcleos, preparación o actividades académicas correspondientes." },
      { titulo: "Evaluación y resultados", descripcion: "Consolidación de resultados por carrera y modalidad." },
      { titulo: "Cierre documental", descripcion: "Emisión del informe final, conclusiones, recomendaciones y anexos." }
    ];
  }

  function pvcSteps() {
    return [
      { titulo: "Validación inicial", descripcion: "Revisión de datos, requisitos y condiciones de participación." },
      { titulo: "Definición del tema", descripcion: "Registro, revisión y aprobación del tema del artículo académico." },
      { titulo: "Desarrollo del artículo", descripcion: "Elaboración, acompañamiento y revisión del documento académico." },
      { titulo: "Evaluación final", descripcion: "Consolidación de resultados y habilitación según corresponda." },
      { titulo: "Cierre documental", descripcion: "Emisión del informe final PVC con evidencias y resultados." }
    ];
  }

  function getSteps(args) {
    return isPvc(args) ? pvcSteps() : regularSteps();
  }

  function createInfografiaHtml(args) {
    var steps = getSteps(args);

    return [
      '<section class="infografia-proceso">',
      steps.map(function (step, index) {
        return [
          '<article class="infografia-step">',
          '<div class="infografia-step-number">', String(index + 1), '</div>',
          '<h3>', esc(step.titulo), '</h3>',
          '<p>', esc(step.descripcion), '</p>',
          '</article>'
        ].join("");
      }).join(""),
      '</section>'
    ].join("");
  }

  function createSection(args) {
    var pvc = isPvc(args);
    var steps = getSteps(args);

    return {
      id: MODULE_ID,
      titulo: pvc ? "Infografía del Proceso PVC" : "Infografía del Proceso de Titulación",
      tipo: "infografia",
      visible: true,
      data: {
        steps: steps,
        html: createInfografiaHtml(args),
        tipoPeriodo: pvc ? "pvc" : "regular",
        contexto: getContext(args)
      },
      contenido: [
        "La infografía resume las fases principales del proceso documentado en el presente informe."
      ].concat(steps.map(function (step, index) {
        return String(index + 1) + ". " + step.titulo + ": " + step.descripcion;
      }))
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
    nombreCompleto: "titulacion-capitulo-infografia.js",
    ruta: "Titulacion/frontend/js/capitulos/titulacion-capitulo-infografia.js",
    id: MODULE_ID,
    getSteps: getSteps,
    createInfografiaHtml: createInfografiaHtml,
    createSection: createSection,
    getDefaultSection: getDefaultSection,
    appendToDocument: appendToDocument
  };

  window.TITULACION_CAPITULOS = window.TITULACION_CAPITULOS || {};
  window.TITULACION_CAPITULOS[MODULE_ID] = api;
  window.TITULACION_CAPITULO_INFOGRAFIA = api;
})(window);