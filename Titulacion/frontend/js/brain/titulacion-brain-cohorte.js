/* =========================================================
Nombre completo: titulacion-brain-cohorte.js
Ruta: /Titulacion/frontend/js/brain/titulacion-brain-cohorte.js
Función o funciones:
- Normalizar registros de estudiantes o filas importadas desde Excel.
- Calcular resumen general de cohorte.
- Contar estudiantes por carrera, sede, modalidad y estado.
- Preparar datos para informe general de cohorte.
========================================================= */

(function (window) {
  "use strict";

  function utils() {
    return window.TITULACION_UTILS || {};
  }

  function modalidadBrain() {
    return window.TITULACION_BRAIN_MODALIDAD || {};
  }

  function asText(value) {
    var U = utils();
    if (typeof U.asText === "function") return U.asText(value);
    return String(value == null ? "" : value).trim();
  }

  function normalizeKey(value) {
    var U = utils();
    if (typeof U.normalizeKey === "function") return U.normalizeKey(value);

    return asText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function getFirstValue(row, candidates) {
    var r = row || {};
    var keys = Object.keys(r);

    for (var i = 0; i < candidates.length; i += 1) {
      var target = normalizeKey(candidates[i]);

      for (var j = 0; j < keys.length; j += 1) {
        if (normalizeKey(keys[j]) === target) {
          return r[keys[j]];
        }
      }
    }

    return "";
  }

  function getStudentName(row) {
    return asText(getFirstValue(row, [
      "estudiante",
      "nombres",
      "nombre",
      "apellidos_nombres",
      "apellidos y nombres",
      "alumno",
      "persona"
    ]));
  }

  function getCedula(row) {
    return asText(getFirstValue(row, [
      "cedula",
      "cédula",
      "identificacion",
      "identificación",
      "dni",
      "documento"
    ]));
  }

  function getCarrera(row) {
    return asText(getFirstValue(row, [
      "carrera",
      "programa",
      "nombre_carrera",
      "nombre carrera",
      "tecnologia",
      "tecnología"
    ]));
  }

  function getSede(row) {
    return asText(getFirstValue(row, [
      "sede",
      "campus",
      "centro",
      "ubicacion",
      "ubicación"
    ]));
  }

  function getJornada(row) {
    return asText(getFirstValue(row, [
      "jornada",
      "horario",
      "modalidad_horaria"
    ]));
  }

  function getEstado(row) {
    return asText(getFirstValue(row, [
      "estado",
      "estado_final",
      "resultado",
      "situacion",
      "situación",
      "observacion",
      "observación"
    ]));
  }

  function normalizeRow(row, index) {
    var M = modalidadBrain();
    var carrera = getCarrera(row);
    var modalidadInfo =
      typeof M.classifyCarrera === "function"
        ? M.classifyCarrera(carrera)
        : {
            modalidad: "presencial",
            modalidadLabel: "Modalidad Presencial",
            esOnline: false,
            esPresencial: true
          };

    return Object.assign({}, row || {}, {
      _rowIndex: index,
      estudiante: getStudentName(row),
      cedula: getCedula(row),
      carrera: carrera,
      sede: getSede(row),
      jornada: getJornada(row),
      estado: getEstado(row),
      modalidadDetectada: modalidadInfo.modalidad,
      modalidadLabel: modalidadInfo.modalidadLabel,
      esOnline: modalidadInfo.esOnline,
      esPresencial: modalidadInfo.esPresencial
    });
  }

  function normalizeRows(rows) {
    var list = Array.isArray(rows) ? rows : [];

    return list.map(function (row, index) {
      return normalizeRow(row, index);
    });
  }

  function groupCount(rows, getter) {
    var out = {};
    var list = Array.isArray(rows) ? rows : [];

    list.forEach(function (row) {
      var label = asText(typeof getter === "function" ? getter(row) : row[getter]);

      if (!label) {
        label = "Sin especificar";
      }

      out[label] = (out[label] || 0) + 1;
    });

    return Object.keys(out)
      .sort(function (a, b) {
        return a.localeCompare(b);
      })
      .map(function (label) {
        return {
          label: label,
          total: out[label]
        };
      });
  }

  function countUnique(rows, getter) {
    var set = new Set();
    var list = Array.isArray(rows) ? rows : [];

    list.forEach(function (row) {
      var value = asText(typeof getter === "function" ? getter(row) : row[getter]);
      if (value) set.add(value);
    });

    return set.size;
  }

  function buildCohorteSummary(rows) {
    var normalized = normalizeRows(rows);

    return {
      totalEstudiantes: normalized.length,
      totalCarreras: countUnique(normalized, "carrera"),
      totalSedes: countUnique(normalized, "sede"),
      totalOnline: normalized.filter(function (row) {
        return row.esOnline;
      }).length,
      totalPresencial: normalized.filter(function (row) {
        return row.esPresencial;
      }).length,
      porCarrera: groupCount(normalized, "carrera"),
      porSede: groupCount(normalized, "sede"),
      porJornada: groupCount(normalized, "jornada"),
      porModalidad: groupCount(normalized, "modalidadLabel"),
      porEstado: groupCount(normalized, "estado"),
      rows: normalized
    };
  }

  function createCohorteParagraphs(summary) {
    var s = summary || {};
    var total = Number(s.totalEstudiantes || 0);
    var carreras = Number(s.totalCarreras || 0);
    var sedes = Number(s.totalSedes || 0);
    var online = Number(s.totalOnline || 0);
    var presencial = Number(s.totalPresencial || 0);

    return [
      "La cohorte analizada está conformada por " + total + " estudiante(s) vinculados al proceso de titulación.",
      "El proceso integra " + carreras + " carrera(s) y " + sedes + " sede(s) registradas en la base de datos.",
      "La distribución por modalidad registra " + presencial + " estudiante(s) en modalidad presencial y " + online + " estudiante(s) en modalidad online.",
      "La información consolidada permite identificar la composición general de la cohorte y preparar los resultados por carrera."
    ];
  }

  window.TITULACION_BRAIN_COHORTE = {
    getFirstValue: getFirstValue,
    getStudentName: getStudentName,
    getCedula: getCedula,
    getCarrera: getCarrera,
    getSede: getSede,
    getJornada: getJornada,
    getEstado: getEstado,
    normalizeRow: normalizeRow,
    normalizeRows: normalizeRows,
    groupCount: groupCount,
    countUnique: countUnique,
    buildCohorteSummary: buildCohorteSummary,
    createCohorteParagraphs: createCohorteParagraphs
  };
})(window);