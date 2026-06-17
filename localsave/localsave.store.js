/*
Nombre completo: localsave.store.js
Ubicación: /desarrollo/localsave/localsave.store.js
Función o funciones:
- Orquestar el guardado local automático
- Guardar primero en snapshot y luego registrar el cambio en la cola
- Exponer funciones simples para guardar, eliminar y consultar datos locales
*/

(function (window) {
  "use strict";

  function must(name) {
    const mod = window[name];
    if (!mod) throw new Error(name + " no disponible.");
    return mod;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function normalizeRecord(record) {
    return record && typeof record === "object" ? clone(record) : {};
  }

  function saveRecord(scope, record, options) {
    const Snapshot = must("LocalSaveSnapshot");
    const Queue = must("LocalSaveQueue");

    const opts = options && typeof options === "object" ? options : {};
    const row = normalizeRecord(record);
    const idField = String(opts.idField || "id").trim();
    const action = String(opts.action || "upsert").trim();

    if (!row[idField]) {
      throw new Error("saveRecord requiere un id válido.");
    }

    const savedSnapshot = Snapshot.upsert(scope, row, idField);
    if (!savedSnapshot.ok) return savedSnapshot;

    const shouldQueue = opts.queue !== false;
    if (!shouldQueue) {
      return {
        ok: true,
        localOnly: true,
        scope: scope,
        recordId: String(row[idField])
      };
    }

    const queued = Queue.enqueue({
      scope: scope,
      action: action,
      recordId: String(row[idField]),
      periodId: opts.periodId || row.periodoId || row.periodId || "",
      payload: row,
      meta: {
        savedAt: nowIso(),
        source: String(opts.source || "localsave.store")
      }
    });

    if (!queued.ok) return queued;

    return {
      ok: true,
      scope: String(scope || ""),
      recordId: String(row[idField]),
      queueId: queued.item.queueId
    };
  }

  function deleteRecord(scope, recordId, options) {
    const Snapshot = must("LocalSaveSnapshot");
    const Queue = must("LocalSaveQueue");

    const opts = options && typeof options === "object" ? options : {};
    const id = String(recordId || "").trim();
    if (!id) throw new Error("deleteRecord requiere recordId.");

    const removed = Snapshot.remove(scope, id);
    if (!removed.ok) return removed;

    const shouldQueue = opts.queue !== false;
    if (!shouldQueue) {
      return {
        ok: true,
        localOnly: true,
        scope: scope,
        recordId: id
      };
    }

    const queued = Queue.enqueue({
      scope: scope,
      action: "delete",
      recordId: id,
      periodId: opts.periodId || "",
      payload: {
        id: id
      },
      meta: {
        savedAt: nowIso(),
        source: String(opts.source || "localsave.store")
      }
    });

    if (!queued.ok) return queued;

    return {
      ok: true,
      scope: String(scope || ""),
      recordId: id,
      queueId: queued.item.queueId
    };
  }

  function replaceScope(scope, records, options) {
    const Snapshot = must("LocalSaveSnapshot");
    const Queue = must("LocalSaveQueue");

    const opts = options && typeof options === "object" ? options : {};
    const list = Array.isArray(records) ? records : [];
    const idField = String(opts.idField || "id").trim();

    const replaced = Snapshot.replaceScope(scope, list, idField);
    if (!replaced.ok) return replaced;

    const shouldQueue = opts.queue !== false;
    if (!shouldQueue) {
      return {
        ok: true,
        localOnly: true,
        scope: scope,
        total: list.length
      };
    }

    const queued = Queue.enqueue({
      scope: scope,
      action: "replaceScope",
      recordId: "",
      periodId: String(opts.periodId || ""),
      payload: {
        idField: idField,
        items: clone(list)
      },
      meta: {
        savedAt: nowIso(),
        source: String(opts.source || "localsave.store")
      }
    });

    if (!queued.ok) return queued;

    return {
      ok: true,
      scope: String(scope || ""),
      total: list.length,
      queueId: queued.item.queueId
    };
  }

  function readScope(scope) {
    return must("LocalSaveSnapshot").readScope(scope);
  }

  function getRecord(scope, recordId) {
    return must("LocalSaveSnapshot").getRecord(scope, recordId);
  }

  const api = {
    saveRecord,
    deleteRecord,
    replaceScope,
    readScope,
    getRecord
  };

  window.LocalSaveStore = api;
})(window);