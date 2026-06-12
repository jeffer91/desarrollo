/* =========================================================
Nombre completo: memcom.sequence.js
Ruta: /screens/memcom/memcom.sequence.js
Función o funciones:
- Gestionar la reserva de números mensuales para memorandos.
- Calcular el año y mes del memorando desde el período seleccionado.
- Aplicar la regla institucional: fecha del memorando = fecha de fin del período menos 3 meses.
- Usar memcom.memo-store.js cuando esté disponible.
- Mantener un respaldo local compatible si el memo-store no carga.
- Generar el formato correcto MEM-ITSQMET-UTET-YYYY-MM-XX.
- Liberar reservas si falla la generación del PDF.
========================================================= */

(function (window) {
  "use strict";

  window.MEMCOM = window.MEMCOM || {};

  var FALLBACK_KEY = "MEMCOM_SEQUENCE_MONTHLY_V3_FALLBACK";

  var MONTHS_ES = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre"
  ];

  var MONTH_NAME_TO_NUMBER = {
    enero: 1,
    febrero: 2,
    marzo: 3,
    abril: 4,
    mayo: 5,
    junio: 6,
    julio: 7,
    agosto: 8,
    septiembre: 9,
    setiembre: 9,
    octubre: 10,
    noviembre: 11,
    diciembre: 12
  };

  function pad2(value) {
    var n = parseInt(value, 10);

    if (isNaN(n) || n < 1) {
      return "01";
    }

    return n < 10 ? "0" + n : String(n);
  }

  function isValidDate(value) {
    return value instanceof Date && !isNaN(value.getTime());
  }

  function normalizeText(value) {
    return String(value || "")
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function getDateParts(dateValue) {
    var date = isValidDate(dateValue) ? dateValue : new Date();

    if (isNaN(date.getTime())) {
      date = new Date();
    }

    var year = date.getFullYear();
    var month = pad2(date.getMonth() + 1);
    var day = pad2(date.getDate());

    return {
      year: year,
      month: month,
      day: day,
      codigoMes: year + "-" + month,
      fechaIso: year + "-" + month + "-" + day
    };
  }

  function getFechaHumana(dateValue) {
    var date = isValidDate(dateValue) ? dateValue : new Date();

    if (isNaN(date.getTime())) {
      date = new Date();
    }

    return date.getDate() + " de " + MONTHS_ES[date.getMonth()] + " de " + date.getFullYear();
  }

  function buildLocalDate(year, monthNumber, day) {
    var y = parseInt(year, 10);
    var m = parseInt(monthNumber, 10);
    var d = parseInt(day || 1, 10);

    if (isNaN(y) || isNaN(m) || m < 1 || m > 12) {
      return null;
    }

    return new Date(y, m - 1, isNaN(d) ? 1 : d, 12, 0, 0, 0);
  }

  function subtractMonths(dateValue, monthsToSubtract) {
    if (!isValidDate(dateValue)) {
      return null;
    }

    return new Date(
      dateValue.getFullYear(),
      dateValue.getMonth() - monthsToSubtract,
      1,
      12,
      0,
      0,
      0
    );
  }

  function parsePeriodoEndFromNumeric(value) {
    var text = String(value || "").trim();
    var match = /^(\d{4})\D+(\d{1,2})\D+(\d{4})\D+(\d{1,2})$/.exec(text);

    if (match) {
      return buildLocalDate(match[3], match[4], 1);
    }

    var all = [];
    var regex = /(\d{4})\D+(\d{1,2})/g;
    var item;

    while ((item = regex.exec(text)) !== null) {
      all.push({ year: item[1], month: item[2] });
    }

    if (all.length > 0) {
      var last = all[all.length - 1];
      return buildLocalDate(last.year, last.month, 1);
    }

    return null;
  }

  function parsePeriodoEndFromHumanText(value) {
    var original = String(value || "").trim();
    var text = normalizeText(original);

    if (!text) {
      return null;
    }

    var parts = text.split(/\s+a\s+/i);
    var endPart = parts.length > 1 ? parts[parts.length - 1] : text;
    var yearMatch = endPart.match(/(20\d{2}|19\d{2})/);

    if (!yearMatch) {
      var allYears = text.match(/(20\d{2}|19\d{2})/g);
      yearMatch = allYears && allYears.length ? [allYears[allYears.length - 1]] : null;
    }

    if (!yearMatch) {
      return null;
    }

    var monthNumber = null;

    Object.keys(MONTH_NAME_TO_NUMBER).some(function (monthName) {
      var regex = new RegExp("\\b" + monthName + "\\b", "i");

      if (regex.test(endPart)) {
        monthNumber = MONTH_NAME_TO_NUMBER[monthName];
        return true;
      }

      return false;
    });

    if (!monthNumber) {
      Object.keys(MONTH_NAME_TO_NUMBER).forEach(function (monthName) {
        var regex = new RegExp("\\b" + monthName + "\\b", "i");

        if (regex.test(text)) {
          monthNumber = MONTH_NAME_TO_NUMBER[monthName];
        }
      });
    }

    if (!monthNumber) {
      return null;
    }

    return buildLocalDate(yearMatch[0], monthNumber, 1);
  }

  function getPeriodoEndDate(periodoValue) {
    var numericDate = parsePeriodoEndFromNumeric(periodoValue);

    if (numericDate) {
      return numericDate;
    }

    return parsePeriodoEndFromHumanText(periodoValue);
  }

  function getMemoDateFromPeriodo(periodoValue) {
    var endDate = getPeriodoEndDate(periodoValue);

    if (!endDate) {
      return null;
    }

    return subtractMonths(endDate, 3);
  }

  function resolveMemoDate(metadata, explicitDateValue) {
    if (isValidDate(explicitDateValue)) {
      return explicitDateValue;
    }

    if (typeof explicitDateValue === "string" && explicitDateValue.trim()) {
      var parsedExplicit = new Date(explicitDateValue + "T12:00:00");

      if (isValidDate(parsedExplicit)) {
        return parsedExplicit;
      }
    }

    metadata = normalizeMetadata(metadata);

    var source =
      metadata.periodoLabel ||
      metadata.periodo ||
      metadata.periodoId ||
      "";

    var memoDate = getMemoDateFromPeriodo(source);

    if (memoDate) {
      return memoDate;
    }

    return new Date();
  }

  function normalizeMetadata(metadata) {
    metadata = metadata || {};

    return {
      tipo: metadata.tipo || "EXAMEN COMPLEXIVO",
      periodo: metadata.periodo || metadata.periodoLabel || "",
      periodoLabel: metadata.periodoLabel || metadata.periodo || "",
      periodoId: metadata.periodoId || "",
      cronogramaHash: metadata.cronogramaHash || "",
      reglaFechaMemo: metadata.reglaFechaMemo || "FIN_PERIODO_MENOS_3_MESES"
    };
  }

  function getEmptyFallbackStore() {
    return {
      version: 3,
      months: {},
      issued: []
    };
  }

  function loadFallbackStore() {
    try {
      var raw = localStorage.getItem(FALLBACK_KEY);

      if (!raw) {
        return getEmptyFallbackStore();
      }

      var parsed = JSON.parse(raw);

      if (!parsed || typeof parsed !== "object") {
        return getEmptyFallbackStore();
      }

      if (!parsed.months || typeof parsed.months !== "object") {
        parsed.months = {};
      }

      if (!Array.isArray(parsed.issued)) {
        parsed.issued = [];
      }

      parsed.version = 3;

      return parsed;
    } catch (error) {
      console.error("[MEMCOM_SEQUENCE] No se pudo leer fallback:", error);
      return getEmptyFallbackStore();
    }
  }

  function saveFallbackStore(store) {
    try {
      localStorage.setItem(FALLBACK_KEY, JSON.stringify(store));
    } catch (error) {
      console.error("[MEMCOM_SEQUENCE] No se pudo guardar fallback:", error);
    }
  }

  function buildFallbackInfo(number, parts, metadata, token) {
    var correlativo = pad2(number);
    var codigoCompleto = "MEM-ITSQMET-UTET-" + parts.codigoMes + "-" + correlativo;

    return {
      codigoCompleto: codigoCompleto,
      codigo: codigoCompleto,
      codigoMes: parts.codigoMes,
      correlativo: correlativo,
      numero: number,
      fechaIso: parts.fechaIso,
      fechaHumana: getFechaHumana(new Date(parts.fechaIso + "T12:00:00")),
      tipo: metadata.tipo,
      periodo: metadata.periodo,
      periodoId: metadata.periodoId,
      cronogramaHash: metadata.cronogramaHash,
      reglaFechaMemo: metadata.reglaFechaMemo,
      reused: false,
      source: "sequence-fallback",
      token: token || {
        source: "sequence-fallback",
        codigoMes: parts.codigoMes,
        numero: number,
        correlativo: correlativo,
        codigoCompleto: codigoCompleto,
        createdAt: new Date().toISOString(),
        reused: false
      }
    };
  }

  function reserveFallback(metadata, dateValue) {
    var parts = getDateParts(dateValue);
    var store = loadFallbackStore();
    var current = parseInt(store.months[parts.codigoMes] || 0, 10);

    if (isNaN(current) || current < 0) {
      current = 0;
    }

    var next = current + 1;
    var createdAt = new Date().toISOString();

    store.months[parts.codigoMes] = next;

    var token = {
      source: "sequence-fallback",
      codigoMes: parts.codigoMes,
      numero: next,
      correlativo: pad2(next),
      codigoCompleto: "MEM-ITSQMET-UTET-" + parts.codigoMes + "-" + pad2(next),
      createdAt: createdAt,
      reused: false
    };

    store.issued.push({
      codigoMes: parts.codigoMes,
      numero: next,
      correlativo: pad2(next),
      codigoCompleto: token.codigoCompleto,
      fechaIso: parts.fechaIso,
      fechaHumana: getFechaHumana(new Date(parts.fechaIso + "T12:00:00")),
      tipo: metadata.tipo,
      periodo: metadata.periodo,
      periodoId: metadata.periodoId,
      cronogramaHash: metadata.cronogramaHash,
      reglaFechaMemo: metadata.reglaFechaMemo,
      estado: "EMITIDO",
      createdAt: createdAt
    });

    saveFallbackStore(store);

    return Promise.resolve(buildFallbackInfo(next, parts, metadata, token));
  }

  function releaseFallback(token) {
    if (!token || token.source !== "sequence-fallback" || token.reused) {
      return Promise.resolve(false);
    }

    var store = loadFallbackStore();
    var current = parseInt(store.months[token.codigoMes] || 0, 10);
    var numero = parseInt(token.numero, 10);

    if (!isNaN(current) && !isNaN(numero) && current === numero) {
      store.months[token.codigoMes] = Math.max(0, current - 1);
    }

    for (var i = store.issued.length - 1; i >= 0; i--) {
      if (
        store.issued[i].codigoMes === token.codigoMes &&
        parseInt(store.issued[i].numero, 10) === numero
      ) {
        store.issued[i].estado = "ANULADO";
        store.issued[i].updatedAt = new Date().toISOString();
        break;
      }
    }

    saveFallbackStore(store);

    return Promise.resolve(true);
  }

  function parseGetNextArguments(firstArg, secondArg) {
    if (isValidDate(firstArg) || typeof firstArg === "string") {
      return {
        metadata: normalizeMetadata({}),
        dateValue: firstArg
      };
    }

    return {
      metadata: normalizeMetadata(firstArg || {}),
      dateValue: secondArg
    };
  }

  function getNextInfo(firstArg, secondArg) {
    var args = parseGetNextArguments(firstArg, secondArg);
    var dateValue = resolveMemoDate(args.metadata, args.dateValue);

    if (
      window.MEMCOM.memoStore &&
      typeof window.MEMCOM.memoStore.getNextLocalInfo === "function"
    ) {
      return window.MEMCOM.memoStore.getNextLocalInfo(dateValue);
    }

    var parts = getDateParts(dateValue);
    var store = loadFallbackStore();
    var current = parseInt(store.months[parts.codigoMes] || 0, 10);

    if (isNaN(current) || current < 0) {
      current = 0;
    }

    return buildFallbackInfo(current + 1, parts, args.metadata, null);
  }

  function reserve(metadata, dateValue) {
    var normalized = normalizeMetadata(metadata);
    var memoDate = resolveMemoDate(normalized, dateValue);

    if (
      window.MEMCOM.memoStore &&
      typeof window.MEMCOM.memoStore.reserve === "function"
    ) {
      return window.MEMCOM.memoStore.reserve(normalized, memoDate);
    }

    return reserveFallback(normalized, memoDate);
  }

  function release(token) {
    if (
      window.MEMCOM.memoStore &&
      typeof window.MEMCOM.memoStore.release === "function"
    ) {
      return window.MEMCOM.memoStore.release(token);
    }

    return releaseFallback(token);
  }

  window.MEMCOM.sequence = {
    getDateParts: getDateParts,
    getFechaHumana: getFechaHumana,
    getPeriodoEndDate: getPeriodoEndDate,
    getMemoDateFromPeriodo: getMemoDateFromPeriodo,
    resolveMemoDate: resolveMemoDate,
    getNextInfo: getNextInfo,
    reserve: reserve,
    release: release,
    normalizeMetadata: normalizeMetadata
  };
})(window);