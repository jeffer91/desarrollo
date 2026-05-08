/* =========================================================
Nombre completo: titulacion-brain-periodo.js
Ruta: /Titulacion/frontend/js/brain/titulacion-brain-periodo.js
Función o funciones:
- Analizar el período ingresado por el usuario o importado desde Excel.
- Detectar mes inicial, mes final y años.
- Clasificar el período como regular o PVC.
- Reconocer como regulares únicamente Abril-Septiembre y Octubre-Marzo.
- Generar identificadores normalizados de período para guardar datos y anexos.
========================================================= */

(function (window) {
  "use strict";

  var MONTHS = [
    { n: 1, key: "enero", label: "Enero" },
    { n: 2, key: "febrero", label: "Febrero" },
    { n: 3, key: "marzo", label: "Marzo" },
    { n: 4, key: "abril", label: "Abril" },
    { n: 5, key: "mayo", label: "Mayo" },
    { n: 6, key: "junio", label: "Junio" },
    { n: 7, key: "julio", label: "Julio" },
    { n: 8, key: "agosto", label: "Agosto" },
    { n: 9, key: "septiembre", label: "Septiembre" },
    { n: 10, key: "octubre", label: "Octubre" },
    { n: 11, key: "noviembre", label: "Noviembre" },
    { n: 12, key: "diciembre", label: "Diciembre" }
  ];

  function utils() {
    return window.TITULACION_UTILS || {};
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

  function sanitizeFolder(value) {
    var U = utils();
    if (typeof U.sanitizeFolder === "function") return U.sanitizeFolder(value);

    return normalize(value)
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "sin-periodo";
  }

  function findMonthByName(value) {
    var text = normalize(value);

    for (var i = 0; i < MONTHS.length; i += 1) {
      if (text.indexOf(MONTHS[i].key) >= 0) {
        return Object.assign({}, MONTHS[i]);
      }
    }

    return null;
  }

  function getMonthByNumber(number) {
    var n = Number(number);

    for (var i = 0; i < MONTHS.length; i += 1) {
      if (MONTHS[i].n === n) {
        return Object.assign({}, MONTHS[i]);
      }
    }

    return null;
  }

  function extractYears(value) {
    var text = asText(value);
    var matches = text.match(/\b(20\d{2})\b/g) || [];
    var years = matches.map(function (year) {
      return Number(year);
    });

    return {
      inicio: years.length > 0 ? years[0] : null,
      fin: years.length > 1 ? years[1] : years[0] || null,
      all: years
    };
  }

  function extractMonths(value) {
    var text = normalize(value);
    var found = [];

    MONTHS.forEach(function (month) {
      if (text.indexOf(month.key) >= 0) {
        found.push(Object.assign({}, month));
      }
    });

    return found;
  }

  function parsePeriodoLabel(value) {
    var label = asText(value);
    var months = extractMonths(label);
    var years = extractYears(label);

    var inicio = months[0] || null;
    var fin = months.length > 1 ? months[1] : months[0] || null;

    return {
      raw: label,
      inicioMes: inicio ? inicio.n : null,
      inicioMesLabel: inicio ? inicio.label : "",
      finMes: fin ? fin.n : null,
      finMesLabel: fin ? fin.label : "",
      inicioAnio: years.inicio,
      finAnio: years.fin,
      years: years.all
    };
  }

  function isAbrilSeptiembre(info) {
    return Number(info.inicioMes) === 4 && Number(info.finMes) === 9;
  }

  function isOctubreMarzo(info) {
    return Number(info.inicioMes) === 10 && Number(info.finMes) === 3;
  }

  function isRegular(info) {
    return isAbrilSeptiembre(info) || isOctubreMarzo(info);
  }

  function getRegularId(info) {
    if (isAbrilSeptiembre(info)) return "abril-septiembre";
    if (isOctubreMarzo(info)) return "octubre-marzo";
    return "";
  }

  function getRegularLabel(info) {
    if (isAbrilSeptiembre(info)) return "Abril - Septiembre";
    if (isOctubreMarzo(info)) return "Octubre - Marzo";
    return "";
  }

  function buildPeriodLabel(info) {
    var start = asText(info.inicioMesLabel);
    var end = asText(info.finMesLabel);
    var startYear = info.inicioAnio ? String(info.inicioAnio) : "";
    var endYear = info.finAnio ? String(info.finAnio) : "";

    if (start && end && startYear && endYear) {
      return start + " " + startYear + " a " + end + " " + endYear;
    }

    if (start && end) {
      return start + " a " + end;
    }

    return asText(info.raw) || "Sin período";
  }

  function buildPeriodId(info) {
    var label = buildPeriodLabel(info);
    return sanitizeFolder(label);
  }

  function classifyPeriodo(value) {
    var info = parsePeriodoLabel(value);
    var regular = isRegular(info);
    var tipo = regular ? "regular" : "pvc";

    return Object.assign({}, info, {
      tipo: tipo,
      esRegular: regular,
      esPVC: !regular,
      periodoRegularId: getRegularId(info),
      periodoRegularLabel: getRegularLabel(info),
      label: buildPeriodLabel(info),
      id: buildPeriodId(info)
    });
  }

  function classifyFromDates(startMonth, endMonth, startYear, endYear) {
    var inicio = getMonthByNumber(startMonth);
    var fin = getMonthByNumber(endMonth);

    return classifyPeriodo([
      inicio ? inicio.label : "",
      startYear || "",
      "a",
      fin ? fin.label : "",
      endYear || ""
    ].join(" "));
  }

  function getPeriodoInfo(input) {
    if (typeof input === "string") {
      return classifyPeriodo(input);
    }

    var safe = input || {};

    if (safe.periodo || safe.periodLabel) {
      return classifyPeriodo(safe.periodo || safe.periodLabel);
    }

    if (safe.inicioMes && safe.finMes) {
      return classifyFromDates(
        safe.inicioMes,
        safe.finMes,
        safe.inicioAnio,
        safe.finAnio
      );
    }

    return classifyPeriodo("");
  }

  window.TITULACION_BRAIN_PERIODO = {
    months: MONTHS.slice(),
    findMonthByName: findMonthByName,
    getMonthByNumber: getMonthByNumber,
    extractYears: extractYears,
    extractMonths: extractMonths,
    parsePeriodoLabel: parsePeriodoLabel,
    classifyPeriodo: classifyPeriodo,
    classifyFromDates: classifyFromDates,
    getPeriodoInfo: getPeriodoInfo,
    isRegular: isRegular,
    buildPeriodId: buildPeriodId,
    buildPeriodLabel: buildPeriodLabel
  };
})(window);