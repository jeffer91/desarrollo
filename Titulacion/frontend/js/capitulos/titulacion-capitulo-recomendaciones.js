/* =========================================================
Nombre completo: titulacion-capitulo-recomendaciones.js
Ruta: /Titulacion/frontend/js/capitulos/titulacion-capitulo-recomendaciones.js
Función o funciones:
- Crear capítulo de recomendaciones.
- Usar TITULACION_BRAIN_RECOMENDACIONES cuando esté disponible.
- Generar recomendaciones institucionales según período y resultados.
- Registrar el módulo dentro de TITULACION_CAPITULOS.
========================================================= */

(function (window) {
  "use strict";

  var MODULE_ID = "recomendaciones";

  function recomendacionesBrain() {
    return window.TITULACION_BRAIN_RECOMENDACIONES || {};
  }

  function resultadosBrain() {
    return window.TITULACION_BRAIN_RESULTADOS || {};
  }

  function buildResultados(rows) {
    var R = resultadosBrain();
    var list = Array.isArray(rows) ? rows : [];

    if (typeof R.buildResultadoResumen === "function") {
      return R.buildResultadoResumen(list);
    }

    return {
      total: list.length,
      aprobados: 0,
      pendientes: 0,
      noAprobados: 0,
      retirados: 0,
      porcentajeAprobacion: 0
    };
  }

  function buildContenido(rows, contexto) {
    var B = recomendacionesBrain();
    var resultados = buildResultados(rows);

    if (typeof B.build === "function") {
      return B.build(contexto || {}, resultados);
    }

    return [
      "Conservar la base de datos final del período evaluado como respaldo institucional.",
      "Mantener anexadas las evidencias documentales utilizadas para sustentar los resultados.",
      "Registrar formalmente los casos aprobados, pendientes, no aprobados o retirados.",
      "Verificar que los resultados por carrera coincidan con los registros oficiales antes de emitir el documento."
    ];
  }

  function createSection(args) {
    var options = args || {};
    var rows = Array.isArray(options.rows) ? options.rows : [];
    var contexto = options.contexto || {};

    return {
      id: MODULE_ID,
      titulo: "Recomendaciones",
      tipo: "recomendaciones",
      visible: true,
      contenido: buildContenido(rows, contexto),
      data: {
        contexto: contexto,
        resultados: buildResultados(rows)
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
    nombreCompleto: "titulacion-capitulo-recomendaciones.js",
    ruta: "Titulacion/frontend/js/capitulos/titulacion-capitulo-recomendaciones.js",
    id: MODULE_ID,
    buildContenido: buildContenido,
    createSection: createSection,
    getDefaultSection: getDefaultSection,
    appendToDocument: appendToDocument
  };

  window.TITULACION_CAPITULOS = window.TITULACION_CAPITULOS || {};
  window.TITULACION_CAPITULOS[MODULE_ID] = api;
  window.TITULACION_CAPITULO_RECOMENDACIONES = api;
})(window);