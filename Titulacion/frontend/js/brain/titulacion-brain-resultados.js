/* =========================================================
Nombre completo: titulacion-brain-resultados.js
Ruta: /Titulacion/frontend/js/brain/titulacion-brain-resultados.js
Función o funciones:
- Calcular resultados generales del proceso de titulación.
- Detectar estados: aprobados, pendientes, no aprobados y retirados.
- Calcular porcentajes por carrera y por modalidad.
- Preparar información lista para tablas, gráficos y capítulos.
========================================================= */

(function (window) {
  "use strict";

  function utils() {
    return window.TITULACION_UTILS || {};
  }

  function cohorteBrain() {
    return window.TITULACION_BRAIN_COHORTE || {};
  }

  function carrerasBrain() {
    return window.TITULACION_BRAIN_CARRERAS || {};
  }

  function asText(value) {
    var U = utils();
    if (typeof U.asText === "function") return U.asText(value);
    return String(value == null ? "" : value).trim();
  }

  function normalize(value) {
    var U = utils();
    if (typeof U.normalizeText === "function") return U.normalizeText(value);

    return asText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function percent(value, total) {
    var t = Number(total || 0);
    if (!t) return 0;

    return Math.round((Number(value || 0) / t) * 10000) / 100;
  }

  function normalizeRows(rows) {
    var C = cohorteBrain();

    if (typeof C.normalizeRows === "function") {
      return C.normalizeRows(rows);
    }

    return Array.isArray(rows) ? rows : [];
  }

  function detectStatus(row) {
    var text = normalize([
      row && row.estado,
      row && row.resultado,
      row && row.observacion,
      row && row.observación,
      row && row.titulacion,
      row && row.Titulación,
      row && row.Titulacion
    ].join(" "));

    if (
      text.indexOf("retir") >= 0 ||
      text.indexOf("baja") >= 0 ||
      text.indexOf("abandono") >= 0
    ) {
      return "retirado";
    }

    if (
      text.indexOf("no apro") >= 0 ||
      text.indexOf("reprob") >= 0 ||
      text.indexOf("no habil") >= 0 ||
      text.indexOf("pierde") >= 0 ||
      text.indexOf("perdio") >= 0 ||
      text.indexOf("perdió") >= 0
    ) {
      return "no_aprobado";
    }

    if (
      text.indexOf("pend") >= 0 ||
      text.indexOf("observ") >= 0 ||
      text.indexOf("falta") >= 0 ||
      text.indexOf("incompleto") >= 0
    ) {
      return "pendiente";
    }

    if (
      text.indexOf("apro") >= 0 ||
      text.indexOf("habil") >= 0 ||
      text.indexOf("cumple") >= 0 ||
      text.indexOf("gradu") >= 0 ||
      text.indexOf("finalizado") >= 0
    ) {
      return "aprobado";
    }

    return "pendiente";
  }

  function statusLabel(status) {
    if (status === "aprobado") return "Aprobados";
    if (status === "pendiente") return "Pendientes";
    if (status === "no_aprobado") return "No aprobados";
    if (status === "retirado") return "Retirados";
    return "Sin clasificar";
  }

  function countStatuses(rows) {
    var list = normalizeRows(rows);

    var counts = {
      aprobado: 0,
      pendiente: 0,
      no_aprobado: 0,
      retirado: 0,
      sin_clasificar: 0
    };

    list.forEach(function (row) {
      var status = detectStatus(row);

      if (!counts.hasOwnProperty(status)) {
        counts.sin_clasificar += 1;
      } else {
        counts[status] += 1;
      }
    });

    return counts;
  }

  function buildResultadoResumen(rows) {
    var list = normalizeRows(rows);
    var total = list.length;
    var counts = countStatuses(list);

    return {
      total: total,
      aprobados: counts.aprobado,
      pendientes: counts.pendiente,
      noAprobados: counts.no_aprobado,
      retirados: counts.retirado,
      sinClasificar: counts.sin_clasificar,
      porcentajeAprobacion: percent(counts.aprobado, total),
      porcentajePendientes: percent(counts.pendiente, total),
      porcentajeNoAprobados: percent(counts.no_aprobado, total),
      porcentajeRetirados: percent(counts.retirado, total)
    };
  }

  function buildResultadosPorCarrera(rows) {
    var B = carrerasBrain();
    var groups =
      typeof B.groupByCarrera === "function"
        ? B.groupByCarrera(rows)
        : [];

    return groups.map(function (group) {
      var resumen = buildResultadoResumen(group.rows);

      return Object.assign({}, resumen, {
        carrera: group.carrera,
        carreraId: group.id,
        modalidad: group.modalidad
      });
    });
  }

  function buildResultadosPorModalidad(rows) {
    var list = normalizeRows(rows);

    var presencial = list.filter(function (row) {
      return row.modalidadDetectada === "presencial" || row.esPresencial;
    });

    var online = list.filter(function (row) {
      return row.modalidadDetectada === "online" || row.esOnline;
    });

    return {
      presencial: buildResultadoResumen(presencial),
      online: buildResultadoResumen(online),
      general: buildResultadoResumen(list)
    };
  }

  function createResultadoParagraphs(resultados, contexto) {
    var r = resultados || {};
    var ctx = contexto || {};
    var tipo = asText(ctx.tipoPeriodo || ctx.tipo || "regular");

    if (tipo === "pvc") {
      return [
        "El proceso PVC se analiza considerando el avance y cierre del artículo académico como eje principal de titulación.",
        "La cohorte registra " + Number(r.total || 0) + " estudiante(s), de los cuales " + Number(r.aprobados || 0) + " constan como aprobados o habilitados.",
        "El porcentaje general de aprobación o habilitación es de " + Number(r.porcentajeAprobacion || 0) + "%.",
        "Los casos pendientes o no aprobados deberán mantenerse identificados para seguimiento académico y administrativo."
      ];
    }

    return [
      "El proceso regular de titulación se analiza considerando la aprobación de núcleos, la habilitación y el resultado del examen complexivo cuando corresponda.",
      "La cohorte registra " + Number(r.total || 0) + " estudiante(s), de los cuales " + Number(r.aprobados || 0) + " constan como aprobados o habilitados.",
      "El porcentaje general de aprobación o habilitación es de " + Number(r.porcentajeAprobacion || 0) + "%.",
      "Los casos pendientes, no aprobados o retirados se consolidan para el cierre institucional del proceso."
    ];
  }

  window.TITULACION_BRAIN_RESULTADOS = {
    percent: percent,
    detectStatus: detectStatus,
    statusLabel: statusLabel,
    countStatuses: countStatuses,
    buildResultadoResumen: buildResultadoResumen,
    buildResultadosPorCarrera: buildResultadosPorCarrera,
    buildResultadosPorModalidad: buildResultadosPorModalidad,
    createResultadoParagraphs: createResultadoParagraphs
  };
})(window);