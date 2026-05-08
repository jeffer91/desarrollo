/* =========================================================
Nombre completo: titulacion-capitulo-analisis-estrategico.js
Ruta: /Titulacion/frontend/js/capitulos/titulacion-capitulo-analisis-estrategico.js
Función o funciones:
- Crear capítulo de análisis estratégico.
- Identificar fortalezas, alertas y acciones de mejora.
- Ajustar análisis según resultados y tipo de período.
- Registrar el módulo dentro de TITULACION_CAPITULOS.
========================================================= */

(function (window) {
  "use strict";

  var MODULE_ID = "analisis-estrategico";

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

  function buildResumen(rows) {
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

  function isPvc(contexto) {
    var ctx = contexto || {};
    return asText(ctx.tipoPeriodo || ctx.tipo || "").toLowerCase() === "pvc";
  }

  function buildFortalezas(resumen) {
    var r = resumen || {};
    var pct = Number(r.porcentajeAprobacion || 0);
    var fortalezas = [];

    if (pct >= 90) {
      fortalezas.push("Alto nivel de aprobación o habilitación en la cohorte evaluada.");
    } else if (pct >= 70) {
      fortalezas.push("Nivel aceptable de cumplimiento general dentro del proceso de titulación.");
    } else {
      fortalezas.push("Existencia de información consolidada que permite identificar oportunidades de mejora.");
    }

    fortalezas.push("Disponibilidad de resultados agrupados para análisis por carrera y modalidad.");
    fortalezas.push("Existencia de trazabilidad documental para sustentar el cierre del proceso.");

    return fortalezas;
  }

  function buildAlertas(resumen) {
    var r = resumen || {};
    var alertas = [];

    if (Number(r.pendientes || 0) > 0) {
      alertas.push("Se registran casos pendientes que requieren seguimiento institucional.");
    }

    if (Number(r.noAprobados || 0) > 0) {
      alertas.push("Se registran casos no aprobados que deben mantenerse documentados para acciones posteriores.");
    }

    if (Number(r.retirados || 0) > 0) {
      alertas.push("Se registran retiros que deben analizarse para identificar causas académicas o administrativas.");
    }

    if (!alertas.length) {
      alertas.push("No se identifican alertas críticas en los resultados consolidados.");
    }

    return alertas;
  }

  function buildAcciones(resumen, contexto) {
    var acciones = [
      "Mantener respaldo documental de la base final utilizada para el informe.",
      "Verificar la coherencia entre resultados, anexos y registros institucionales.",
      "Conservar el informe como evidencia formal del cierre del período."
    ];

    if (isPvc(contexto)) {
      acciones.push("Revisar que las evidencias del PVC correspondan al artículo académico y no a componentes de examen complexivo.");
    } else {
      acciones.push("Revisar que los resultados del proceso regular correspondan a la planificación de núcleos y actividades de titulación.");
    }

    if (Number(resumen.pendientes || 0) > 0 || Number(resumen.noAprobados || 0) > 0) {
      acciones.push("Derivar los casos pendientes o no aprobados para seguimiento académico y administrativo.");
    }

    return acciones;
  }

  function buildContenido(rows, contexto) {
    var resumen = buildResumen(rows);
    var fortalezas = buildFortalezas(resumen);
    var alertas = buildAlertas(resumen);
    var acciones = buildAcciones(resumen, contexto);

    return [
      "El análisis estratégico permite interpretar los resultados del proceso de titulación desde una perspectiva institucional.",
      "Fortalezas identificadas: " + fortalezas.join(" "),
      "Alertas identificadas: " + alertas.join(" "),
      "Acciones recomendadas: " + acciones.join(" ")
    ];
  }

  function createSection(args) {
    var options = args || {};
    var rows = Array.isArray(options.rows) ? options.rows : [];
    var contexto = options.contexto || {};
    var resumen = buildResumen(rows);

    return {
      id: MODULE_ID,
      titulo: "Análisis Estratégico",
      tipo: "analisis-estrategico",
      visible: true,
      contenido: buildContenido(rows, contexto),
      data: {
        resumen: resumen,
        fortalezas: buildFortalezas(resumen),
        alertas: buildAlertas(resumen),
        acciones: buildAcciones(resumen, contexto)
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
    nombreCompleto: "titulacion-capitulo-analisis-estrategico.js",
    ruta: "Titulacion/frontend/js/capitulos/titulacion-capitulo-analisis-estrategico.js",
    id: MODULE_ID,
    buildResumen: buildResumen,
    buildFortalezas: buildFortalezas,
    buildAlertas: buildAlertas,
    buildAcciones: buildAcciones,
    buildContenido: buildContenido,
    createSection: createSection,
    getDefaultSection: getDefaultSection,
    appendToDocument: appendToDocument
  };

  window.TITULACION_CAPITULOS = window.TITULACION_CAPITULOS || {};
  window.TITULACION_CAPITULOS[MODULE_ID] = api;
  window.TITULACION_CAPITULO_ANALISIS_ESTRATEGICO = api;
})(window);