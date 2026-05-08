/* =========================================================
Nombre completo: titulacion-capitulo-conclusiones.js
Ruta: /Titulacion/frontend/js/capitulos/titulacion-capitulo-conclusiones.js
Función o funciones:
- Crear capítulo de conclusiones.
- Usar TITULACION_BRAIN_CONCLUSIONES cuando esté disponible.
- Generar conclusiones institucionales basadas en resultados.
- Registrar el módulo dentro de TITULACION_CAPITULOS.
========================================================= */

(function (window) {
  "use strict";

  var MODULE_ID = "conclusiones";

  function conclusionesBrain() {
    return window.TITULACION_BRAIN_CONCLUSIONES || {};
  }

  function resultadosBrain() {
    return window.TITULACION_BRAIN_RESULTADOS || {};
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

  function buildResultadosPorCarrera(rows) {
    var R = resultadosBrain();

    if (typeof R.buildResultadosPorCarrera === "function") {
      return R.buildResultadosPorCarrera(rows);
    }

    return [];
  }

  function buildContenido(rows, contexto) {
    var B = conclusionesBrain();
    var resultados = buildResultados(rows);
    var porCarrera = buildResultadosPorCarrera(rows);

    if (typeof B.build === "function") {
      return B.build(contexto || {}, resultados, porCarrera);
    }

    return [
      "El informe consolida el cierre del proceso de titulación del período evaluado.",
      "La cohorte analizada registra " + Number(resultados.total || 0) + " estudiante(s).",
      "Se identifican " + Number(resultados.aprobados || 0) + " caso(s) aprobados o habilitados.",
      "Los casos pendientes, no aprobados o retirados deben mantenerse identificados para trazabilidad institucional."
    ];
  }

  function createSection(args) {
    var options = args || {};
    var rows = Array.isArray(options.rows) ? options.rows : [];
    var contexto = options.contexto || {};

    return {
      id: MODULE_ID,
      titulo: "Conclusiones",
      tipo: "conclusiones",
      visible: true,
      contenido: buildContenido(rows, contexto),
      data: {
        contexto: contexto,
        resultados: buildResultados(rows),
        resultadosPorCarrera: buildResultadosPorCarrera(rows)
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
    nombreCompleto: "titulacion-capitulo-conclusiones.js",
    ruta: "Titulacion/frontend/js/capitulos/titulacion-capitulo-conclusiones.js",
    id: MODULE_ID,
    buildContenido: buildContenido,
    createSection: createSection,
    getDefaultSection: getDefaultSection,
    appendToDocument: appendToDocument
  };

  window.TITULACION_CAPITULOS = window.TITULACION_CAPITULOS || {};
  window.TITULACION_CAPITULOS[MODULE_ID] = api;
  window.TITULACION_CAPITULO_CONCLUSIONES = api;
})(window);