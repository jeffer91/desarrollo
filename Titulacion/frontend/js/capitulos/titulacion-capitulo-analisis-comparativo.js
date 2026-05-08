/* =========================================================
Nombre completo: titulacion-capitulo-analisis-comparativo.js
Ruta: /Titulacion/frontend/js/capitulos/titulacion-capitulo-analisis-comparativo.js
Función o funciones:
- Crear capítulo de análisis comparativo.
- Comparar resultados actuales con una cohorte anterior si existe.
- Generar análisis básico cuando no hay datos comparativos.
- Registrar el módulo dentro de TITULACION_CAPITULOS.
========================================================= */

(function (window) {
  "use strict";

  var MODULE_ID = "analisis-comparativo";

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

  function percent(value, total) {
    var R = resultadosBrain();

    if (typeof R.percent === "function") {
      return R.percent(value, total);
    }

    var t = Number(total || 0);
    if (!t) return 0;

    return Math.round((Number(value || 0) / t) * 10000) / 100;
  }

  function buildCurrent(rows) {
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

  function normalizePrevious(previous) {
    var p = previous || {};

    return {
      total: Number(p.total || p.totalEstudiantes || 0),
      aprobados: Number(p.aprobados || 0),
      pendientes: Number(p.pendientes || 0),
      noAprobados: Number(p.noAprobados || p.no_aprobados || 0),
      retirados: Number(p.retirados || 0),
      porcentajeAprobacion: Number(
        p.porcentajeAprobacion ||
        p.pctAprobacion ||
        percent(p.aprobados || 0, p.total || p.totalEstudiantes || 0)
      )
    };
  }

  function diffLine(label, actual, anterior, suffix) {
    var a = Number(actual || 0);
    var b = Number(anterior || 0);
    var diff = a - b;
    var sign = diff >= 0 ? "+" : "";

    return label + ": actual " + a + (suffix || "") + ", anterior " + b + (suffix || "") + ", variación " + sign + diff + (suffix || "") + ".";
  }

  function buildData(rows, previous) {
    var actual = buildCurrent(rows);
    var anterior = normalizePrevious(previous);

    return {
      actual: actual,
      anterior: anterior,
      diferencias: {
        total: Number(actual.total || 0) - Number(anterior.total || 0),
        aprobados: Number(actual.aprobados || 0) - Number(anterior.aprobados || 0),
        pendientes: Number(actual.pendientes || 0) - Number(anterior.pendientes || 0),
        noAprobados: Number(actual.noAprobados || 0) - Number(anterior.noAprobados || 0),
        retirados: Number(actual.retirados || 0) - Number(anterior.retirados || 0),
        porcentajeAprobacion: Number(actual.porcentajeAprobacion || 0) - Number(anterior.porcentajeAprobacion || 0)
      }
    };
  }

  function buildContenido(rows, previous, contexto) {
    var data = buildData(rows, previous);
    var actual = data.actual;
    var anterior = data.anterior;
    var hasPrevious = Number(anterior.total || 0) > 0;

    var paragraphs = [
      "El análisis comparativo permite observar variaciones entre la cohorte actual y una cohorte de referencia."
    ];

    if (!hasPrevious) {
      paragraphs.push("No se registró una cohorte anterior con datos suficientes para realizar una comparación cuantitativa completa.");
      paragraphs.push("En consecuencia, el análisis se presenta sobre la base de los resultados actuales del período evaluado.");
      paragraphs.push("Total actual analizado: " + Number(actual.total || 0) + " estudiante(s).");
      paragraphs.push("Porcentaje actual de aprobación o habilitación: " + Number(actual.porcentajeAprobacion || 0) + "%.");
      return paragraphs;
    }

    if (contexto && contexto.periodoLabel) {
      paragraphs.push("Período actual evaluado: " + asText(contexto.periodoLabel) + ".");
    }

    paragraphs.push(diffLine("Total de estudiantes", actual.total, anterior.total, ""));
    paragraphs.push(diffLine("Aprobados o habilitados", actual.aprobados, anterior.aprobados, ""));
    paragraphs.push(diffLine("Pendientes", actual.pendientes, anterior.pendientes, ""));
    paragraphs.push(diffLine("No aprobados", actual.noAprobados, anterior.noAprobados, ""));
    paragraphs.push(diffLine("Retirados", actual.retirados, anterior.retirados, ""));
    paragraphs.push(diffLine("Porcentaje de aprobación", actual.porcentajeAprobacion, anterior.porcentajeAprobacion, "%"));

    return paragraphs;
  }

  function createSection(args) {
    var options = args || {};
    var rows = Array.isArray(options.rows) ? options.rows : [];
    var previous = options.previous || options.anterior || {};
    var contexto = options.contexto || {};

    return {
      id: MODULE_ID,
      titulo: "Análisis comparativo",
      tipo: "analisis-comparativo",
      visible: true,
      contenido: buildContenido(rows, previous, contexto),
      data: buildData(rows, previous)
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
    nombreCompleto: "titulacion-capitulo-analisis-comparativo.js",
    ruta: "Titulacion/frontend/js/capitulos/titulacion-capitulo-analisis-comparativo.js",
    id: MODULE_ID,
    buildCurrent: buildCurrent,
    normalizePrevious: normalizePrevious,
    buildData: buildData,
    buildContenido: buildContenido,
    createSection: createSection,
    getDefaultSection: getDefaultSection,
    appendToDocument: appendToDocument
  };

  window.TITULACION_CAPITULOS = window.TITULACION_CAPITULOS || {};
  window.TITULACION_CAPITULOS[MODULE_ID] = api;
  window.TITULACION_CAPITULO_ANALISIS_COMPARATIVO = api;
})(window);