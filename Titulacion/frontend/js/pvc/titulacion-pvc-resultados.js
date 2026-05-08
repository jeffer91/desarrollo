/* =========================================================
Nombre completo: titulacion-pvc-resultados.js
Ruta: /Titulacion/frontend/js/pvc/titulacion-pvc-resultados.js
Función o funciones:
- Crear sección de resultados PVC.
- Analizar aprobación, pendientes y no aprobados del artículo académico.
- Evitar lenguaje de examen complexivo.
- Registrar el módulo dentro de TITULACION_PVC.
========================================================= */

(function (window) {
  "use strict";

  var MODULE_ID = "pvc-resultados";

  function resultadosBrain() {
    return window.TITULACION_BRAIN_RESULTADOS || {};
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

  function createContenido(rows) {
    var resumen = buildResumen(rows);

    return [
      "Los resultados del período PVC se consolidan a partir del estado del artículo académico y de las condiciones institucionales de cierre.",
      "Total de estudiantes analizados: " + Number(resumen.total || 0) + ".",
      "Artículos aprobados o habilitados: " + Number(resumen.aprobados || 0) + ".",
      "Casos pendientes: " + Number(resumen.pendientes || 0) + ".",
      "Casos no aprobados: " + Number(resumen.noAprobados || 0) + ".",
      "Retiros registrados: " + Number(resumen.retirados || 0) + ".",
      "Porcentaje general de aprobación o habilitación: " + Number(resumen.porcentajeAprobacion || 0) + "%."
    ];
  }

  function createSection(args) {
    var options = args || {};
    var rows = Array.isArray(options.rows) ? options.rows : [];

    return {
      id: MODULE_ID,
      titulo: "Resultados del Artículo Académico",
      tipo: "pvc-resultados",
      visible: true,
      contenido: createContenido(rows),
      data: {
        resumen: buildResumen(rows),
        rows: rows
      }
    };
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
    nombreCompleto: "titulacion-pvc-resultados.js",
    ruta: "Titulacion/frontend/js/pvc/titulacion-pvc-resultados.js",
    id: MODULE_ID,
    buildResumen: buildResumen,
    createContenido: createContenido,
    createSection: createSection,
    appendToDocument: appendToDocument
  };

  window.TITULACION_PVC = window.TITULACION_PVC || {};
  window.TITULACION_PVC[MODULE_ID] = api;
  window.TITULACION_PVC_RESULTADOS = api;
})(window);