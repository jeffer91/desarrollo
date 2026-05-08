/* =========================================================
Nombre completo: titulacion-capitulo-resultados.js
Ruta: /Titulacion/frontend/js/capitulos/titulacion-capitulo-resultados.js
Función o funciones:
- Crear capítulo de resultados generales.
- Integrar resultados por carrera y por modalidad.
- Preparar datos para tablas y gráficos.
- Ajustar redacción según período regular o PVC.
- Corregir la lectura de contexto cuando llega como { rows, contexto }.
========================================================= */

(function (window) {
  "use strict";

  var MODULE_ID = "resultados";

  function resultadosBrain() {
    return window.TITULACION_BRAIN_RESULTADOS || {};
  }

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

  function buildData(args) {
    var R = resultadosBrain();
    var C = carrerasBrain();
    var list = getRows(args);
    var contexto = getContext(args);

    var resumen =
      typeof R.buildResultadoResumen === "function"
        ? R.buildResultadoResumen(list)
        : {
            total: list.length,
            aprobados: 0,
            pendientes: 0,
            noAprobados: 0,
            retirados: 0,
            porcentajeAprobacion: 0
          };

    var porCarrera =
      typeof R.buildResultadosPorCarrera === "function"
        ? R.buildResultadosPorCarrera(list)
        : [];

    var carreras =
      typeof C.getCarrerasList === "function"
        ? C.getCarrerasList(list)
        : [];

    return {
      contexto: contexto,
      resumen: resumen,
      porCarrera: porCarrera,
      carreras: carreras
    };
  }

  function buildContenido(args) {
    var R = resultadosBrain();
    var data = buildData(args);
    var resumen = data.resumen || {};
    var paragraphs = [];

    if (typeof R.createResultadoParagraphs === "function") {
      paragraphs = R.createResultadoParagraphs(resumen, {
        tipo: isPvc(args) ? "pvc" : "regular"
      });
    } else {
      paragraphs = [
        "La sección de resultados presenta la síntesis del proceso de titulación.",
        "Total analizado: " + Number(resumen.total || 0) + ".",
        "Aprobados o habilitados: " + Number(resumen.aprobados || 0) + ".",
        "Pendientes: " + Number(resumen.pendientes || 0) + "."
      ];
    }

    if (data.porCarrera.length) {
      paragraphs.push("Resultados por carrera:");

      data.porCarrera.forEach(function (item) {
        paragraphs.push(
          item.carrera +
          ": total " +
          Number(item.total || 0) +
          ", aprobados " +
          Number(item.aprobados || 0) +
          ", pendientes " +
          Number(item.pendientes || 0) +
          ", porcentaje de aprobación " +
          Number(item.porcentajeAprobacion || 0) +
          "%."
        );
      });
    }

    return paragraphs;
  }

  function createSection(args) {
    var pvc = isPvc(args);

    return {
      id: MODULE_ID,
      titulo: pvc ? "Resultados del Proceso PVC" : "Resultados",
      tipo: "resultados",
      visible: true,
      contenido: buildContenido(args),
      data: buildData(args)
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
    nombreCompleto: "titulacion-capitulo-resultados.js",
    ruta: "Titulacion/frontend/js/capitulos/titulacion-capitulo-resultados.js",
    id: MODULE_ID,
    buildData: buildData,
    buildContenido: buildContenido,
    createSection: createSection,
    getDefaultSection: getDefaultSection,
    appendToDocument: appendToDocument
  };

  window.TITULACION_CAPITULOS = window.TITULACION_CAPITULOS || {};
  window.TITULACION_CAPITULOS[MODULE_ID] = api;
  window.TITULACION_CAPITULO_RESULTADOS = api;
})(window);