/* =========================================================
Nombre completo: localsave/localsave.sync.js
Función:
- Sincroniza la cola local hacia Firebase
- Soporta adapter inyectado, compat Firebase y modo dryRun
- Limpia solo los ítems exitosos de la cola
========================================================= */
(function attachLocalSaveSync(window) {
  "use strict";

  var currentPromise = null;

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

  function safeErrorMessage(error) {
    if (!error) return "Error desconocido.";
    return error.message ? String(error.message) : String(error);
  }

  function getCompatDb() {
    if (
      window.firebase &&
      typeof window.firebase.firestore === "function" &&
      !window.firebase.__isLocalSaveShim
    ) {
      try {
        return window.firebase.firestore();
      } catch (error) {
        return null;
      }
    }
    return null;
  }

  function createCompatAdapter() {
    var db = getCompatDb();
    if (!db) {
      return null;
    }

    return {
      name: "firebase-compat",
      async readCollection(collectionName) {
        var snap = await db.collection(collectionName).get();
        return snap.docs.map(function (doc) {
          return Object.assign({ id: doc.id }, doc.data());
        });
      },
      async upsertDoc(collectionName, docId, data) {
        await db.collection(collectionName).doc(String(docId)).set(clone(data), { merge: true });
        return { ok: true };
      },
      async deleteDoc(collectionName, docId) {
        await db.collection(collectionName).doc(String(docId)).delete();
        return { ok: true };
      }
    };
  }

  function getInjectedAdapter() {
    var Config = must("LocalSaveConfig");
    var cfg = Config.get();
    var key = cfg.firebase && cfg.firebase.adapterKey ? cfg.firebase.adapterKey : "__DESARROLLO_FIREBASE_ADAPTER__";
    var adapter = window[key];
    if (!adapter || typeof adapter !== "object") {
      return null;
    }
    if (
      typeof adapter.upsertDoc !== "function" ||
      typeof adapter.deleteDoc !== "function"
    ) {
      return null;
    }
    return adapter;
  }

  function getAdapter() {
    return getInjectedAdapter() || createCompatAdapter();
  }

  async function appendSyncLog(entry) {
    var FS = window.LocalSaveFS || null;
    var Config = must("LocalSaveConfig");
    var fileNames = Config.getFileNames();
    var logFile = fileNames.syncLog;

    if (!FS || typeof FS.readDataFile !== "function" || typeof FS.writeDataFile !== "function") {
      return false;
    }

    var current = await FS.readDataFile(logFile);
    var rows = Array.isArray(current) ? current.slice() : [];
    rows.unshift(Object.assign({ createdAt: nowIso() }, clone(entry)));
    await FS.writeDataFile(logFile, rows);
    return true;
  }

  async function applyOperation(adapter, operation) {
    if (!operation || !adapter) {
      throw new Error("Operación o adapter inválido.");
    }

    if (operation.action === "delete") {
      return adapter.deleteDoc(operation.collection, operation.docId);
    }

    return adapter.upsertDoc(operation.collection, operation.docId, operation.data || {});
  }

  async function run(options) {
    if (currentPromise) {
      return currentPromise;
    }

    currentPromise = (async function () {
      var Queue = must("LocalSaveQueue");
      var Map = must("LocalSaveFirebaseMap");
      var Config = must("LocalSaveConfig");

      var cfg = Config.get();
      var startedAt = nowIso();
      var adapter = getAdapter();
      var queue = await Queue.read();
      var result = {
        ok: true,
        startedAt: startedAt,
        finishedAt: "",
        processed: 0,
        succeeded: 0,
        failed: 0,
        queueCountBefore: Array.isArray(queue) ? queue.length : 0,
        queueCountAfter: 0,
        errors: [],
        trigger: options && options.trigger ? String(options.trigger) : "manual",
        reason: options && options.reason ? String(options.reason) : ""
      };

      if (!cfg.sync.enabled) {
        result.ok = false;
        result.finishedAt = nowIso();
        result.errors.push("La sincronización está deshabilitada en la configuración.");
        await appendSyncLog(result);
        return result;
      }

      if (!cfg.firebase.enabled) {
        result.ok = false;
        result.finishedAt = nowIso();
        result.errors.push("Firebase está deshabilitado en la configuración.");
        await appendSyncLog(result);
        return result;
      }

      if (!Array.isArray(queue) || !queue.length) {
        result.finishedAt = nowIso();
        result.queueCountAfter = 0;
        await appendSyncLog(result);
        return result;
      }

      if (!adapter) {
        result.ok = false;
        result.finishedAt = nowIso();
        result.errors.push("No existe adapter de Firebase disponible para sincronizar.");
        await appendSyncLog(result);
        return result;
      }

      var operations = Map.mapQueue(queue);
      var successfulQueueIds = [];
      result.processed = operations.length;

      for (var i = 0; i < operations.length; i += 1) {
        var operation = operations[i];
        try {
          if (cfg.firebase.dryRun) {
            successfulQueueIds.push(operation.queueId);
            result.succeeded += 1;
            continue;
          }
          await applyOperation(adapter, operation);
          successfulQueueIds.push(operation.queueId);
          result.succeeded += 1;
        } catch (error) {
          result.failed += 1;
          result.ok = false;
          result.errors.push({
            queueId: operation.queueId,
            scope: operation.scope,
            collection: operation.collection,
            docId: operation.docId,
            message: safeErrorMessage(error)
          });
        }
      }

      if (successfulQueueIds.length) {
        await Queue.removeByQueueIds(successfulQueueIds);
      }

      var queueAfter = await Queue.read();
      result.queueCountAfter = Array.isArray(queueAfter) ? queueAfter.length : 0;
      result.finishedAt = nowIso();

      await appendSyncLog(result);

      try {
        window.dispatchEvent(new CustomEvent("localsave:sync-finished", {
          detail: clone(result)
        }));
      } catch (error) {
        console.warn("[LocalSaveSync] No se pudo emitir evento localsave:sync-finished");
      }

      return result;
    })();

    try {
      return await currentPromise;
    } finally {
      currentPromise = null;
    }
  }

  function isRunning() {
    return !!currentPromise;
  }

  window.LocalSaveSync = {
    run: run,
    runNow: run,
    isRunning: isRunning,
    getAdapter: getAdapter,
    appendSyncLog: appendSyncLog
  };
})(window);