/* =========================================================
Nombre completo: localsave/localsave.pull.js
Función:
- Pull manual desde Firebase hacia snapshot local
- Diseñado para usarse una vez al día en la mañana
- Reemplaza snapshot local con datos remotos de colecciones configuradas
========================================================= */
(function attachLocalSavePull(window) {
  "use strict";

  function must(name) {
    var value = window[name];
    if (!value) {
      throw new Error(name + " no disponible.");
    }
    return value;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function pad2(value) {
    return String(Number(value || 0)).padStart(2, "0");
  }

  function getDayKey(date) {
    var d = date instanceof Date ? date : new Date();
    return [
      d.getFullYear(),
      pad2(d.getMonth() + 1),
      pad2(d.getDate())
    ].join("-");
  }

  function readState(key) {
    try {
      var raw = window.localStorage.getItem(String(key || ""));
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      return {};
    }
  }

  function writeState(key, value) {
    try {
      window.localStorage.setItem(String(key || ""), JSON.stringify(value || {}));
      return true;
    } catch (error) {
      return false;
    }
  }

  function getPullConfig() {
    var Config = must("LocalSaveConfig");
    var cfg = Config.get();
    return cfg.workday && cfg.workday.morningPull ? cfg.workday.morningPull : {};
  }

  function getMinutesOfDay(date) {
    var d = date instanceof Date ? date : new Date();
    return d.getHours() * 60 + d.getMinutes();
  }

  function isInWindow(date, cfg) {
    var minute = getMinutesOfDay(date);
    var start = Number(cfg.startHour24 || 8) * 60 + Number(cfg.startMinute || 0);
    var end = Number(cfg.endHour24 || 9) * 60 + Number(cfg.endMinute || 0);
    return minute >= start && minute < end;
  }

  function hasRunToday() {
    var cfg = getPullConfig();
    var state = readState(cfg.stateStorageKey || "__localsave_pull_state__");
    return state.lastRunDay === getDayKey(new Date());
  }

  function markRunToday(payload) {
    var cfg = getPullConfig();
    writeState(cfg.stateStorageKey || "__localsave_pull_state__", {
      lastRunDay: getDayKey(new Date()),
      lastRunAt: nowIso(),
      payload: payload || null
    });
  }

  function canRunNow(options) {
    var cfg = getPullConfig();
    var force = !!(options && options.force);

    if (!cfg.enabled) {
      return false;
    }

    if (cfg.oncePerDay && hasRunToday() && !force) {
      return false;
    }

    if (cfg.allowForce && force) {
      return true;
    }

    return isInWindow(new Date(), cfg);
  }

  function getCompatRemoteAdapter() {
    if (
      window.firebase &&
      !window.firebase.__isLocalSaveShim &&
      typeof window.firebase.firestore === "function"
    ) {
      var db = window.firebase.firestore();
      return {
        name: "firebase-compat-remote",
        async readCollection(collectionName) {
          var snap = await db.collection(collectionName).get();
          return snap.docs.map(function (doc) {
            return Object.assign({ id: doc.id }, doc.data());
          });
        }
      };
    }
    return null;
  }

  function getInjectedPullAdapter() {
    var Config = must("LocalSaveConfig");
    var cfg = Config.get();
    var key = cfg.firebase && cfg.firebase.pullAdapterKey
      ? cfg.firebase.pullAdapterKey
      : "__DESARROLLO_FIREBASE_PULL_ADAPTER__";
    var adapter = window[key];
    if (!adapter || typeof adapter.readCollection !== "function") {
      return null;
    }
    return adapter;
  }

  function getRemoteAdapter() {
    return getInjectedPullAdapter() || getCompatRemoteAdapter();
  }

  function inferDocId(row, fallbackIndex) {
    var src = row || {};
    var value = src._docId || src.id || src.cedula || src.codigo || src.uid || ("row-" + fallbackIndex);
    return String(value).trim();
  }

  function inferScopeKeyFromCollectionName(collectionName, cfg) {
    var entries = Object.keys(cfg.collections || {});
    for (var i = 0; i < entries.length; i += 1) {
      var scope = entries[i];
      if (cfg.collections[scope] === collectionName) {
        return scope;
      }
    }
    return collectionName;
  }

  async function writeSnapshot(snapshot) {
    var Snapshot = window.LocalSaveSnapshot || null;
    if (Snapshot && typeof Snapshot.write === "function") {
      return Snapshot.write(snapshot);
    }

    var FS = window.LocalSaveFS || null;
    var Config = must("LocalSaveConfig");
    if (!FS || typeof FS.writeDataFile !== "function") {
      throw new Error("No existe mecanismo de escritura de snapshot.");
    }
    var fileName = Config.getFileNames().snapshot;
    return FS.writeDataFile(fileName, snapshot);
  }

  async function clearQueue() {
    var Queue = window.LocalSaveQueue || null;
    if (Queue && typeof Queue.clear === "function") {
      await Queue.clear();
    }
  }

  async function run(options) {
    var Config = must("LocalSaveConfig");
    var cfg = Config.get();
    var adapter = getRemoteAdapter();
    var collectionMap = cfg.collections || {};
    var targetCollections = Array.isArray(options && options.collections) && options.collections.length
      ? options.collections.slice()
      : Object.keys(collectionMap).map(function (scope) { return collectionMap[scope]; });

    if (!canRunNow(options || {})) {
      return {
        ok: false,
        message: "El pull no está permitido en este momento."
      };
    }

    if (!adapter) {
      return {
        ok: false,
        message: "No existe adapter remoto de Firebase para realizar pull."
      };
    }

    var snapshot = {
      meta: {
        pulledAt: nowIso(),
        source: adapter.name || "remote-adapter"
      },
      scopes: {}
    };

    var summary = {
      ok: true,
      pulledAt: snapshot.meta.pulledAt,
      collections: [],
      totalRows: 0
    };

    for (var i = 0; i < targetCollections.length; i += 1) {
      var collectionName = String(targetCollections[i] || "").trim();
      if (!collectionName) {
        continue;
      }

      var rows = await adapter.readCollection(collectionName);
      var safeRows = Array.isArray(rows) ? rows : [];
      var scope = inferScopeKeyFromCollectionName(collectionName, cfg);
      var bucket = {};

      safeRows.forEach(function (row, index) {
        var docId = inferDocId(row, index);
        bucket[docId] = Object.assign({}, clone(row), {
          _docId: docId,
          __scope: scope,
          __updatedAt: nowIso()
        });
      });

      snapshot.scopes[scope] = bucket;
      summary.collections.push({
        scope: scope,
        collection: collectionName,
        rows: safeRows.length
      });
      summary.totalRows += safeRows.length;
    }

    await writeSnapshot(snapshot);
    await clearQueue();
    markRunToday(summary);

    try {
      window.dispatchEvent(new CustomEvent("localsave:pull-finished", {
        detail: clone(summary)
      }));
    } catch (error) {
      console.warn("[LocalSavePull] No se pudo emitir evento localsave:pull-finished");
    }

    return summary;
  }

  window.LocalSavePull = {
    run: run,
    canRunNow: canRunNow,
    hasRunToday: hasRunToday,
    markRunToday: markRunToday
  };
})(window);