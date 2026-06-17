/* =========================================================
Nombre completo: localsave/localsave.index.js
Función:
- Punto de entrada público de LocalSave
- Inicializa FS, scheduler y expone API unificada
- Mantiene lectura/escritura local para módulos desacoplados
========================================================= */
(function attachLocalSaveIndex(window, document) {
  "use strict";

  var booted = false;

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

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  async function init() {
    if (booted) {
      return {
        ok: true,
        alreadyInitialized: true
      };
    }

    var FS = window.LocalSaveFS || null;
    var Scheduler = window.LocalSaveScheduler || null;

    if (FS && typeof FS.ensureReady === "function") {
      await FS.ensureReady();
    }

    if (Scheduler && typeof Scheduler.start === "function") {
      Scheduler.start();
    }

    booted = true;
    return {
      ok: true,
      alreadyInitialized: false
    };
  }

  async function readSnapshot() {
    var Snapshot = must("LocalSaveSnapshot");
    if (typeof Snapshot.read === "function") {
      var data = await Snapshot.read();
      return clone(data);
    }
    return { scopes: {} };
  }

  async function readScope(scope) {
    var Snapshot = must("LocalSaveSnapshot");
    var name = String(scope == null ? "" : scope).trim();
    if (!name) {
      return [];
    }

    if (typeof Snapshot.readScope === "function") {
      var rows = await Snapshot.readScope(name);
      return clone(safeArray(rows));
    }

    var all = await readSnapshot();
    var bucket = all && all.scopes && all.scopes[name] ? all.scopes[name] : {};
    return Object.keys(bucket).map(function (id) {
      return clone(bucket[id]);
    });
  }

  async function getRecord(scope, recordId) {
    var rows = await readScope(scope);
    var wanted = String(recordId == null ? "" : recordId).trim();
    if (!wanted) {
      return null;
    }
    for (var i = 0; i < rows.length; i += 1) {
      var item = rows[i] || {};
      var itemId = String(
        item._docId ||
        item.id ||
        item.cedula ||
        ""
      ).trim();
      if (itemId === wanted) {
        return clone(item);
      }
    }
    return null;
  }

  async function saveRecord(scope, record, options) {
    var Store = must("LocalSaveStore");
    var name = String(scope == null ? "" : scope).trim();
    if (!name) {
      throw new Error("Scope inválido.");
    }
    if (!record || typeof record !== "object") {
      throw new Error("Record inválido.");
    }
    return Store.saveRecord(name, clone(record), options || {});
  }

  async function deleteRecord(scope, recordId, options) {
    var Snapshot = must("LocalSaveSnapshot");
    var Queue = must("LocalSaveQueue");
    var name = String(scope == null ? "" : scope).trim();
    var id = String(recordId == null ? "" : recordId).trim();

    if (!name) {
      throw new Error("Scope inválido.");
    }
    if (!id) {
      throw new Error("recordId inválido.");
    }

    var current = await getRecord(name, id);

    if (typeof Snapshot.remove === "function") {
      await Snapshot.remove(name, id);
    } else if (typeof Snapshot.read === "function" && typeof Snapshot.write === "function") {
      var snapshot = await Snapshot.read();
      snapshot = snapshot && typeof snapshot === "object" ? snapshot : { scopes: {} };
      snapshot.scopes = snapshot.scopes || {};
      snapshot.scopes[name] = snapshot.scopes[name] || {};
      delete snapshot.scopes[name][id];
      await Snapshot.write(snapshot);
    }

    if (Queue && typeof Queue.enqueue === "function") {
      await Queue.enqueue({
        scope: name,
        action: "delete",
        recordId: id,
        periodId: (options && options.periodId) || (current && (current.periodoId || current.periodId)) || "",
        payload: current || { _docId: id },
        meta: {
          source: (options && options.source) || "localsave.index",
          deletedAt: new Date().toISOString()
        }
      });
    }

    return { ok: true };
  }

  async function syncNow(options) {
    var Sync = must("LocalSaveSync");
    return Sync.run(options || {});
  }

  async function pullNow(options) {
    var Pull = must("LocalSavePull");
    return Pull.run(options || {});
  }

  function canPullNow(options) {
    var Pull = must("LocalSavePull");
    return Pull.canRunNow(options || {});
  }

  async function getStatus() {
    var Status = must("LocalSaveStatus");
    if (typeof Status.getStatus === "function") {
      return Status.getStatus();
    }
    return { ok: true };
  }

  function startScheduler() {
    var Scheduler = must("LocalSaveScheduler");
    return Scheduler.start();
  }

  function stopScheduler() {
    var Scheduler = must("LocalSaveScheduler");
    return Scheduler.stop();
  }

  window.LocalSave = {
    init: init,
    getConfig: function () {
      return must("LocalSaveConfig").get();
    },
    setConfig: function (patch) {
      return must("LocalSaveConfig").set(patch || {});
    },
    getStatus: getStatus,
    readSnapshot: readSnapshot,
    readScope: readScope,
    getRecord: getRecord,
    saveRecord: saveRecord,
    deleteRecord: deleteRecord,
    syncNow: syncNow,
    pullNow: pullNow,
    canPullNow: canPullNow,
    startScheduler: startScheduler,
    stopScheduler: stopScheduler
  };

  document.addEventListener("DOMContentLoaded", function () {
    init().catch(function (error) {
      console.error("[LocalSave] No se pudo iniciar:", error);
    });
  });
})(window, document);