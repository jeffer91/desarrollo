/* =========================================================
Nombre completo: titulacion-resumen-tecnico.js
Ruta: /Titulacion/frontend/js/documentos/titulacion-resumen-tecnico.js
Función o funciones:
- Crear resumen técnico del informe generado.
- Registrar período, modalidad, número de carreras y estudiantes.
- Explicar el criterio de clasificación regular, online o PVC.
- Servir como sección inicial después del índice.
========================================================= */

(function (window) {
  "use strict";

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

    return String(value == null ? "" : value).trim();
  }

  function buildResumenData(args) {
    var options = args || {};
    var rows = Array.isArray(options.rows) ? options.rows : [];
    var contexto = options.contexto || {};
    var R = resultadosBrain();
    var C = carrerasBrain();

    var resultados =
      typeof R.buildResultadoResumen === "function"
        ? R.buildResultadoResumen(rows)
        : {
            total: rows.length,
            aprobados: 0,
            pendientes: 0,
            porcentajeAprobacion: 0
          };

    var carreras =
      typeof C.getCarrerasList === "function"
        ? C.getCarrerasList(rows)
        : [];

    return {
      periodo: asText(contexto.periodoLabel || contexto.periodo || ""),
      modalidad: asText(contexto.modalidadLabel || contexto.modalidad || ""),
      tipoPeriodo: asText(contexto.tipoPeriodo || contexto.tipo || ""),
      totalEstudiantes: Number(resultados.total || 0),
      totalCarreras: carreras.length,
      aprobados: Number(resultados.aprobados || 0),
      pendientes: Number(resultados.pendientes || 0),
      noAprobados: Number(resultados.noAprobados || 0),
      retirados: Number(resultados.retirados || 0),
      porcentajeAprobacion: Number(resultados.porcentajeAprobacion || 0),
      carreras: carreras,
      resultados: resultados
    };
  }

  function buildParagraphs(args) {
    var data = buildResumenData(args);
    var tipo = data.tipoPeriodo.toLowerCase();

    var paragraphs = [
      "El presente resumen técnico consolida la información general utilizada para generar el informe final del proceso de titulación.",
      "Período evaluado: " + (data.periodo || "No especificado") + ".",
      "Tipo de informe: " + (data.modalidad || "No especificado") + ".",
      "La base procesada contiene " + data.totalEstudiantes + " estudiante(s) distribuidos en " + data.totalCarreras + " carrera(s).",
      "El resultado general registra " + data.aprobados + " caso(s) aprobados o habilitados, " + data.pendientes + " pendiente(s), " + data.noAprobados + " no aprobado(s) y " + data.retirados + " retirado(s)."
    ];

    if (tipo === "pvc") {
      paragraphs.push("La clasificación del período corresponde a PVC; por tanto, el tratamiento documental se orienta al artículo académico y no al examen complexivo.");
    } else {
      paragraphs.push("La clasificación del período corresponde a un período regular; por tanto, el tratamiento documental considera núcleos, habilitación y proceso de titulación regular.");
    }

    return paragraphs;
  }

  function createSection(args) {
    return {
      id: "resumen-tecnico",
      titulo: "Resumen técnico",
      tipo: "resumen-tecnico",
      visible: true,
      data: buildResumenData(args),
      contenido: buildParagraphs(args)
    };
  }

  window.TITULACION_RESUMEN_TECNICO = {
    buildResumenData: buildResumenData,
    buildParagraphs: buildParagraphs,
    createSection: createSection
  };
})(window);