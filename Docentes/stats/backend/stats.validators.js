/*
Nombre del archivo: stats.validators.js
Ruta: stats/backend/stats.validators.js
Función:
- Validación reforzada de docentes, capacitaciones, períodos y asignaciones
- Detección de campos faltantes
- Generación de alertas de calidad de datos
- Intenta resolver periodoLabel antes de marcar una capacitación como inconsistente
*/

(function attachStatsValidators(window) {
  "use strict";

  window.STATS = window.STATS || {};

  function asArray(value) {
    return Array.isArray(value) ? value.slice() : [];
  }

  function asString(value) {
    return value == null ? "" : String(value).trim();
  }

  function asNumber(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (fallback || 0);
  }

  function canonical(value) {
    return asString(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function uniquePushIssue(target, issue) {
    if (!target || !issue) return;

    var key = [
      asString(issue.tipo),
      asString(issue.entidad),
      asString(issue.id),
      asString(issue.docenteId),
      asString(issue.capacitacionId),
      asString(issue.periodoId),
      asString(issue.nombre),
      asString(issue.capacitacionNombre),
      asString(issue.fechaInicio)
    ].join("|");

    if (!target.__seen) target.__seen = {};
    if (target.__seen[key]) return;

    target.__seen[key] = true;
    target.push(issue);
  }

  function cleanupIssues(target) {
    if (target && target.__seen) {
      delete target.__seen;
    }
    return target;
  }

  function getPeriodsApi() {
    return window.STATS.Periods || {};
  }

  function getPeriodoLabel(capacitacion, periodos) {
    var rawLabel = asString(capacitacion && capacitacion.periodoLabel);
    var periodsApi = getPeriodsApi();

    if (rawLabel) return rawLabel;

    if (periodsApi && typeof periodsApi.ensurePeriodoLabel === "function") {
      return asString(periodsApi.ensurePeriodoLabel(capacitacion || {}, periodos));
    }

    return "";
  }

  function getPeriodoId(capacitacion, periodos) {
    var rawId = asString(capacitacion && capacitacion.periodoId);
    var periodsApi = getPeriodsApi();

    if (rawId) return rawId;

    if (periodsApi && typeof periodsApi.findPeriodoByFechaInicio === "function") {
      var found = periodsApi.findPeriodoByFechaInicio(
        capacitacion && (
          capacitacion.fechaInicio ||
          capacitacion.fecha ||
          capacitacion.startDate ||
          capacitacion.createdAt
        ),
        periodos
      );

      if (found) return asString(found.id);
    }

    return "";
  }

  function validateDocente(docente) {
    var issues = [];

    if (!docente || typeof docente !== "object") {
      issues.push("registro_docente_invalido");
      return issues;
    }

    if (!asString(docente.id)) issues.push("docente_sin_id");
    if (!asString(docente.nombres) && !asString(docente.apellidos) && !asString(docente.nombreCompleto)) {
      issues.push("docente_sin_nombre");
    }
    if (!asString(docente.carreraId) && !asString(docente.carreraNombre)) {
      issues.push("docente_sin_carrera");
    }
    if (!Array.isArray(docente.capacitaciones)) {
      issues.push("docente_capacitaciones_no_array");
    }

    return issues;
  }

  function validateCapacitacion(capacitacion, periodos) {
    var issues = [];
    var periodoLabel = getPeriodoLabel(capacitacion, periodos);
    var periodoId = getPeriodoId(capacitacion, periodos);

    if (!capacitacion || typeof capacitacion !== "object") {
      issues.push("registro_capacitacion_invalido");
      return issues;
    }

    if (!asString(capacitacion.id)) issues.push("capacitacion_sin_id");
    if (!asString(capacitacion.nombre)) issues.push("capacitacion_sin_nombre");

    if (
      !asString(capacitacion.fechaInicio) &&
      !asString(capacitacion.fecha) &&
      !asString(capacitacion.startDate)
    ) {
      issues.push("capacitacion_sin_fecha_inicio");
    }

    if (!periodoLabel) {
      issues.push("capacitacion_sin_periodo_label");
    }

    if (!periodoId && periodoLabel) {
      issues.push("capacitacion_sin_periodo_id");
    }

    return issues;
  }

  function validatePeriodo(periodo) {
    var issues = [];
    var label = asString(
      periodo && (periodo.periodoLabel || periodo.label || periodo.nombre)
    );

    if (!periodo || typeof periodo !== "object") {
      issues.push("registro_periodo_invalido");
      return issues;
    }

    if (!asString(periodo.id) && !label) {
      issues.push("periodo_sin_id_y_sin_label");
    }

    if (!label) {
      issues.push("periodo_sin_label");
    }

    return issues;
  }

  function validateAsignacion(asignacion, periodos) {
    var issues = [];
    var periodsApi = getPeriodsApi();
    var periodoLabel = asString(asignacion && asignacion.periodoLabel);
    var periodoId = asString(asignacion && asignacion.periodoId);

    if (!asignacion || typeof asignacion !== "object") {
      issues.push("registro_asignacion_invalido");
      return issues;
    }

    if (!asString(asignacion.docenteId)) issues.push("asignacion_sin_docente_id");
    if (!asString(asignacion.capacitacionId)) issues.push("asignacion_sin_capacitacion_id");
    if (!asString(asignacion.capacitacionNombre) && !asString(asignacion.capacitacion)) {
      issues.push("asignacion_sin_capacitacion_nombre");
    }

    if (!periodoLabel && periodsApi && typeof periodsApi.ensurePeriodoLabel === "function") {
      periodoLabel = asString(periodsApi.ensurePeriodoLabel(asignacion, periodos));
    }

    if (!periodoLabel) issues.push("asignacion_sin_periodo_label");
    if (!periodoId && periodoLabel) issues.push("asignacion_sin_periodo_id");

    return issues;
  }

  function buildIssue(base) {
    return Object.assign({
      tipo: "",
      entidad: "",
      id: "",
      nombre: ""
    }, base || {});
  }

  function validateAll(data) {
    var safeData = data && typeof data === "object" ? data : {};
    var docentes = asArray(safeData.docentes);
    var capacitaciones = asArray(safeData.capacitaciones);
    var periodos = asArray(safeData.periodos);
    var asignaciones = asArray(safeData.asignaciones);
    var issues = [];
    var seenPeriodoLabels = {};
    var seenPeriodoIds = {};
    var capRefs = {};
    var capIds = {};

    docentes.forEach(function eachDocente(docente) {
      validateDocente(docente).forEach(function eachCode(code) {
        uniquePushIssue(issues, buildIssue({
          tipo: code,
          entidad: "docente",
          id: docente && docente.id ? docente.id : "",
          nombre: docente && (docente.nombreCompleto || ((docente.nombres || "") + " " + (docente.apellidos || "")).trim()) || ""
        }));
      });

      asArray(docente && docente.capacitaciones).forEach(function eachRef(ref) {
        var refKey = canonical(ref);
        if (!refKey) return;
        if (!capRefs[refKey]) capRefs[refKey] = [];
        capRefs[refKey].push({
          docenteId: asString(docente && docente.id),
          docenteNombre: asString(docente && (docente.nombreCompleto || ((docente.nombres || "") + " " + (docente.apellidos || "")).trim()))
        });
      });
    });

    capacitaciones.forEach(function eachCap(capacitacion) {
      var resolvedPeriodoLabel = getPeriodoLabel(capacitacion, periodos);
      var resolvedPeriodoId = getPeriodoId(capacitacion, periodos);

      if (asString(capacitacion && capacitacion.id)) {
        capIds[canonical(capacitacion.id)] = true;
      }

      validateCapacitacion(capacitacion, periodos).forEach(function eachCode(code) {
        uniquePushIssue(issues, buildIssue({
          tipo: code,
          entidad: "capacitacion",
          id: capacitacion && capacitacion.id ? capacitacion.id : "",
          nombre: capacitacion && capacitacion.nombre ? capacitacion.nombre : "",
          capacitacionId: capacitacion && capacitacion.id ? capacitacion.id : "",
          capacitacionNombre: capacitacion && capacitacion.nombre ? capacitacion.nombre : "",
          periodoId: resolvedPeriodoId,
          fechaInicio: asString(capacitacion && (capacitacion.fechaInicio || capacitacion.fecha || capacitacion.startDate))
        }));
      });

      if (resolvedPeriodoLabel) {
        var labelKey = canonical(resolvedPeriodoLabel);
        if (seenPeriodoLabels[labelKey] && seenPeriodoLabels[labelKey] !== resolvedPeriodoId && resolvedPeriodoId) {
          uniquePushIssue(issues, buildIssue({
            tipo: "capacitacion_periodo_label_duplicado_con_ids_distintos",
            entidad: "capacitacion",
            id: capacitacion && capacitacion.id ? capacitacion.id : "",
            nombre: capacitacion && capacitacion.nombre ? capacitacion.nombre : "",
            capacitacionId: capacitacion && capacitacion.id ? capacitacion.id : "",
            capacitacionNombre: capacitacion && capacitacion.nombre ? capacitacion.nombre : "",
            periodoId: resolvedPeriodoId
          }));
        } else if (resolvedPeriodoId) {
          seenPeriodoLabels[labelKey] = resolvedPeriodoId;
        }
      }

      if (resolvedPeriodoId && !seenPeriodoIds[canonical(resolvedPeriodoId)]) {
        seenPeriodoIds[canonical(resolvedPeriodoId)] = true;
      }
    });

    periodos.forEach(function eachPeriodo(periodo) {
      validatePeriodo(periodo).forEach(function eachCode(code) {
        uniquePushIssue(issues, buildIssue({
          tipo: code,
          entidad: "periodo",
          id: periodo && periodo.id ? periodo.id : "",
          nombre: asString(periodo && (periodo.periodoLabel || periodo.label || periodo.nombre)),
          periodoId: periodo && periodo.id ? periodo.id : ""
        }));
      });
    });

    asignaciones.forEach(function eachAsignacion(asignacion) {
      validateAsignacion(asignacion, periodos).forEach(function eachCode(code) {
        uniquePushIssue(issues, buildIssue({
          tipo: code,
          entidad: "asignacion",
          id: [
            asString(asignacion && asignacion.docenteId),
            asString(asignacion && asignacion.capacitacionId)
          ].join("|"),
          nombre: asString(asignacion && (asignacion.docenteNombre || asignacion.docente)),
          docenteId: asString(asignacion && asignacion.docenteId),
          capacitacionId: asString(asignacion && asignacion.capacitacionId),
          capacitacionNombre: asString(asignacion && (asignacion.capacitacionNombre || asignacion.capacitacion)),
          periodoId: asString(asignacion && asignacion.periodoId),
          fechaInicio: asString(asignacion && asignacion.fechaInicio)
        }));
      });

      if (asString(asignacion && asignacion.capacitacionId) && !capIds[canonical(asignacion.capacitacionId)]) {
        uniquePushIssue(issues, buildIssue({
          tipo: "asignacion_con_capacitacion_fuera_de_catalogo",
          entidad: "asignacion",
          id: [
            asString(asignacion && asignacion.docenteId),
            asString(asignacion && asignacion.capacitacionId)
          ].join("|"),
          nombre: asString(asignacion && (asignacion.docenteNombre || asignacion.docente)),
          docenteId: asString(asignacion && asignacion.docenteId),
          capacitacionId: asString(asignacion && asignacion.capacitacionId),
          capacitacionNombre: asString(asignacion && (asignacion.capacitacionNombre || asignacion.capacitacion))
        }));
      }
    });

    Object.keys(capRefs).forEach(function eachRefKey(refKey) {
      if (capIds[refKey]) return;

      capRefs[refKey].forEach(function eachRefUsage(usage) {
        uniquePushIssue(issues, buildIssue({
          tipo: "docente_referencia_capacitacion_inexistente",
          entidad: "docente",
          id: usage.docenteId,
          nombre: usage.docenteNombre,
          docenteId: usage.docenteId,
          capacitacionId: refKey
        }));
      });
    });

    return cleanupIssues(issues);
  }

  window.STATS.Validators = {
    validateDocente: validateDocente,
    validateCapacitacion: validateCapacitacion,
    validatePeriodo: validatePeriodo,
    validateAsignacion: validateAsignacion,
    validateAll: validateAll
  };
})(window);