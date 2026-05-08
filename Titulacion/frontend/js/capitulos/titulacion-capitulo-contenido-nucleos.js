/* =========================================================
Nombre completo: titulacion-capitulo-contenido-nucleos.js
Ruta: /Titulacion/frontend/js/capitulos/titulacion-capitulo-contenido-nucleos.js
Función o funciones:
- Crear capítulo de contenido por carrera o por núcleo.
- Generar secciones automáticas según carreras detectadas.
- Para PVC, reemplazar núcleos por componentes del artículo académico.
- Corregir la lectura de contexto cuando llega como { rows, contexto }.
========================================================= */

(function (window) {
  "use strict";

  var MODULE_ID = "contenido-nucleos";

  function carrerasBrain() {
    return window.TITULACION_BRAIN_CARRERAS || {};
  }

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

  function getRows(input) {
    var source = input || {};
    return Array.isArray(source.rows) ? source.rows : [];
  }

  function isPvc(input) {
    var ctx = getContext(input);
    return asText(ctx.tipoPeriodo || ctx.tipo).toLowerCase() === "pvc";
  }

  function defaultRegularNucleos() {
    return [
      "Núcleo 1: Integración de fundamentos técnicos y conceptuales de la carrera.",
      "Núcleo 2: Aplicación metodológica y resolución de problemas del campo profesional.",
      "Núcleo 3: Análisis de casos, procesos o situaciones vinculadas al perfil de egreso.",
      "Núcleo 4: Consolidación práctica, evaluación y cierre del proceso académico."
    ];
  }

  function defaultPvcComponents() {
    return [
      "Componente 1: Selección y aprobación del tema del artículo académico.",
      "Componente 2: Construcción del título, problema, objetivos y estructura del artículo.",
      "Componente 3: Desarrollo argumentativo, revisión académica y cumplimiento de criterios.",
      "Componente 4: Evaluación, cierre y registro del resultado final del artículo académico."
    ];
  }

  function buildContenidoPorCarrera(args) {
    var rows = getRows(args);
    var B = carrerasBrain();
    var carreras =
      typeof B.getCarrerasList === "function"
        ? B.getCarrerasList(rows)
        : [];

    var pvc = isPvc(args);
    var baseItems = pvc ? defaultPvcComponents() : defaultRegularNucleos();

    if (!carreras.length) {
      return [
        pvc
          ? "No se detectaron carreras en la base importada. Se presenta la estructura general del artículo académico."
          : "No se detectaron carreras en la base importada. Se presenta la estructura general de núcleos."
      ].concat(baseItems);
    }

    var out = [];

    carreras.forEach(function (carrera) {
      out.push("Carrera: " + carrera.carrera + " — Total de estudiantes: " + carrera.total + ".");
      baseItems.forEach(function (item) {
        out.push(item);
      });
    });

    return out;
  }

  function createSection(args) {
    var pvc = isPvc(args);

    return {
      id: MODULE_ID,
      titulo: pvc ? "Componentes del Artículo Académico" : "Contenido de los Núcleos",
      tipo: "capitulo",
      visible: true,
      contenido: buildContenidoPorCarrera(args),
      data: {
        tipoPeriodo: pvc ? "pvc" : "regular",
        contexto: getContext(args),
        rows: getRows(args)
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
    nombreCompleto: "titulacion-capitulo-contenido-nucleos.js",
    ruta: "Titulacion/frontend/js/capitulos/titulacion-capitulo-contenido-nucleos.js",
    id: MODULE_ID,
    defaultRegularNucleos: defaultRegularNucleos,
    defaultPvcComponents: defaultPvcComponents,
    buildContenidoPorCarrera: buildContenidoPorCarrera,
    createSection: createSection,
    getDefaultSection: getDefaultSection,
    appendToDocument: appendToDocument
  };

  window.TITULACION_CAPITULOS = window.TITULACION_CAPITULOS || {};
  window.TITULACION_CAPITULOS[MODULE_ID] = api;
  window.TITULACION_CAPITULO_CONTENIDO_NUCLEOS = api;
})(window);