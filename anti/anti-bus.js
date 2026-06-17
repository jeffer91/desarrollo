/* =========================================================
Archivo: anti-bus.js
Ubicación: anti/anti-bus.js
Función: Transporte de datos (LOCAL).
 - getPeriods / getAllStudents
 - saveAntiPlagioResult(): guarda % en el estudiante local
========================================================= */
(function (window) {
  "use strict";

  function asText(value) {
    return String(value == null ? "" : value).trim();
  }

  function pickFirst(data, keys) {
    var safe = data || {};
    var list = Array.isArray(keys) ? keys : [];
    for (var i = 0; i < list.length; i += 1) {
      var key = list[i];
      var value = safe[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        return value;
      }
    }
    return "";
  }

  function ensureRepo() {
    if (!window.ExcelLocalRepo) {
      throw new Error("ExcelLocalRepo no está disponible. Revisa anti.html.");
    }
    return window.ExcelLocalRepo;
  }

  function normalizePeriodRow(row) {
    var data = row || {};
    return {
      id: asText(data.id),
      label: asText(data.label || data.nombre || data.id),
      inicioMes: Number(data.inicioMes || 0),
      inicioAnio: Number(data.inicioAnio || 0),
      finMes: Number(data.finMes || 0),
      finAnio: Number(data.finAnio || 0),
      createdAt: asText(data.createdAt || ""),
      updatedAt: asText(data.updatedAt || "")
    };
  }

  function normalizeStudentRow(row) {
    var data = row || {};
    var docId = asText(
      pickFirst(data, [
        "_docId",
        "docId",
        "numeroIdentificacion",
        "NumeroIdentificacion",
        "cedula",
        "Cedula",
        "id"
      ])
    );

    var cedulaActual = asText(
      pickFirst(data, [
        "cedula",
        "Cedula",
        "CEDULA",
        "Cédula",
        "cédula",
        "numeroIdentificacion",
        "NumeroIdentificacion"
      ]) || docId
    );

    return {
      ...data,
      cedula: cedulaActual,
      numeroIdentificacion: asText(
        pickFirst(data, ["numeroIdentificacion", "NumeroIdentificacion", "cedula", "Cedula"]) || cedulaActual
      ),
      _docId: docId,
      docId: docId
    };
  }

  const AntiBus = {
    async getPeriods() {
      try {
        var repo = ensureRepo();
        var periods = repo.listPeriods();
        return (periods || [])
          .map(normalizePeriodRow)
          .sort(function (a, b) {
            return String(a.label).localeCompare(String(b.label), "es");
          });
      } catch (err) {
        console.error("[AntiBus] Error periodos:", err);
        return [];
      }
    },

    async getAllStudents() {
      try {
        var repo = ensureRepo();
        var students = repo.listAllStudents();
        return (students || []).map(normalizeStudentRow);
      } catch (err) {
        console.error("[AntiBus] Error estudiantes:", err);
        return [];
      }
    },

    /**
     * Guarda el antiplagio asignado (generado por la app)
     * payload recomendado:
     * {
     *   originalidadNumber, plagioNumber, citasNumber, aiNumber, version, fechaISO, fechaTexto
     * }
     */
    async saveAntiPlagioResult(studentDocId, payload) {
      try {
        var repo = ensureRepo();
        var id = asText(studentDocId);
        if (!id) throw new Error("studentDocId vacío");

        var data = {
          AntiPlagioVersion: asText((payload && payload.version) || "2867"),
          AntiPlagioFechaISO: asText((payload && payload.fechaISO) || ""),
          AntiPlagioFechaTexto: asText((payload && payload.fechaTexto) || ""),
          AntiPlagioOriginalidad: Number((payload && payload.originalidadNumber) ?? 0),
          AntiPlagioPlagio: Number((payload && payload.plagioNumber) ?? 0),
          AntiPlagioCitas: Number((payload && payload.citasNumber) ?? 0),
          AntiPlagioAI: Number((payload && payload.aiNumber) ?? 0),
          AntiPlagioUpdatedAt: new Date().toISOString()
        };

        repo.patchStudentById(id, data);
        return true;
      } catch (err) {
        console.error("[AntiBus] Error guardando antiplagio:", err);
        return false;
      }
    }
  };

  window.AntiBus = AntiBus;
})(window);