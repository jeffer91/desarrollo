/*
Nombre del archivo: stats.periods.js
Ruta: stats/backend/stats.periods.js
Función:
- Normaliza y resuelve períodos desde distintas estructuras
- Soporta fechas ISO, YYYY-MM-DD, DD/MM/YYYY, MM/YYYY y Timestamp de Firestore
- Busca períodos por fecha, id o label
- Compara selección de períodos de forma segura
*/

(function attachStatsPeriods(window) {
  "use strict";

  window.STATS = window.STATS || {};

  function asString(value, fallback) {
    if (value == null) return fallback || "";
    return String(value).trim();
  }

  function asNumber(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (fallback || 0);
  }

  function asArray(value) {
    return Array.isArray(value) ? value.slice() : [];
  }

  function canonical(value) {
    return asString(value, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function pad2(value) {
    var raw = asString(value, "");
    if (!raw) return "";
    return raw.padStart(2, "0");
  }

  function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function extractDateLike(value) {
    if (value == null) return "";

    if (value instanceof Date && !isNaN(value.getTime())) {
      return value.toISOString();
    }

    if (typeof value === "string") {
      return value.trim();
    }

    if (typeof value === "number") {
      var fromMs = new Date(value);
      if (!isNaN(fromMs.getTime())) return fromMs.toISOString();
      return "";
    }

    if (isObject(value)) {
      if (typeof value.toDate === "function") {
        try {
          var dt = value.toDate();
          if (dt instanceof Date && !isNaN(dt.getTime())) {
            return dt.toISOString();
          }
        } catch (_errorToDate) {
          /* noop */
        }
      }

      if (typeof value.seconds === "number") {
        return new Date(value.seconds * 1000).toISOString();
      }

      if (typeof value._seconds === "number") {
        return new Date(value._seconds * 1000).toISOString();
      }

      if (typeof value.nanoseconds === "number" && typeof value.seconds === "number") {
        return new Date((value.seconds * 1000) + Math.floor(value.nanoseconds / 1000000)).toISOString();
      }

      if (typeof value._nanoseconds === "number" && typeof value._seconds === "number") {
        return new Date((value._seconds * 1000) + Math.floor(value._nanoseconds / 1000000)).toISOString();
      }

      if (value.iso) return asString(value.iso, "");
      if (value.value) return extractDateLike(value.value);
      if (value.fecha) return extractDateLike(value.fecha);
      if (value.fechaInicio) return extractDateLike(value.fechaInicio);
      if (value.startDate) return extractDateLike(value.startDate);
    }

    return "";
  }

  function parseDateParts(value) {
    var raw = extractDateLike(value);
    if (!raw) return null;

    var isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
      return {
        year: Number(isoMatch[1]),
        month: Number(isoMatch[2]),
        day: Number(isoMatch[3])
      };
    }

    var dmyMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (dmyMatch) {
      return {
        year: Number(dmyMatch[3]),
        month: Number(dmyMatch[2]),
        day: Number(dmyMatch[1])
      };
    }

    var myMatch = raw.match(/^(\d{2})\/(\d{4})$/);
    if (myMatch) {
      return {
        year: Number(myMatch[2]),
        month: Number(myMatch[1]),
        day: 1
      };
    }

    var parsed = new Date(raw);
    if (!isNaN(parsed.getTime())) {
      return {
        year: parsed.getUTCFullYear(),
        month: parsed.getUTCMonth() + 1,
        day: parsed.getUTCDate()
      };
    }

    return null;
  }

  function toUtcDate(parts) {
    if (!parts || !parts.year || !parts.month || !parts.day) return null;
    var dt = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    return isNaN(dt.getTime()) ? null : dt;
  }

  function firstDayUtc(year, month) {
    if (!year || !month) return null;
    return new Date(Date.UTC(year, month - 1, 1));
  }

  function lastDayUtc(year, month) {
    if (!year || !month) return null;
    return new Date(Date.UTC(year, month, 0));
  }

  function buildPeriodoLabel(periodo) {
    if (!periodo || typeof periodo !== "object") return "";

    var mesIni = pad2(periodo.mesIni);
    var anioIni = asString(periodo.anioIni, "");
    var mesFin = pad2(periodo.mesFin);
    var anioFin = asString(periodo.anioFin, "");

    if (!mesIni || !anioIni || !mesFin || !anioFin) return "";
    return mesIni + "/" + anioIni + " - " + mesFin + "/" + anioFin;
  }

  function normalizePeriodoRecord(item) {
    var raw = item && item.data ? item.data : item;
    if (!raw || typeof raw !== "object") return null;

    var id = asString((item && item.id) || raw.id || raw.periodoId || raw.key, "");
    var label = asString(raw.periodoLabel || raw.label || raw.nombre, "");

    var anioIni = asNumber(
      raw.anioIni != null ? raw.anioIni : raw.yearIni != null ? raw.yearIni : raw.anioInicio,
      0
    );
    var mesIni = pad2(
      raw.mesIni != null ? raw.mesIni : raw.monthIni != null ? raw.monthIni : raw.mesInicio
    );
    var anioFin = asNumber(
      raw.anioFin != null ? raw.anioFin : raw.yearFin != null ? raw.yearFin : raw.anioFin,
      0
    );
    var mesFin = pad2(
      raw.mesFin != null ? raw.mesFin : raw.monthFin != null ? raw.monthFin : raw.mesFin
    );

    if ((!anioIni || !mesIni || !anioFin || !mesFin) && label) {
      var labelMatch = label.match(/^(\d{2})\/(\d{4})\s*-\s*(\d{2})\/(\d{4})$/);
      if (labelMatch) {
        mesIni = mesIni || labelMatch[1];
        anioIni = anioIni || Number(labelMatch[2]);
        mesFin = mesFin || labelMatch[3];
        anioFin = anioFin || Number(labelMatch[4]);
      }
    }

    if (!label && anioIni && mesIni && anioFin && mesFin) {
      label = buildPeriodoLabel({
        anioIni: anioIni,
        mesIni: mesIni,
        anioFin: anioFin,
        mesFin: mesFin
      });
    }

    if (!label) return null;

    return {
      id: id,
      anioIni: anioIni,
      mesIni: mesIni,
      anioFin: anioFin,
      mesFin: mesFin,
      periodoLabel: label,
      startDate: firstDayUtc(anioIni, Number(mesIni)),
      endDate: lastDayUtc(anioFin, Number(mesFin)),
      raw: raw
    };
  }

  function getStoreState() {
    if (window.STATS && window.STATS.Store) {
      if (typeof window.STATS.Store.getState === "function") {
        return window.STATS.Store.getState() || {};
      }
      if (typeof window.STATS.Store.get === "function") {
        return window.STATS.Store.get() || {};
      }
      if (window.STATS.Store.state && typeof window.STATS.Store.state === "object") {
        return window.STATS.Store.state;
      }
    }
    return {};
  }

  function collectPeriodosFromSources(explicitList) {
    var candidates = [];
    var state = getStoreState();

    if (Array.isArray(explicitList)) {
      candidates = candidates.concat(explicitList);
    }

    if (Array.isArray(state.periodos)) {
      candidates = candidates.concat(state.periodos);
    }

    if (state.rawData && Array.isArray(state.rawData.periodos)) {
      candidates = candidates.concat(state.rawData.periodos);
    }

    if (state.data && Array.isArray(state.data.periodos)) {
      candidates = candidates.concat(state.data.periodos);
    }

    if (window.STATS.Data && Array.isArray(window.STATS.Data.periodos)) {
      candidates = candidates.concat(window.STATS.Data.periodos);
    }

    var used = {};
    return candidates
      .map(normalizePeriodoRecord)
      .filter(Boolean)
      .filter(function dedupe(item) {
        var key = item.id || item.periodoLabel;
        if (!key) return false;
        if (used[key]) return false;
        used[key] = true;
        return true;
      })
      .sort(function sortByStart(a, b) {
        var at = a.startDate ? a.startDate.getTime() : 0;
        var bt = b.startDate ? b.startDate.getTime() : 0;
        return at - bt;
      });
  }

  function listPeriodos(explicitList) {
    return collectPeriodosFromSources(explicitList);
  }

  function findPeriodoByLabel(label, explicitList) {
    var wanted = canonical(label);
    if (!wanted) return null;

    var items = listPeriodos(explicitList);
    for (var i = 0; i < items.length; i += 1) {
      if (canonical(items[i].periodoLabel) === wanted) return items[i];
    }
    return null;
  }

  function findPeriodoById(id, explicitList) {
    var wanted = canonical(id);
    if (!wanted) return null;

    var items = listPeriodos(explicitList);
    for (var i = 0; i < items.length; i += 1) {
      if (canonical(items[i].id) === wanted) return items[i];
    }
    return null;
  }

  function findPeriodoByFechaInicio(value, explicitList) {
    var parts = parseDateParts(value);
    var dt = toUtcDate(parts);
    if (!dt) return null;

    var items = listPeriodos(explicitList);
    for (var i = 0; i < items.length; i += 1) {
      var item = items[i];
      if (!item.startDate || !item.endDate) continue;
      if (dt >= item.startDate && dt <= item.endDate) return item;
    }

    return null;
  }

  function parsePeriodoLabel(value) {
    var raw = asString(value, "");
    if (!raw) return null;

    var match = raw.match(/^(\d{2})\/(\d{4})\s*-\s*(\d{2})\/(\d{4})$/);
    if (!match) return null;

    return {
      mesIni: match[1],
      anioIni: Number(match[2]),
      mesFin: match[3],
      anioFin: Number(match[4])
    };
  }

  function normalizeSelection(selection) {
    if (Array.isArray(selection)) {
      return selection
        .map(function each(item) { return asString(item, ""); })
        .filter(Boolean)
        .filter(function onlyReal(item) {
          var key = canonical(item);
          return key && key !== "todos" && key !== "todo";
        });
    }

    var single = asString(selection, "");
    if (!single) return [];
    if (canonical(single) === "todos" || canonical(single) === "todo") return [];
    return [single];
  }

  function matchPeriodoSelection(periodoLabel, selection) {
    var current = asString(periodoLabel, "");
    var wanted = normalizeSelection(selection);

    if (!wanted.length) return true;
    if (!current) return false;

    var currentKey = canonical(current);
    for (var i = 0; i < wanted.length; i += 1) {
      if (currentKey === canonical(wanted[i])) return true;
    }

    return false;
  }

  function ensurePeriodoLabel(raw, explicitList) {
    if (!raw || typeof raw !== "object") return "";

    var directLabel = asString(raw.periodoLabel || raw.label, "");
    if (directLabel) return directLabel;

    var periodoRaw = raw.periodo && typeof raw.periodo === "object" ? raw.periodo : null;
    if (periodoRaw) {
      var mapLabel = buildPeriodoLabel(periodoRaw);
      if (mapLabel) return mapLabel;

      var periodoAsString = asString(periodoRaw.label || periodoRaw.periodoLabel, "");
      if (periodoAsString) return periodoAsString;
    }

    var periodoId = asString(raw.periodoId || raw.periodId, "");
    if (periodoId) {
      var foundById = findPeriodoById(periodoId, explicitList);
      if (foundById) return foundById.periodoLabel;
    }

    var foundByDate = findPeriodoByFechaInicio(
      raw.fechaInicio || raw.fecha || raw.startDate || raw.createdAt,
      explicitList
    );
    if (foundByDate) return foundByDate.periodoLabel;

    return "";
  }

  window.STATS.Periods = {
    asString: asString,
    asNumber: asNumber,
    parseDateParts: parseDateParts,
    extractDateLike: extractDateLike,
    buildPeriodoLabel: buildPeriodoLabel,
    parsePeriodoLabel: parsePeriodoLabel,
    normalizePeriodoRecord: normalizePeriodoRecord,
    listPeriodos: listPeriodos,
    findPeriodoById: findPeriodoById,
    findPeriodoByLabel: findPeriodoByLabel,
    findPeriodoByFechaInicio: findPeriodoByFechaInicio,
    matchPeriodoSelection: matchPeriodoSelection,
    ensurePeriodoLabel: ensurePeriodoLabel
  };
})(window);