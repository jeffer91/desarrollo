/*
Nombre del archivo: stats.metrics.js
Ruta: stats/backend/stats.metrics.js
Función:
- Construye asignaciones visibles
- Aplica filtros de carrera, capacitación, sexo, búsqueda y período
- Soporta período como string o array
- Evita que el filtro de período rompa cuando la asignación sí existe pero viene con distintos formatos
*/

(function attachStatsMetrics(window) {
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
    if (Array.isArray(value)) return value.slice();
    if (value == null || value === "") return [];
    return [value];
  }

  function canonical(value) {
    return asString(value, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function isAllValue(value) {
    var key = canonical(value);
    return !key || key === "todos" || key === "todo" || key === "todas";
  }

  function uniqueSorted(values) {
    var used = {};
    return asArray(values)
      .map(function each(item) { return asString(item, ""); })
      .filter(Boolean)
      .filter(function dedupe(item) {
        var key = canonical(item);
        if (!key || used[key]) return false;
        used[key] = true;
        return true;
      })
      .sort(function sortText(a, b) {
        return a.localeCompare(b, "es", { sensitivity: "base" });
      });
  }

  function normalizeFilters(filters) {
    var safe = filters && typeof filters === "object" ? filters : {};

    return {
      carrera: asString(safe.carrera, "Todos"),
      capacitacion: asString(safe.capacitacion, "Todos"),
      sexo: asString(safe.sexo, "Todos"),
      busqueda: asString(safe.busqueda, ""),
      periodo: Array.isArray(safe.periodo)
        ? safe.periodo.slice().filter(Boolean)
        : asString(safe.periodo, "")
    };
  }

  function getCapacitationName(item) {
    return asString(item.nombre || item.capacitacionNombre || item.capacitacion, "");
  }

  function buildCapMap(capacitaciones) {
    var map = {};

    asArray(capacitaciones).forEach(function eachCap(cap) {
      if (!cap || !cap.id) return;
      map[cap.id] = cap;
    });

    return map;
  }

  function ensurePeriodoLabelFromCap(cap) {
    if (!cap || typeof cap !== "object") return "";

    if (cap.periodoLabel) return asString(cap.periodoLabel, "");

    if (window.STATS.Periods && typeof window.STATS.Periods.ensurePeriodoLabel === "function") {
      return window.STATS.Periods.ensurePeriodoLabel(cap);
    }

    return "";
  }

  function buildAssignmentsFallback(docentes, capacitaciones) {
    var output = [];
    var capMap = buildCapMap(capacitaciones);

    asArray(docentes).forEach(function eachDocente(docente) {
      var caps = asArray(docente && docente.capacitaciones);

      caps.forEach(function eachCapId(capId) {
        var cap = capMap[capId];
        if (!cap) return;

        output.push({
          docenteId: asString(docente.id, ""),
          docenteNombre: asString(docente.nombreCompleto || ((docente.nombres || "") + " " + (docente.apellidos || "")).trim(), ""),
          docente: asString(docente.nombreCompleto || ((docente.nombres || "") + " " + (docente.apellidos || "")).trim(), ""),
          nombres: asString(docente.nombres, ""),
          apellidos: asString(docente.apellidos, ""),
          carreraId: asString(docente.carreraId, ""),
          carreraNombre: asString(docente.carreraNombre, ""),
          sexo: asString(docente.sexo, ""),
          capacitacionId: asString(cap.id, ""),
          capacitacion: getCapacitationName(cap),
          capacitacionNombre: getCapacitationName(cap),
          modalidad: asString(cap.modalidad, ""),
          imparte: asString(cap.imparte, ""),
          ambito: asString(cap.ambito, ""),
          tipoCapacitacion: asString(cap.tipoCapacitacion, ""),
          tipoEvento: asString(cap.tipoEvento, ""),
          horas: asNumber(cap.horas, 0),
          fechaInicio: asString(cap.fechaInicio, ""),
          fechaFin: asString(cap.fechaFin, ""),
          periodoLabel: ensurePeriodoLabelFromCap(cap),
          periodoId: asString(cap.periodoId, ""),
          source: "fallback"
        });
      });
    });

    return output;
  }

  function getAssignments(input) {
    if (input && Array.isArray(input.asignaciones) && input.asignaciones.length) {
      return input.asignaciones.slice().map(function enrichExisting(item) {
        var copy = Object.assign({}, item);
        if (!copy.capacitacion && copy.capacitacionNombre) {
          copy.capacitacion = copy.capacitacionNombre;
        }
        if (!copy.capacitacionNombre && copy.capacitacion) {
          copy.capacitacionNombre = copy.capacitacion;
        }
        if (!copy.docente && copy.docenteNombre) {
          copy.docente = copy.docenteNombre;
        }
        if (!copy.docenteNombre && copy.docente) {
          copy.docenteNombre = copy.docente;
        }

        if (!copy.periodoLabel && window.STATS.Periods && typeof window.STATS.Periods.ensurePeriodoLabel === "function") {
          copy.periodoLabel = window.STATS.Periods.ensurePeriodoLabel(copy);
        }

        return copy;
      });
    }

    return buildAssignmentsFallback(input.docentes, input.capacitaciones);
  }

  function matchesSelection(value, selected) {
    if (Array.isArray(selected)) {
      var clean = selected.filter(function each(item) { return !isAllValue(item); });
      if (!clean.length) return true;

      var current = canonical(value);
      for (var i = 0; i < clean.length; i += 1) {
        if (current === canonical(clean[i])) return true;
      }
      return false;
    }

    if (isAllValue(selected)) return true;
    return canonical(value) === canonical(selected);
  }

  function matchesPeriodo(item, selectedPeriodo) {
    var currentLabel = asString(item.periodoLabel, "");

    if (window.STATS.Periods && typeof window.STATS.Periods.matchPeriodoSelection === "function") {
      return window.STATS.Periods.matchPeriodoSelection(currentLabel, selectedPeriodo);
    }

    return matchesSelection(currentLabel, selectedPeriodo);
  }

  function matchesBusqueda(item, busqueda) {
    var query = canonical(busqueda);
    if (!query) return true;

    var bag = [
      item.docenteNombre,
      item.docente,
      item.nombres,
      item.apellidos,
      item.carreraNombre,
      item.capacitacion,
      item.capacitacionNombre,
      item.modalidad,
      item.imparte,
      item.periodoLabel,
      item.tipoCapacitacion,
      item.tipoEvento
    ]
      .map(function each(value) { return canonical(value); })
      .join(" ");

    return bag.indexOf(query) >= 0;
  }

  function filterAssignments(assignments, filters) {
    return asArray(assignments).filter(function each(item) {
      if (!matchesSelection(item.carreraNombre, filters.carrera)) return false;
      if (!matchesSelection(item.capacitacion || item.capacitacionNombre, filters.capacitacion)) return false;
      if (!matchesSelection(item.sexo, filters.sexo)) return false;
      if (!matchesPeriodo(item, filters.periodo)) return false;
      if (!matchesBusqueda(item, filters.busqueda)) return false;
      return true;
    });
  }

  function uniqueBy(list, keyBuilder) {
    var used = {};
    var output = [];

    asArray(list).forEach(function each(item) {
      var key = keyBuilder(item);
      if (!key) return;
      if (used[key]) return;
      used[key] = true;
      output.push(item);
    });

    return output;
  }

  function buildKpis(assignments) {
    var visible = asArray(assignments);

    var docentesUnicos = uniqueBy(visible, function keyDoc(item) {
      return canonical(item.docenteId || item.docenteNombre || item.docente);
    }).length;

    var capacitacionesVisibles = uniqueBy(visible, function keyCap(item) {
      return canonical(item.capacitacionId || item.capacitacionNombre || item.capacitacion);
    }).length;

    var asignacionesVisibles = visible.length;

    var horasVisibles = visible.reduce(function sum(acc, item) {
      return acc + asNumber(item.horas, 0);
    }, 0);

    return {
      docentesUnicos: docentesUnicos,
      capacitacionesVisibles: capacitacionesVisibles,
      asignacionesVisibles: asignacionesVisibles,
      horasVisibles: horasVisibles,
      /* Compatibilidad: la UI actual lee estas claves legacy para la franja y los KPI; así evita mostrar 0 con datos válidos. */
      docentesUnicosConCapacitacion: docentesUnicos,
      capacitacionesAsignadasUnicas: capacitacionesVisibles,
      asignacionesTotales: asignacionesVisibles,
      horasTotales: horasVisibles,
      promedioHorasPorAsignacion: asignacionesVisibles ? Number((horasVisibles / asignacionesVisibles).toFixed(2)) : 0,
      promedioCapacitacionesPorDocente: docentesUnicos ? Number((capacitacionesVisibles / docentesUnicos).toFixed(2)) : 0
    };
  }

  function buildFilterOptions(assignments) {
    return {
      carreras: uniqueSorted(
        asArray(assignments).map(function each(item) { return item.carreraNombre; })
      ),
      capacitaciones: uniqueSorted(
        asArray(assignments).map(function each(item) {
          return item.capacitacion || item.capacitacionNombre;
        })
      ),
      sexos: uniqueSorted(
        asArray(assignments).map(function each(item) { return item.sexo; })
      ),
      periodos: uniqueSorted(
        asArray(assignments).map(function each(item) { return item.periodoLabel; })
      )
    };
  }

  function buildResumenTecnico(filters, kpis) {
    return {
      carreraActiva: isAllValue(filters.carrera) ? "todos" : filters.carrera,
      capacitacionActiva: isAllValue(filters.capacitacion) ? "todas" : filters.capacitacion,
      sexoActivo: isAllValue(filters.sexo) ? "todos" : filters.sexo,
      periodoVisible: Array.isArray(filters.periodo)
        ? (filters.periodo.length ? filters.periodo.join(" | ") : "todos")
        : (isAllValue(filters.periodo) ? "todos" : filters.periodo),
      docentesUnicos: kpis.docentesUnicos,
      capacitacionesVisibles: kpis.capacitacionesVisibles,
      asignacionesVisibles: kpis.asignacionesVisibles,
      horasVisibles: kpis.horasVisibles
    };
  }

  function buildCapacitacionesTable(assignments) {
    var grouped = {};

    asArray(assignments).forEach(function each(item) {
      var key = canonical(item.capacitacionId || item.capacitacionNombre || item.capacitacion);
      if (!key) return;

      if (!grouped[key]) {
        grouped[key] = {
          capacitacionId: asString(item.capacitacionId, ""),
          capacitacion: asString(item.capacitacion || item.capacitacionNombre, ""),
          modalidad: asString(item.modalidad, ""),
          periodoLabel: asString(item.periodoLabel, ""),
          docentes: {},
          asignaciones: 0,
          horas: 0
        };
      }

      grouped[key].asignaciones += 1;
      grouped[key].horas += asNumber(item.horas, 0);

      var docenteKey = canonical(item.docenteId || item.docenteNombre || item.docente);
      if (docenteKey) {
        grouped[key].docentes[docenteKey] = true;
      }
    });

    return Object.keys(grouped)
      .map(function toRow(key) {
        var item = grouped[key];
        return {
          capacitacionId: item.capacitacionId,
          capacitacion: item.capacitacion,
          modalidad: item.modalidad,
          periodoLabel: item.periodoLabel,
          docentesUnicos: Object.keys(item.docentes).length,
          asignaciones: item.asignaciones,
          horas: item.horas
        };
      })
      .sort(function sortByCap(a, b) {
        return a.capacitacion.localeCompare(b.capacitacion, "es", { sensitivity: "base" });
      });
  }

  function buildDocentesTable(assignments) {
    var grouped = {};

    asArray(assignments).forEach(function each(item) {
      var key = canonical(item.docenteId || item.docenteNombre || item.docente);
      if (!key) return;

      if (!grouped[key]) {
        grouped[key] = {
          docenteId: asString(item.docenteId, ""),
          docenteNombre: asString(item.docenteNombre || item.docente, ""),
          carreraNombre: asString(item.carreraNombre, ""),
          sexo: asString(item.sexo, ""),
          capacitaciones: {},
          asignaciones: 0,
          horas: 0
        };
      }

      grouped[key].asignaciones += 1;
      grouped[key].horas += asNumber(item.horas, 0);

      var capKey = canonical(item.capacitacionId || item.capacitacionNombre || item.capacitacion);
      if (capKey) {
        grouped[key].capacitaciones[capKey] = true;
      }
    });

    return Object.keys(grouped)
      .map(function toRow(key) {
        var item = grouped[key];
        return {
          docenteId: item.docenteId,
          docenteNombre: item.docenteNombre,
          carreraNombre: item.carreraNombre,
          sexo: item.sexo,
          capacitacionesUnicas: Object.keys(item.capacitaciones).length,
          asignaciones: item.asignaciones,
          horas: item.horas
        };
      })
      .sort(function sortByDoc(a, b) {
        return a.docenteNombre.localeCompare(b.docenteNombre, "es", { sensitivity: "base" });
      });
  }

  function buildAll(input, rawFilters) {
    var safeInput = input && typeof input === "object" ? input : {};
    var filters = normalizeFilters(rawFilters);
    var allAssignments = getAssignments(safeInput);
    var visibleAssignments = filterAssignments(allAssignments, filters);
    var kpis = buildKpis(visibleAssignments);

    return {
      filters: filters,
      allAssignments: allAssignments,
      visibleAssignments: visibleAssignments,
      filterOptions: buildFilterOptions(allAssignments),
      kpis: kpis,

      /* Corrección:
         - Se exponen las claves derivadas que consume la UI actual.
         - Evita que la vista lea arreglos vacíos por nombre incompatible y muestre todo en 0. */
      filteredDocentes: buildDocentesTable(visibleAssignments),
      filteredCapacitaciones: buildCapacitacionesTable(visibleAssignments),
      filteredAsignaciones: visibleAssignments,
      filteredInconsistencias: asArray(safeInput.inconsistencias),
      metrics: kpis,
      detail: null,

      resumenTecnico: buildResumenTecnico(filters, kpis),
      docentesTable: buildDocentesTable(visibleAssignments),
      capacitacionesTable: buildCapacitacionesTable(visibleAssignments),

      docentesUnicos: kpis.docentesUnicos,
      capacitacionesVisibles: kpis.capacitacionesVisibles,
      asignacionesVisibles: kpis.asignacionesVisibles,
      horasVisibles: kpis.horasVisibles
    };
  }

  window.STATS.Metrics = {
    normalizeFilters: normalizeFilters,
    getAssignments: getAssignments,
    filterAssignments: filterAssignments,
    buildKpis: buildKpis,
    buildFilterOptions: buildFilterOptions,
    buildResumenTecnico: buildResumenTecnico,
    buildDocentesTable: buildDocentesTable,
    buildCapacitacionesTable: buildCapacitacionesTable,
    buildAll: buildAll,

    compute: buildAll,
    calculate: buildAll,
    build: buildAll
  };
})(window);