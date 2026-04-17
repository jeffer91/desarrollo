/*
Nombre del archivo: stats.crossing.js
Ruta: stats/backend/stats.crossing.js
Función:
- Cruza docentes con capacitaciones
- Usa adaptadores para resolver referencias
- Genera asignaciones e inconsistencias
- Elimina asignaciones duplicadas antes de enriquecer la vista
- Resuelve y conserva periodoLabel, periodoId y periodos
*/
(function attachStatsCrossing(window) {
  "use strict";

  window.STATS = window.STATS || {};

  function getHelpers() {
    return window.STATS.Helpers || {};
  }

  function asArray(value) {
    var helpers = getHelpers();
    return helpers.asArray ? helpers.asArray(value) : (Array.isArray(value) ? value.slice() : []);
  }

  function asNumber(value) {
    var helpers = getHelpers();
    return helpers.asNumber ? helpers.asNumber(value, 0) : (Number(value) || 0);
  }

  function asText(value) {
    var helpers = getHelpers();
    return helpers.asString ? helpers.asString(value, "") : (value == null ? "" : String(value).trim());
  }

  function canonical(value) {
    return asText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function getPeriodsApi() {
    return window.STATS.Periods || {};
  }

  function resolvePeriodoLabel(capacitacion, periodos) {
    var periodsApi = getPeriodsApi();
    var label = asText(capacitacion && capacitacion.periodoLabel);

    if (label) return label;

    if (periodsApi && typeof periodsApi.ensurePeriodoLabel === "function") {
      label = periodsApi.ensurePeriodoLabel(capacitacion || {}, periodos);
      if (label) return label;
    }

    if (
      periodsApi &&
      typeof periodsApi.findPeriodoByFechaInicio === "function" &&
      typeof periodsApi.buildPeriodoLabel === "function"
    ) {
      var foundByDate = periodsApi.findPeriodoByFechaInicio(
        capacitacion && (
          capacitacion.fechaInicio ||
          capacitacion.fecha ||
          capacitacion.startDate ||
          capacitacion.createdAt
        ),
        periodos
      );

      if (foundByDate) {
        return foundByDate.periodoLabel || periodsApi.buildPeriodoLabel(foundByDate);
      }
    }

    return "";
  }

  function resolvePeriodoId(capacitacion, periodos) {
    var current = asText(capacitacion && capacitacion.periodoId);
    var periodsApi = getPeriodsApi();

    if (current) return current;

    if (
      periodsApi &&
      typeof periodsApi.findPeriodoByFechaInicio === "function"
    ) {
      var found = periodsApi.findPeriodoByFechaInicio(
        capacitacion && (
          capacitacion.fechaInicio ||
          capacitacion.fecha ||
          capacitacion.startDate ||
          capacitacion.createdAt
        ),
        periodos
      );

      if (found) return asText(found.id);
    }

    return "";
  }

  function buildAsignacionKey(docente, capacitacion, periodoLabel) {
    return [
      asText(docente && docente.id),
      asText(capacitacion && capacitacion.id),
      asText(periodoLabel || (capacitacion && capacitacion.periodoLabel)),
      asText(capacitacion && capacitacion.fechaInicio),
      asText(capacitacion && capacitacion.fechaFin)
    ].join("|");
  }

  function buildAsignaciones(docentes, capacitaciones, periodos) {
    var adapters = window.STATS.Adapters || {};
    var validators = window.STATS.Validators || {};
    var capIndex = typeof adapters.buildCapIndex === "function"
      ? adapters.buildCapIndex(capacitaciones)
      : null;

    var asignaciones = [];
    var inconsistencias = [];
    var seenAsignaciones = {};

    asArray(docentes).forEach(function eachDocente(docente) {
      asArray(docente.capacitaciones).forEach(function eachRef(refValue) {
        var capacitacion = typeof adapters.resolveCapacitacionRef === "function"
          ? adapters.resolveCapacitacionRef(refValue, capIndex)
          : null;

        var periodoLabel;
        var periodoId;
        var asignacionKey;

        if (!capacitacion) {
          inconsistencias.push({
            tipo: "capacitacion_no_encontrada",
            entidad: "asignacion",
            docenteId: asText(docente && docente.id),
            docenteNombre: asText(docente && docente.nombreCompleto),
            capacitacionId: asText(refValue),
            nombre: asText(docente && docente.nombreCompleto)
          });
          return;
        }

        periodoLabel = resolvePeriodoLabel(capacitacion, periodos);
        periodoId = resolvePeriodoId(capacitacion, periodos);

        if (!periodoLabel) {
          inconsistencias.push({
            tipo: "capacitacion_sin_periodo",
            entidad: "capacitacion",
            docenteId: asText(docente && docente.id),
            docenteNombre: asText(docente && docente.nombreCompleto),
            capacitacionId: asText(capacitacion && capacitacion.id),
            capacitacionNombre: asText(capacitacion && capacitacion.nombre),
            fechaInicio: asText(capacitacion && capacitacion.fechaInicio),
            periodoId: periodoId
          });
        }

        asignacionKey = buildAsignacionKey(docente, capacitacion, periodoLabel);
        if (asignacionKey && seenAsignaciones[asignacionKey]) {
          return;
        }
        seenAsignaciones[asignacionKey] = true;

        asignaciones.push({
          docenteId: asText(docente && docente.id),
          docenteNombre: asText(docente && docente.nombreCompleto),
          nombres: asText(docente && docente.nombres),
          apellidos: asText(docente && docente.apellidos),
          carreraId: asText(docente && docente.carreraId),
          carreraNombre: asText(docente && docente.carreraNombre),
          sexo: asText(docente && docente.sexo),

          capacitacionId: asText(capacitacion && capacitacion.id),
          capacitacionNombre: asText(capacitacion && capacitacion.nombre),
          capacitacion: asText(capacitacion && capacitacion.nombre),
          imparte: asText(capacitacion && capacitacion.imparte),
          modalidad: asText(capacitacion && capacitacion.modalidad),
          ambito: asText(capacitacion && capacitacion.ambito),
          tipoCapacitacion: asText(capacitacion && capacitacion.tipoCapacitacion),
          tipoEvento: asText(capacitacion && capacitacion.tipoEvento),
          horas: asNumber(capacitacion && capacitacion.horas),
          fechaInicio: asText(capacitacion && capacitacion.fechaInicio),
          fechaFin: asText(capacitacion && capacitacion.fechaFin),

          periodoId: periodoId,
          periodo: capacitacion && capacitacion.periodo ? capacitacion.periodo : null,
          periodoLabel: periodoLabel,

          source: "crossing"
        });
      });
    });

    if (validators && typeof validators.validateAll === "function") {
      inconsistencias = inconsistencias.concat(
        validators.validateAll({
          docentes: docentes,
          capacitaciones: capacitaciones,
          periodos: periodos,
          asignaciones: asignaciones
        })
      );
    }

    return {
      asignaciones: asignaciones,
      inconsistencias: inconsistencias
    };
  }

  function enrichDocentes(docentes, asignaciones) {
    var grouped = {};

    asArray(asignaciones).forEach(function eachAsignacion(item) {
      if (!grouped[item.docenteId]) grouped[item.docenteId] = [];
      grouped[item.docenteId].push(item);
    });

    return asArray(docentes).map(function eachDocente(docente) {
      var items = grouped[docente.id] || [];
      var totalHoras = items.reduce(function reducer(acc, item) {
        return acc + asNumber(item.horas);
      }, 0);

      return Object.assign({}, docente, {
        capacitacionesDetalle: items,
        totalCapacitacionesValidas: items.length,
        totalHoras: totalHoras
      });
    });
  }

  function enrichCapacitaciones(capacitaciones, asignaciones, periodos) {
    var grouped = {};
    var periodsApi = getPeriodsApi();

    asArray(asignaciones).forEach(function eachAsignacion(item) {
      if (!grouped[item.capacitacionId]) grouped[item.capacitacionId] = [];
      grouped[item.capacitacionId].push(item);
    });

    return asArray(capacitaciones).map(function eachCapacitacion(capacitacion) {
      var items = grouped[capacitacion.id] || [];
      var uniqueDocentes = {};
      var periodoLabel = resolvePeriodoLabel(capacitacion, periodos);
      var periodoId = resolvePeriodoId(capacitacion, periodos);

      items.forEach(function eachItem(item) {
        var key = canonical(item.docenteId || item.docenteNombre);
        if (key) uniqueDocentes[key] = true;
      });

      return Object.assign({}, capacitacion, {
        periodoId: periodoId || asText(capacitacion.periodoId),
        periodoLabel: periodoLabel || asText(capacitacion.periodoLabel),
        totalDocentes: Object.keys(uniqueDocentes).length,
        totalAsignaciones: items.length,
        docentesDetalle: items,
        docentesUnicos: Object.keys(uniqueDocentes).length,
        periodoResuelto: !!periodoLabel,
        periodoDebug: (
          periodsApi && typeof periodsApi.ensurePeriodoLabel === "function"
            ? periodsApi.ensurePeriodoLabel(capacitacion, periodos)
            : ""
        )
      });
    });
  }

  function crossAll(data) {
    var safeData = data && typeof data === "object" ? data : {};
    var docentes = asArray(safeData.docentes);
    var capacitaciones = asArray(safeData.capacitaciones);
    var periodos = asArray(safeData.periodos);
    var crossing = buildAsignaciones(docentes, capacitaciones, periodos);

    return {
      docentes: enrichDocentes(docentes, crossing.asignaciones),
      capacitaciones: enrichCapacitaciones(capacitaciones, crossing.asignaciones, periodos),
      periodos: periodos,
      asignaciones: crossing.asignaciones,
      inconsistencias: crossing.inconsistencias
    };
  }

  window.STATS.Crossing = {
    buildAsignacionKey: buildAsignacionKey,
    buildAsignaciones: buildAsignaciones,
    enrichDocentes: enrichDocentes,
    enrichCapacitaciones: enrichCapacitaciones,
    crossAll: crossAll
  };
})(window);