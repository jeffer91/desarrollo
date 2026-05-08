/* =========================================================
Nombre completo: titulacion-periodo-modalidad.js
Ruta: /Titulacion/frontend/js/clasificacion/titulacion-periodo-modalidad.js
Función o funciones:
- Integrar clasificación de período y modalidad.
- Decidir qué documentos debe generar la app.
- Separar datos en presencial, online o PVC.
- Preparar planes de generación para el exportador PDF.
========================================================= */

(function (window) {
  "use strict";

  function periodoBrain() {
    return window.TITULACION_BRAIN_PERIODO || {};
  }

  function modalidadBrain() {
    return window.TITULACION_BRAIN_MODALIDAD || {};
  }

  function utils() {
    return window.TITULACION_UTILS || {};
  }

  function asText(value) {
    var U = utils();
    if (typeof U.asText === "function") return U.asText(value);
    return String(value == null ? "" : value).trim();
  }

  function classifyPeriodo(periodo) {
    var P = periodoBrain();

    if (typeof P.getPeriodoInfo === "function") {
      return P.getPeriodoInfo(periodo);
    }

    return {
      raw: asText(periodo),
      label: asText(periodo),
      id: asText(periodo).toLowerCase().replace(/\s+/g, "-"),
      tipo: "regular",
      esRegular: true,
      esPVC: false
    };
  }

  function splitRows(rows) {
    var M = modalidadBrain();

    if (typeof M.splitByModalidad === "function") {
      return M.splitByModalidad(rows);
    }

    return {
      presencial: Array.isArray(rows) ? rows : [],
      online: [],
      all: Array.isArray(rows) ? rows : []
    };
  }

  function createDocumentPlan(args) {
    var options = args || {};
    var periodoInfo = classifyPeriodo(options.periodo || options.periodLabel);
    var rows = Array.isArray(options.rows) ? options.rows : [];
    var split = splitRows(rows);
    var plans = [];

    if (periodoInfo.esPVC || periodoInfo.tipo === "pvc") {
      plans.push({
        key: "pvc",
        tipoDocumento: "pvc",
        modalidad: "pvc",
        modalidadLabel: "Programa de Validación de Conocimientos",
        periodo: periodoInfo,
        rows: split.all,
        generar: split.all.length > 0
      });

      return {
        periodo: periodoInfo,
        plans: plans
      };
    }

    if (split.presencial.length > 0) {
      plans.push({
        key: "presencial",
        tipoDocumento: "regular",
        modalidad: "presencial",
        modalidadLabel: "Modalidad Presencial",
        periodo: periodoInfo,
        rows: split.presencial,
        generar: true
      });
    }

    if (split.online.length > 0) {
      plans.push({
        key: "online",
        tipoDocumento: "regular",
        modalidad: "online",
        modalidadLabel: "Modalidad Online",
        periodo: periodoInfo,
        rows: split.online,
        generar: true
      });
    }

    return {
      periodo: periodoInfo,
      plans: plans
    };
  }

  function getMainPlan(args) {
    var result = createDocumentPlan(args);
    var plans = result.plans.filter(function (plan) {
      return plan.generar;
    });

    return plans[0] || null;
  }

  function describePlan(plan) {
    if (!plan) {
      return "No existe plan de generación.";
    }

    if (plan.modalidad === "pvc") {
      return "Generar informe PVC para " + plan.periodo.label + " con " + plan.rows.length + " registro(s).";
    }

    return "Generar informe " + plan.modalidadLabel + " para " + plan.periodo.label + " con " + plan.rows.length + " registro(s).";
  }

  function describePlans(result) {
    var safe = result || {};
    var plans = Array.isArray(safe.plans) ? safe.plans : [];

    return plans.map(describePlan);
  }

  window.TITULACION_PERIODO_MODALIDAD = {
    classifyPeriodo: classifyPeriodo,
    splitRows: splitRows,
    createDocumentPlan: createDocumentPlan,
    getMainPlan: getMainPlan,
    describePlan: describePlan,
    describePlans: describePlans
  };
})(window);