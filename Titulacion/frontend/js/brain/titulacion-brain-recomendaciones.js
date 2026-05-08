/* =========================================================
Nombre completo: titulacion-brain-recomendaciones.js
Ruta: /Titulacion/frontend/js/brain/titulacion-brain-recomendaciones.js
Función o funciones:
- Generar recomendaciones automáticas del informe final de titulación.
- Ajustar recomendaciones según período regular o PVC.
- Incorporar seguimiento de casos pendientes.
- Mantener lenguaje institucional, claro y accionable.
========================================================= */

(function (window) {
  "use strict";

  function asText(value) {
    if (
      window.TITULACION_UTILS &&
      typeof window.TITULACION_UTILS.asText === "function"
    ) {
      return window.TITULACION_UTILS.asText(value);
    }

    return String(value == null ? "" : value).trim();
  }

  function buildGeneralRecommendations() {
    return [
      "Conservar la base de datos final del período evaluado como respaldo institucional del proceso de titulación.",
      "Mantener anexadas las evidencias documentales utilizadas para sustentar los resultados del informe.",
      "Registrar formalmente los estudiantes aprobados, pendientes, no aprobados o retirados para fines de trazabilidad académica.",
      "Verificar que los resultados por carrera coincidan con los registros oficiales antes de la emisión final del documento."
    ];
  }

  function buildPendingRecommendation(resultados) {
    var r = resultados || {};
    var pendientes = Number(r.pendientes || 0);
    var noAprobados = Number(r.noAprobados || 0);

    if (pendientes === 0 && noAprobados === 0) {
      return "Mantener el procedimiento de cierre aplicado, debido a que no se registran casos pendientes o no aprobados en la información consolidada.";
    }

    return "Realizar seguimiento académico y administrativo a los " + pendientes + " caso(s) pendiente(s) y " + noAprobados + " caso(s) no aprobado(s), conforme a la normativa institucional vigente.";
  }

  function buildTipoRecommendation(contexto) {
    var ctx = contexto || {};
    var tipo = asText(ctx.tipoPeriodo || ctx.tipo || "").toLowerCase();

    if (tipo === "pvc") {
      return "Para períodos PVC, mantener la revisión diferenciada del artículo académico y evitar reportes que incorporen componentes propios del examen complexivo.";
    }

    return "Para períodos regulares, verificar la coherencia entre núcleos, habilitación, resultados finales y registros académicos antes del cierre definitivo.";
  }

  function buildEvidenceRecommendation() {
    return "Asegurar que las evidencias anexas se encuentren cargadas por período, modalidad y tipo de documento, de modo que puedan recuperarse en futuras verificaciones.";
  }

  function build(contexto, resultados) {
    var base = buildGeneralRecommendations();

    base.push(buildPendingRecommendation(resultados));
    base.push(buildTipoRecommendation(contexto));
    base.push(buildEvidenceRecommendation());

    return base;
  }

  function createSection(contexto, resultados) {
    return {
      id: "recomendaciones",
      titulo: "Recomendaciones",
      tipo: "recomendaciones",
      contenido: build(contexto, resultados)
    };
  }

  window.TITULACION_BRAIN_RECOMENDACIONES = {
    buildGeneralRecommendations: buildGeneralRecommendations,
    buildPendingRecommendation: buildPendingRecommendation,
    buildTipoRecommendation: buildTipoRecommendation,
    buildEvidenceRecommendation: buildEvidenceRecommendation,
    build: build,
    createSection: createSection
  };
})(window);