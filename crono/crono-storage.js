/*
=========================================================
Nombre completo: crono-storage.js
Ruta o ubicación: /Requisitos/crono/crono-storage.js

Función o funciones:
1. Guardar configuración de días, aulas, enlaces y tribunales.
2. Guardar agendas separadas por período, división y tipo.
3. Guardar resultados de Regulares para decidir quién pasa a Supletorios.
4. Usar localStorage para funcionar sin internet.
=========================================================
*/
(function (window) {
  "use strict";

  var U = window.CronoUtils;
  var STORAGE_KEY = "crono.v1.db";

  function emptyDb() {
    return {
      version: "1.0.0",
      updatedAt: "",
      configs: {
        default: null,
        careers: {}
      },
      tribunals: {
        default: null,
        careers: {}
      },
      agendas: {},
      results: {}
    };
  }

  function readDb() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var db = U.safeJsonParse(raw, null);

      if (!db || typeof db !== "object") return emptyDb();

      db.configs = db.configs || { default: null, careers: {} };
      db.configs.careers = db.configs.careers || {};
      db.tribunals = db.tribunals || { default: null, careers: {} };
      db.tribunals.careers = db.tribunals.careers || {};
      db.agendas = db.agendas || {};
      db.results = db.results || {};

      return db;
    } catch (error) {
      console.error("[CronoStorage] Error leyendo localStorage:", error);
      return emptyDb();
    }
  }

  function writeDb(db) {
    try {
      db.updatedAt = U.nowIso();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
      return true;
    } catch (error) {
      console.error("[CronoStorage] Error guardando localStorage:", error);
      return false;
    }
  }

  function safePart(value, fallback) {
    var txt = U.asText(value);
    return txt || fallback || "GENERAL";
  }

  function agendaKey(periodoId, divisionId, tipoAgenda) {
    return [
      safePart(periodoId, "SIN_PERIODO"),
      safePart(divisionId, "GENERAL"),
      safePart(tipoAgenda, "regulares")
    ].join("||");
  }

  function regularKey(periodoId, divisionId) {
    return agendaKey(periodoId, divisionId, "regulares");
  }

  function normalizeCareerKey(career) {
    return U.normalizeKey(career || "default") || "default";
  }

  function saveCareerConfig(career, config) {
    var db = readDb();
    var key = normalizeCareerKey(career);

    if (key === "default" || U.asText(career) === "" || U.asText(career) === "__TODAS__") {
      db.configs.default = config || null;
    } else {
      db.configs.careers[key] = config || null;
    }

    return writeDb(db);
  }

  function getCareerConfig(career) {
    var db = readDb();
    var key = normalizeCareerKey(career);

    return db.configs.careers[key] || db.configs.default || {
      days: [],
      rooms: [],
      virtualLink: ""
    };
  }

  function saveTribunals(career, tribunals) {
    var db = readDb();
    var key = normalizeCareerKey(career);

    if (key === "default" || U.asText(career) === "" || U.asText(career) === "__TODAS__") {
      db.tribunals.default = tribunals || null;
    } else {
      db.tribunals.careers[key] = tribunals || null;
    }

    return writeDb(db);
  }

  function getTribunals(career) {
    var db = readDb();
    var key = normalizeCareerKey(career);

    return db.tribunals.careers[key] || db.tribunals.default || [];
  }

  function saveAgenda(periodoId, divisionId, tipoAgenda, agenda) {
    var db = readDb();
    var key = agendaKey(periodoId, divisionId, tipoAgenda);

    db.agendas[key] = {
      periodoId: periodoId,
      divisionId: divisionId,
      tipoAgenda: tipoAgenda,
      agenda: Array.isArray(agenda) ? agenda : [],
      savedAt: U.nowIso()
    };

    return writeDb(db);
  }

  function getAgenda(periodoId, divisionId, tipoAgenda) {
    var db = readDb();
    var key = agendaKey(periodoId, divisionId, tipoAgenda);
    var found = db.agendas[key];

    return found && Array.isArray(found.agenda) ? found.agenda : [];
  }

  function deleteAgenda(periodoId, divisionId, tipoAgenda) {
    var db = readDb();
    var key = agendaKey(periodoId, divisionId, tipoAgenda);

    delete db.agendas[key];

    return writeDb(db);
  }

  function saveRegularResult(periodoId, divisionId, cedula, value) {
    var db = readDb();
    var key = regularKey(periodoId, divisionId);
    var doc = U.asText(cedula);

    if (!db.results[key]) db.results[key] = {};
    db.results[key][doc] = value === "no_paso" ? "no_paso" : "paso";

    return writeDb(db);
  }

  function getRegularResult(periodoId, divisionId, cedula) {
    var db = readDb();
    var key = regularKey(periodoId, divisionId);
    var doc = U.asText(cedula);

    return db.results[key] && db.results[key][doc]
      ? db.results[key][doc]
      : "";
  }

  function getRegularResults(periodoId, divisionId) {
    var db = readDb();
    var key = regularKey(periodoId, divisionId);

    return db.results[key] || {};
  }

  function saveResultsFromAgenda(periodoId, divisionId, agenda) {
    var list = Array.isArray(agenda) ? agenda : [];

    list.forEach(function (item) {
      if (!item || !item.cedula) return;

      saveRegularResult(
        periodoId,
        divisionId,
        item.cedula,
        item.resultadoRegular === "no_paso" ? "no_paso" : "paso"
      );
    });
  }

  window.CronoStorage = {
    readDb: readDb,
    writeDb: writeDb,
    agendaKey: agendaKey,
    regularKey: regularKey,
    saveCareerConfig: saveCareerConfig,
    getCareerConfig: getCareerConfig,
    saveTribunals: saveTribunals,
    getTribunals: getTribunals,
    saveAgenda: saveAgenda,
    getAgenda: getAgenda,
    deleteAgenda: deleteAgenda,
    saveRegularResult: saveRegularResult,
    getRegularResult: getRegularResult,
    getRegularResults: getRegularResults,
    saveResultsFromAgenda: saveResultsFromAgenda
  };
})(window);
