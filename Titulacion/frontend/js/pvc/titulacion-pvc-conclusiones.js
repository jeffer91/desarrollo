/* =========================================================
Nombre completo: titulacion-pvc-conclusiones.js
Ruta: /Titulacion/frontend/js/pvc/titulacion-pvc-conclusiones.js
Función o funciones:
- Crear conclusiones específicas para períodos PVC.
- Mantener lenguaje centrado en artículo académico.
- Evitar referencias a examen complexivo.
- Registrar el módulo dentro de TITULACION_PVC.
========================================================= */

(function (window) {
  "use strict";

  var MODULE_ID = "pvc-conclusiones";

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

  function createConclusiones(rows) {
    var r = buildResumen(rows);

    return [
      "El período PVC se desarrolló bajo una lógica diferenciada, centrada en el artículo académico como evidencia principal del proceso de titulación.",
      "La cohorte analizada registra " + Number(r.total || 0) + " estudiante(s), de los cuales " + Number(r.aprobados || 0) + " constan como aprobados o habilitados.",
      "El porcentaje general de aprobación o habilitación del artículo académico corresponde al " + Number(r.porcentajeAprobacion || 0) + "%.",
      "Los casos pendientes, no aprobados o retirados deben mantenerse registrados para seguimiento académico, administrativo y documental.",
      "El cierre del proceso PVC debe conservar evidencias de tema, título, revisión, aprobación y resultado final del artículo académico."
    ];
  }

  function createRecomendaciones(rows) {
    var r = buildResumen(rows);
    var recomendaciones = [
      "Conservar la base final de estudiantes PVC como respaldo del proceso.",
      "Mantener archivadas las evidencias de aprobación, revisión y cierre del artículo académico.",
      "Verificar que los documentos generados usen de manera uniforme el término artículo académico."
    ];

    if (Number(r.pendientes || 0) > 0 || Number(r.noAprobados || 0) > 0) {
      recomendaciones.push("Realizar seguimiento a los casos pendientes o no aprobados antes de una nueva emisión documental.");
    }

    return recomendaciones;
  }

  function createSection(args) {
    var options = args || {};
    var rows = Array.isArray(options.rows) ? options.rows : [];

    return {
      id: MODULE_ID,
      titulo: "Conclusiones y Recomendaciones PVC",
      tipo: "pvc-conclusiones",
      visible: true,
      contenido: createConclusiones(rows).concat(createRecomendaciones(rows)),
      data: {
        resumen: buildResumen(rows),
        conclusiones: createConclusiones(rows),
        recomendaciones: createRecomendaciones(rows)
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
    nombreCompleto: "titulacion-pvc-conclusiones.js",
    ruta: "Titulacion/frontend/js/pvc/titulacion-pvc-conclusiones.js",
    id: MODULE_ID,
    buildResumen: buildResumen,
    createConclusiones: createConclusiones,
    createRecomendaciones: createRecomendaciones,
    createSection: createSection,
    appendToDocument: appendToDocument
  };

  window.TITULACION_PVC = window.TITULACION_PVC || {};
  window.TITULACION_PVC[MODULE_ID] = api;
  window.TITULACION_PVC_CONCLUSIONES = api;
})(window);