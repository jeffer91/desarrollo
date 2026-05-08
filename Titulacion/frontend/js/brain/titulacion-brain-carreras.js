/* =========================================================
Nombre completo: titulacion-brain-carreras.js
Ruta: /Titulacion/frontend/js/brain/titulacion-brain-carreras.js
Función o funciones:
- Agrupar estudiantes por carrera.
- Separar carreras por modalidad presencial u online.
- Preparar secciones automáticas de resultados por carrera.
- Ordenar carreras y generar resúmenes por cada una.
========================================================= */

(function (window) {
  "use strict";

  function utils() {
    return window.TITULACION_UTILS || {};
  }

  function cohorteBrain() {
    return window.TITULACION_BRAIN_COHORTE || {};
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

  function normalizeRows(rows) {
    var C = cohorteBrain();

    if (typeof C.normalizeRows === "function") {
      return C.normalizeRows(rows);
    }

    return Array.isArray(rows) ? rows : [];
  }

  function groupByCarrera(rows) {
    var list = normalizeRows(rows);
    var map = {};

    list.forEach(function (row) {
      var carrera = asText(row.carrera || "Sin carrera");

      if (!map[carrera]) {
        map[carrera] = [];
      }

      map[carrera].push(row);
    });

    return Object.keys(map)
      .sort(function (a, b) {
        return a.localeCompare(b);
      })
      .map(function (carrera) {
        return {
          carrera: carrera,
          id: normalizeKey(carrera),
          total: map[carrera].length,
          modalidad: detectModalidad(map[carrera]),
          rows: map[carrera]
        };
      });
  }

  function detectModalidad(rows) {
    var list = Array.isArray(rows) ? rows : [];
    var online = list.filter(function (row) {
      return row.esOnline || row.modalidadDetectada === "online";
    }).length;

    var presencial = list.length - online;

    if (online > 0 && presencial === 0) return "online";
    if (presencial > 0 && online === 0) return "presencial";

    return "mixta";
  }

  function filterByModalidad(groups, modalidad) {
    var mod = asText(modalidad).toLowerCase();
    var list = Array.isArray(groups) ? groups : [];

    if (!mod || mod === "todas" || mod === "all") {
      return list;
    }

    return list.filter(function (group) {
      return asText(group.modalidad).toLowerCase() === mod;
    });
  }

  function buildCarreraSummary(group) {
    var g = group || {};
    var rows = Array.isArray(g.rows) ? g.rows : [];

    var sedes = {};
    var jornadas = {};

    rows.forEach(function (row) {
      var sede = asText(row.sede || "Sin sede");
      var jornada = asText(row.jornada || "Sin jornada");

      sedes[sede] = (sedes[sede] || 0) + 1;
      jornadas[jornada] = (jornadas[jornada] || 0) + 1;
    });

    return {
      carrera: asText(g.carrera),
      id: asText(g.id),
      modalidad: asText(g.modalidad),
      total: Number(g.total || rows.length),
      sedes: Object.keys(sedes).map(function (label) {
        return {
          label: label,
          total: sedes[label]
        };
      }),
      jornadas: Object.keys(jornadas).map(function (label) {
        return {
          label: label,
          total: jornadas[label]
        };
      }),
      rows: rows
    };
  }

  function buildCarreraSections(rows, modalidad) {
    var groups = groupByCarrera(rows);
    var filtered = filterByModalidad(groups, modalidad);

    return filtered.map(function (group) {
      var summary = buildCarreraSummary(group);

      return {
        id: "resultados-" + summary.id,
        titulo: summary.carrera,
        tipo: "resultado-carrera",
        modalidad: summary.modalidad,
        total: summary.total,
        data: summary,
        contenido: [
          "La carrera " + summary.carrera + " registra " + summary.total + " estudiante(s) dentro del proceso de titulación.",
          "La modalidad detectada para esta carrera es: " + summary.modalidad + "."
        ]
      };
    });
  }

  function getCarrerasList(rows) {
    return groupByCarrera(rows).map(function (group) {
      return {
        id: group.id,
        carrera: group.carrera,
        total: group.total,
        modalidad: group.modalidad
      };
    });
  }

  window.TITULACION_BRAIN_CARRERAS = {
    groupByCarrera: groupByCarrera,
    detectModalidad: detectModalidad,
    filterByModalidad: filterByModalidad,
    buildCarreraSummary: buildCarreraSummary,
    buildCarreraSections: buildCarreraSections,
    getCarrerasList: getCarrerasList
  };
})(window);