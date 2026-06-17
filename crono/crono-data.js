/*
=========================================================
Nombre completo: crono-data.js
Ruta o ubicación: /Requisitos/crono/crono-data.js

Función o funciones:
1. Leer períodos desde ExcelLocalRepo.
2. Leer estudiantes desde ExcelLocalRepo.
3. Normalizar cédula, nombre, carrera, período, división, requisitos y nota.
4. Identificar estudiantes habilitados con Notart >= 7 y requisitos completos.
=========================================================
*/
(function (window) {
  "use strict";

  var U = window.CronoUtils;

  var REQUIREMENTS = [
    {
      key: "academico",
      label: "Académico",
      aliases: ["academico", "académico"]
    },
    {
      key: "documentacion",
      label: "Documentación",
      aliases: ["documentacion", "documentación"]
    },
    {
      key: "financiero",
      label: "Financiero",
      aliases: ["financiero"]
    },
    {
      key: "practicas",
      label: "Prácticas",
      aliases: ["practicas", "prácticas", "practicaspreprofesionales"]
    },
    {
      key: "vinculacion",
      label: "Vinculación",
      aliases: ["vinculacion", "vinculación"]
    },
    {
      key: "seguimiento",
      label: "Seguimiento Graduados",
      aliases: [
        "seguimiento",
        "seguimientograduados",
        "seguimientoegresados",
        "seguimientograduado"
      ]
    },
    {
      key: "ingles",
      label: "Inglés",
      aliases: ["ingles", "inglés"]
    },
    {
      key: "datos",
      label: "Actualización Datos",
      aliases: [
        "actualizaciondatos",
        "actualizacióndatos",
        "actualizaciondedatos",
        "actualizacióndedatos",
        "datos"
      ]
    }
  ];

  function ensureReady() {
    try {
      if (
        window.ExcelLocalBridge &&
        typeof window.ExcelLocalBridge.ensureReady === "function"
      ) {
        window.ExcelLocalBridge.ensureReady();
      }
    } catch (error) {
      console.warn("[CronoData] ExcelLocalBridge no pudo iniciar:", error);
    }
  }

  function getRepo() {
    ensureReady();

    if (!window.ExcelLocalRepo) {
      throw new Error("ExcelLocalRepo no está disponible.");
    }

    return window.ExcelLocalRepo;
  }

  function normalizePeriod(row) {
    var data = row || {};
    var id = U.asText(U.pickFirst(data, ["id", "periodoId", "PeriodoId", "periodo"]));

    return {
      id: id,
      label: U.asText(U.pickFirst(data, ["label", "nombre", "periodo", "Periodo"])) || id,
      raw: data
    };
  }

  function getReqStatus(row, def) {
    var data = row || {};
    var keys = Object.keys(data);
    var map = Object.create(null);

    keys.forEach(function (key) {
      map[U.normalizeKey(key)] = key;
    });

    for (var i = 0; i < def.aliases.length; i += 1) {
      var aliasNorm = U.normalizeKey(def.aliases[i]);

      if (map[aliasNorm]) {
        var value = U.normalizeText(data[map[aliasNorm]]).toUpperCase();
        if (value === "CUMPLE") return "CUMPLE";
        if (value === "NO CUMPLE") return "NO CUMPLE";
      }
    }

    for (var j = 0; j < keys.length; j += 1) {
      var realKey = keys[j];
      var nk = U.normalizeKey(realKey);

      for (var a = 0; a < def.aliases.length; a += 1) {
        var shortAlias = U.normalizeKey(def.aliases[a]);

        if (nk.indexOf(shortAlias) >= 0) {
          var v = U.normalizeText(data[realKey]).toUpperCase();
          if (v === "CUMPLE") return "CUMPLE";
          if (v === "NO CUMPLE") return "NO CUMPLE";
        }
      }
    }

    return "NO CUMPLE";
  }

  function readNotart(row) {
    var raw = U.pickFirst(row, [
      "Notart",
      "NOTART",
      "notaArticulo",
      "NotaArticulo",
      "nota_articulo",
      "PROMEDIOTRABAJOESCRITO",
      "PromedioTrabajoEscrito",
      "promediotrabajoescrito",
      "TrabajoEscrito",
      "trabajoEscrito"
    ]);

    return U.toNumber(raw);
  }

  function normalizeStudent(row) {
    var data = row || {};

    var cedula = U.asText(U.pickFirst(data, [
      "cedula",
      "Cedula",
      "Cédula",
      "numeroIdentificacion",
      "NumeroIdentificacion",
      "identificacion",
      "Identificacion",
      "_docId",
      "docId",
      "id"
    ]));

    var nombre = U.asText(U.pickFirst(data, [
      "estudiante",
      "Estudiante",
      "nombres",
      "Nombres",
      "nombre",
      "Nombre",
      "apellidos",
      "Apellidos"
    ]));

    var carrera = U.normalizeText(U.pickFirst(data, [
      "carrera",
      "Carrera",
      "nombrecarrera",
      "nombreCarrera",
      "NombreCarrera",
      "abreviatura_carrera",
      "AbreviaturaCarrera"
    ]));

    var periodoId = U.asText(U.pickFirst(data, [
      "periodoId",
      "periodo_id",
      "PeriodoId",
      "periodo",
      "Periodo"
    ]));

    var divisionRaw = U.asText(U.pickFirst(data, [
      "divisionPeriodo",
      "division_periodo",
      "division",
      "Division",
      "grupo",
      "Grupo",
      "convocatoria",
      "Convocatoria"
    ]));

    var divisionId = divisionRaw ? U.normalizeKey(divisionRaw) : "general";
    var divisionLabel = divisionRaw || "General";

    var sede = U.asText(U.pickFirst(data, ["sede", "Sede"]));
    var horario = U.asText(U.pickFirst(data, ["horario", "Horario"]));
    var estadoMatricula = U.asText(U.pickFirst(data, [
      "estadoMatricula",
      "EstadoMatricula",
      "estado",
      "Estado"
    ]));

    var notart = readNotart(data);

    var reqs = {};
    var cumpleTodo = true;

    REQUIREMENTS.forEach(function (def) {
      var status = getReqStatus(data, def);
      reqs[def.key] = status;

      if (status !== "CUMPLE") cumpleTodo = false;
    });

    var habilitado = Number.isFinite(notart) && notart >= 7 && cumpleTodo;

    return {
      id: cedula,
      cedula: cedula,
      nombre: nombre,
      carrera: carrera || "Sin carrera",
      periodoId: periodoId,
      divisionId: divisionId,
      divisionLabel: divisionLabel,
      sede: sede,
      horario: horario,
      estadoMatricula: estadoMatricula,
      notart: Number.isFinite(notart) ? notart : null,
      requisitos: reqs,
      requisitosCompletos: cumpleTodo,
      habilitado: habilitado,
      raw: data
    };
  }

  function loadPeriods() {
    var repo = getRepo();
    var rows = [];

    if (typeof repo.listPeriods === "function") {
      rows = repo.listPeriods() || [];
    }

    return rows
      .map(normalizePeriod)
      .filter(function (p) { return !!p.id; })
      .sort(function (a, b) { return U.compareSpanish(a.label, b.label); });
  }

  function loadStudents() {
    var repo = getRepo();
    var rows = [];

    if (typeof repo.listAllStudents === "function") {
      rows = repo.listAllStudents() || [];
    }

    return rows
      .map(normalizeStudent)
      .filter(function (s) { return !!s.cedula; });
  }

  function loadAll() {
    return {
      periods: loadPeriods(),
      students: loadStudents()
    };
  }

  window.CronoData = {
    REQUIREMENTS: REQUIREMENTS,
    loadPeriods: loadPeriods,
    loadStudents: loadStudents,
    loadAll: loadAll,
    normalizeStudent: normalizeStudent,
    normalizePeriod: normalizePeriod
  };
})(window);
