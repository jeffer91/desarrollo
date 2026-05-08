/* =========================================================
Nombre completo: titulacion-capitulo-informe-cohorte.js
Ruta: /Titulacion/frontend/js/capitulos/titulacion-capitulo-informe-cohorte.js
Función o funciones:
- Crear capítulo de informe general de cohorte.
- Consolidar estudiantes, carreras, sedes, jornadas y modalidades.
- Generar contenido institucional a partir de datos importados.
- Registrar el módulo dentro de TITULACION_CAPITULOS.
========================================================= */

(function (window) {
  "use strict";

  var MODULE_ID = "informe-cohorte";

  function cohorteBrain() {
    return window.TITULACION_BRAIN_COHORTE || {};
  }

  function asText(value) {
    if (
      window.TITULACION_UTILS &&
      typeof window.TITULACION_UTILS.asText === "function"
    ) {
      return window.TITULACION_UTILS.asText(value);
    }

    return String(value == null ? "" : value).trim();
  }

  function buildData(rows) {
    var C = cohorteBrain();
    var list = Array.isArray(rows) ? rows : [];

    if (typeof C.buildCohorteSummary === "function") {
      return C.buildCohorteSummary(list);
    }

    return {
      totalEstudiantes: list.length,
      totalCarreras: 0,
      totalSedes: 0,
      totalOnline: 0,
      totalPresencial: 0,
      porCarrera: [],
      porSede: [],
      porJornada: [],
      porModalidad: [],
      porEstado: [],
      rows: list
    };
  }

  function formatGroupLine(title, items) {
    var list = Array.isArray(items) ? items : [];

    if (!list.length) {
      return title + ": no se registran datos.";
    }

    return title + ": " + list.map(function (item) {
      return asText(item.label) + " (" + Number(item.total || 0) + ")";
    }).join(", ") + ".";
  }

  function buildContenido(rows, contexto) {
    var data = buildData(rows);
    var C = cohorteBrain();
    var paragraphs = [];

    if (typeof C.createCohorteParagraphs === "function") {
      paragraphs = C.createCohorteParagraphs(data);
    } else {
      paragraphs = [
        "La cohorte analizada corresponde al grupo de estudiantes vinculados al proceso de titulación.",
        "Total de estudiantes registrados: " + Number(data.totalEstudiantes || 0) + "."
      ];
    }

    paragraphs.push(formatGroupLine("Distribución por carrera", data.porCarrera));
    paragraphs.push(formatGroupLine("Distribución por sede", data.porSede));
    paragraphs.push(formatGroupLine("Distribución por jornada", data.porJornada));
    paragraphs.push(formatGroupLine("Distribución por modalidad", data.porModalidad));

    if (contexto && contexto.periodoLabel) {
      paragraphs.push("El período evaluado corresponde a " + asText(contexto.periodoLabel) + ".");
    }

    return paragraphs;
  }

  function createSection(args) {
    var options = args || {};
    var rows = Array.isArray(options.rows) ? options.rows : [];
    var contexto = options.contexto || {};

    return {
      id: MODULE_ID,
      titulo: "Informe General de Cohorte",
      tipo: "informe-cohorte",
      visible: true,
      contenido: buildContenido(rows, contexto),
      data: buildData(rows)
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
    nombreCompleto: "titulacion-capitulo-informe-cohorte.js",
    ruta: "Titulacion/frontend/js/capitulos/titulacion-capitulo-informe-cohorte.js",
    id: MODULE_ID,
    buildData: buildData,
    buildContenido: buildContenido,
    createSection: createSection,
    getDefaultSection: getDefaultSection,
    appendToDocument: appendToDocument
  };

  window.TITULACION_CAPITULOS = window.TITULACION_CAPITULOS || {};
  window.TITULACION_CAPITULOS[MODULE_ID] = api;
  window.TITULACION_CAPITULO_INFORME_COHORTE = api;
})(window);