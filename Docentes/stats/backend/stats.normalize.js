/*
Nombre del archivo: stats.normalize.js
Ruta: stats/backend/stats.normalize.js
Función:
- Normaliza docentes y capacitaciones
- Limpia campos vacíos o nulos
- Uniforma strings, arrays y números
- Reconstruye periodoLabel cuando falte
- Soporta periodoLabel, periodoId, mapa periodo, fechaInicio y formatos reales de Firebase
*/

(function attachStatsNormalize(window) {
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

  function uniqueStrings(list) {
    var map = {};
    var output = [];

    asArray(list).forEach(function eachItem(item) {
      var key = asString(item, "");
      if (!key) return;
      if (map[key]) return;
      map[key] = true;
      output.push(key);
    });

    return output;
  }

  function getPeriodoLabelFromMap(periodo) {
    if (!periodo || typeof periodo !== "object") return "";

    var mesIni = asString(
      periodo.mesIni != null ? periodo.mesIni : periodo.mesInicio,
      ""
    ).padStart(2, "0");

    var anioIni = asString(
      periodo.anioIni != null ? periodo.anioIni : periodo.anioInicio,
      ""
    );

    var mesFin = asString(
      periodo.mesFin != null ? periodo.mesFin : periodo.mesFin,
      ""
    ).padStart(2, "0");

    var anioFin = asString(
      periodo.anioFin != null ? periodo.anioFin : periodo.anioFinal,
      ""
    );

    if (periodo.periodoLabel) return asString(periodo.periodoLabel, "");
    if (periodo.label) return asString(periodo.label, "");

    if (!mesIni || !anioIni || !mesFin || !anioFin) return "";
    return mesIni + "/" + anioIni + " - " + mesFin + "/" + anioFin;
  }

  function resolvePeriodoLabel(raw, periodo) {
    var explicitLabel = asString(raw.periodoLabel || raw.label, "");
    if (explicitLabel) return explicitLabel;

    var periodsApi = window.STATS.Periods;

    var mapLabel = getPeriodoLabelFromMap(periodo);
    if (mapLabel) return mapLabel;

    if (periodsApi && typeof periodsApi.ensurePeriodoLabel === "function") {
      var ensured = periodsApi.ensurePeriodoLabel(raw);
      if (ensured) return ensured;
    }

    if (
      periodsApi &&
      typeof periodsApi.findPeriodoById === "function" &&
      typeof periodsApi.buildPeriodoLabel === "function"
    ) {
      var periodoId = asString(raw.periodoId || raw.periodId, "");
      if (periodoId) {
        var foundById = periodsApi.findPeriodoById(periodoId);
        if (foundById) {
          return foundById.periodoLabel || periodsApi.buildPeriodoLabel(foundById);
        }
      }
    }

    if (
      periodsApi &&
      typeof periodsApi.findPeriodoByFechaInicio === "function" &&
      typeof periodsApi.buildPeriodoLabel === "function"
    ) {
      var found = periodsApi.findPeriodoByFechaInicio(
        raw.fechaInicio || raw.fecha || raw.startDate || raw.createdAt
      );
      if (found) return found.periodoLabel || periodsApi.buildPeriodoLabel(found);
    }

    return "";
  }

  function normalizePeriodoObject(rawPeriodo, periodoLabel) {
    var periodo = rawPeriodo && typeof rawPeriodo === "object" ? rawPeriodo : {};
    var parsedLabel = null;

    if (
      window.STATS.Periods &&
      typeof window.STATS.Periods.parsePeriodoLabel === "function"
    ) {
      parsedLabel = window.STATS.Periods.parsePeriodoLabel(periodoLabel);
    }

    return {
      anioIni: asNumber(
        periodo.anioIni != null ? periodo.anioIni : parsedLabel && parsedLabel.anioIni,
        0
      ),
      mesIni: asString(
        periodo.mesIni != null ? periodo.mesIni : parsedLabel && parsedLabel.mesIni,
        ""
      ).padStart(2, "0"),
      anioFin: asNumber(
        periodo.anioFin != null ? periodo.anioFin : parsedLabel && parsedLabel.anioFin,
        0
      ),
      mesFin: asString(
        periodo.mesFin != null ? periodo.mesFin : parsedLabel && parsedLabel.mesFin,
        ""
      ).padStart(2, "0")
    };
  }

  function normalizeCapacitacion(item) {
    var raw = item && item.data ? item.data : {};
    var periodo = raw.periodo && typeof raw.periodo === "object" ? raw.periodo : {};
    var periodoLabel = resolvePeriodoLabel(raw, periodo);
    var normalizedPeriodo = normalizePeriodoObject(periodo, periodoLabel);

    return {
      id: asString(item && item.id, ""),
      nombre: asString(raw.nombre, ""),
      imparte: asString(raw.imparte, ""),
      modalidad: asString(raw.modalidad, ""),
      ambito: asString(raw.ambito, ""),
      tipoCapacitacion: asString(raw.tipoCapacitacion, ""),
      tipoEvento: asString(raw.tipoEvento, ""),
      horas: asNumber(raw.horas, 0),
      fechaInicio: asString(raw.fechaInicio || raw.fecha || raw.startDate, ""),
      fechaFin: asString(raw.fechaFin || raw.endDate, ""),
      periodoId: asString(raw.periodoId || raw.periodId, ""),
      periodo: normalizedPeriodo,
      periodoLabel: periodoLabel,
      createdAt: raw.createdAt || null,
      updatedAt: raw.updatedAt || null
    };
  }

  function normalizeCarreraNombre(value) {
    var raw = asString(value, "").replace(/_/g, " ").replace(/\s+/g, " ").trim();
    var key = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    var preferred = {
      administracion: "Administración",
      contabilidad: "Contabilidad",
      "desarrollo de software": "Desarrollo de Software",
      "diseno multimedia": "Diseño Multimedia",
      "educacion basica": "Educación Básica",
      "educacion inicial": "Educación Inicial",
      enfermeria: "Enfermería",
      "estetica integral": "Estética Integral",
      "gestion del talento humano": "Gestión del Talento Humano",
      "marketing digital y comercio electronico": "Marketing Digital y Comercio Electrónico",
      "mecanica automotriz": "Mecánica Automotriz",
      "redes y telecomunicaciones": "Redes y Telecomunicaciones",
      "rehabilitacion fisica": "Rehabilitación Física",
      "seguridad ciudadana y orden publico": "Seguridad Ciudadana y Orden Público"
    };

    return preferred[key] || raw;
  }

  function normalizeSexo(value) {
    var raw = asString(value, "");
    var key = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    if (key === "hombre" || key === "masculino" || key === "m") {
      return "Hombre";
    }

    if (key === "mujer" || key === "femenino" || key === "f") {
      return "Mujer";
    }

    return raw;
  }

  function normalizeDocente(item) {
    var raw = item && item.data ? item.data : {};
    var caps = uniqueStrings(raw.capacitaciones);

    return {
      id: asString(item && item.id, ""),
      nombres: asString(raw.nombres, ""),
      apellidos: asString(raw.apellidos, ""),
      nombreCompleto: (asString(raw.nombres, "") + " " + asString(raw.apellidos, "")).trim(),
      carreraId: asString(raw.carreraId, ""),
      carreraNombre: normalizeCarreraNombre(raw.carreraNombre || raw.carreraId),
      celular: asString(raw.celular, ""),
      sexo: normalizeSexo(raw.sexo),
      titulo: asString(raw.titulo, ""),
      capacitaciones: caps,
      totalCapacitaciones: caps.length,
      createdAt: raw.createdAt || null,
      updatedAt: raw.updatedAt || null
    };
  }

  function normalizeCapacitaciones(list) {
    return asArray(list).map(normalizeCapacitacion);
  }

  function normalizeDocentes(list) {
    return asArray(list).map(normalizeDocente);
  }

  function normalizeAll(rawData) {
    var safeRaw = rawData && typeof rawData === "object" ? rawData : {};

    return {
      docentes: normalizeDocentes(safeRaw.docentes),
      capacitaciones: normalizeCapacitaciones(safeRaw.capacitaciones),
      periodos: asArray(safeRaw.periodos)
    };
  }

  window.STATS.Normalize = {
    normalizeDocente: normalizeDocente,
    normalizeCapacitacion: normalizeCapacitacion,
    normalizeDocentes: normalizeDocentes,
    normalizeCapacitaciones: normalizeCapacitaciones,
    normalizeAll: normalizeAll
  };
})(window);