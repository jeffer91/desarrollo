/* =========================================================
Nombre completo: titulacion-brain-conclusiones.js
Ruta: /Titulacion/frontend/js/brain/titulacion-brain-conclusiones.js
Función o funciones:
- Generar conclusiones automáticas para informes de titulación.
- Ajustar conclusiones según período regular, online, presencial o PVC.
- Usar resultados reales de cohorte y carreras.
- Mantener lenguaje institucional de cierre.
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

  function buildBaseConclusion(contexto) {
    var ctx = contexto || {};
    var periodo = asText(ctx.periodoLabel || ctx.periodo || "el período evaluado");
    var modalidad = asText(ctx.modalidadLabel || ctx.modalidad || "la modalidad correspondiente");

    return "El informe consolida el cierre del proceso de titulación correspondiente a " + periodo + ", considerando la información académica registrada para " + modalidad + ".";
  }

  function buildResultadoConclusion(resultados) {
    var r = resultados || {};
    var total = Number(r.total || 0);
    var aprobados = Number(r.aprobados || 0);
    var pct = Number(r.porcentajeAprobacion || 0);

    return "De un total de " + total + " estudiante(s) analizados, " + aprobados + " constan como aprobados o habilitados, lo que representa un cumplimiento general del " + pct + "%.";
  }

  function buildPendientesConclusion(resultados) {
    var r = resultados || {};
    var pendientes = Number(r.pendientes || 0);
    var noAprobados = Number(r.noAprobados || 0);
    var retirados = Number(r.retirados || 0);

    if (pendientes === 0 && noAprobados === 0 && retirados === 0) {
      return "No se identifican casos pendientes, no aprobados o retirados dentro de la información consolidada para el cierre del proceso.";
    }

    return "Se identifican " + pendientes + " caso(s) pendiente(s), " + noAprobados + " caso(s) no aprobado(s) y " + retirados + " retiro(s), los cuales requieren mantenerse registrados para trazabilidad institucional.";
  }

  function buildTipoProcesoConclusion(contexto) {
    var ctx = contexto || {};
    var tipo = asText(ctx.tipoPeriodo || ctx.tipo || "").toLowerCase();

    if (tipo === "pvc") {
      return "Al tratarse de un período PVC, el análisis se centra en el artículo académico como eje de titulación, evitando mezclarlo con la lógica del examen complexivo.";
    }

    return "Al tratarse de un período regular, el análisis se articula con la planificación institucional de núcleos, habilitación y actividades propias del proceso de titulación.";
  }

  function buildCarrerasConclusion(resultadosPorCarrera) {
    var list = Array.isArray(resultadosPorCarrera) ? resultadosPorCarrera : [];

    if (!list.length) {
      return "No se cuenta con resultados desagregados por carrera en la información procesada.";
    }

    var sorted = list.slice().sort(function (a, b) {
      return Number(b.porcentajeAprobacion || 0) - Number(a.porcentajeAprobacion || 0);
    });

    var top = sorted[0];
    var low = sorted[sorted.length - 1];

    if (!top || !low) {
      return "La información por carrera fue procesada para el análisis institucional del período.";
    }

    return "A nivel de carreras, el mayor porcentaje de aprobación o habilitación corresponde a " + top.carrera + " con " + Number(top.porcentajeAprobacion || 0) + "%, mientras que el menor porcentaje registrado corresponde a " + low.carrera + " con " + Number(low.porcentajeAprobacion || 0) + "%.";
  }

  function build(contexto, resultados, resultadosPorCarrera) {
    return [
      buildBaseConclusion(contexto),
      buildTipoProcesoConclusion(contexto),
      buildResultadoConclusion(resultados),
      buildPendientesConclusion(resultados),
      buildCarrerasConclusion(resultadosPorCarrera)
    ];
  }

  function createSection(contexto, resultados, resultadosPorCarrera) {
    return {
      id: "conclusiones",
      titulo: "Conclusiones",
      tipo: "conclusiones",
      contenido: build(contexto, resultados, resultadosPorCarrera)
    };
  }

  window.TITULACION_BRAIN_CONCLUSIONES = {
    buildBaseConclusion: buildBaseConclusion,
    buildResultadoConclusion: buildResultadoConclusion,
    buildPendientesConclusion: buildPendientesConclusion,
    buildTipoProcesoConclusion: buildTipoProcesoConclusion,
    buildCarrerasConclusion: buildCarrerasConclusion,
    build: build,
    createSection: createSection
  };
})(window);