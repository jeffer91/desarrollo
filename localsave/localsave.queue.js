/*
Nombre completo: localsave.queue.js
Ubicación: /desarrollo/localsave/localsave.queue.js
Función o funciones:
- Mantener la cola local de cambios pendientes por sincronizar
- Registrar automáticamente cada operación local
- Listar, eliminar y limpiar pendientes
*/

(function (window) {
  "use strict";

  function must(name) {
    const mod = window[name];
    if (!mod) throw new Error(name + " no disponible.");
    return mod;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function randomId() {
    return "lsq-" + Date.now() + "-" + Math.random().toString(36).slice(2, 10);
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readQueue() {
    const FS = must("LocalSaveFS");
    const cfg = must("LocalSaveConfig").get();
    const data = FS.readDataFile(cfg.files.queue, []);
    return Array.isArray(data) ? data : [];
  }

  function writeQueue(queue) {
    const FS = must("LocalSaveFS");
    const cfg = must("LocalSaveConfig").get();
    const normalized = Array.isArray(queue) ? queue : [];
    return FS.writeDataFile(cfg.files.queue, normalized);
  }

  function normalizeEntry(entry) {
    const raw = entry && typeof entry === "object" ? entry : {};
    return {
      queueId: String(raw.queueId || randomId()),
      createdAt: String(raw.createdAt || nowIso()),
      scope: String(raw.scope || "").trim(),
      action: String(raw.action || "upsert").trim(),
      recordId: raw.recordId == null ? "" : String(raw.recordId),
      periodId: raw.periodId == null ? "" : String(raw.periodId),
      payload: raw.payload && typeof raw.payload === "object" ? clone(raw.payload) : {},
      meta: raw.meta && typeof raw.meta === "object" ? clone(raw.meta) : {}
    };
  }

  function enqueue(entry) {
    const queue = readQueue();
    const item = normalizeEntry(entry);
    queue.push(item);

    const saved = writeQueue(queue);
    if (!saved.ok) return saved;

    return {
      ok: true,
      item
    };
  }

  function removeByQueueIds(queueIds) {
    const ids = Array.isArray(queueIds) ? queueIds.map(String) : [];
    const queue = readQueue();
    const filtered = queue.filter(function (item) {
      return ids.indexOf(String(item.queueId)) === -1;
    });

    const saved = writeQueue(filtered);
    if (!saved.ok) return saved;

    return {
      ok: true,
      removed: queue.length - filtered.length,
      remaining: filtered.length
    };
  }

  function clear() {
    return writeQueue([]);
  }

  function count() {
    return readQueue().length;
  }

  const api = {
    read: readQueue,
    write: writeQueue,
    enqueue,
    removeByQueueIds,
    clear,
    count
  };

  window.LocalSaveQueue = api;
})(window);