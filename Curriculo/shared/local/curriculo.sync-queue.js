/* Curriculo sync queue: API simple para la cola local */
(function (window) {
  "use strict";

  function requireLocal() {
    if (!window.CurriculoLocal) {
      throw new Error("CurriculoLocal no está cargado.");
    }
    return window.CurriculoLocal;
  }

  async function add(collection, id, data, options) {
    return await requireLocal().put(collection, id, data, options || {});
  }

  async function remove(collection, id, options) {
    return await requireLocal().remove(collection, id, options || {});
  }

  async function listPending() {
    return await requireLocal().pending();
  }

  async function listAll() {
    if (typeof requireLocal().queueItems === "function") {
      return await requireLocal().queueItems();
    }
    return await listPending();
  }

  async function countPending() {
    return (await listPending()).length;
  }

  async function hasPending() {
    return (await countPending()) > 0;
  }

  async function markSynced(queueKey) {
    return await requireLocal().markSynced(queueKey);
  }

  async function status() {
    return await requireLocal().status();
  }

  async function syncNow(options) {
    if (!window.CurriculoSync || typeof window.CurriculoSync.syncNow !== "function") {
      throw new Error("CurriculoSync no está cargado.");
    }
    return await window.CurriculoSync.syncNow(options || { force: true });
  }

  window.CurriculoSyncQueue = {
    add: add,
    remove: remove,
    listPending: listPending,
    listAll: listAll,
    countPending: countPending,
    hasPending: hasPending,
    markSynced: markSynced,
    status: status,
    syncNow: syncNow
  };
})(window);
