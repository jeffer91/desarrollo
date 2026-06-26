/* Curriculo sync queue: API simple para la cola local + puente opcional con Base local BL */
(function (window) {
  "use strict";

  function requireLocal() {
    if (!window.CurriculoLocal) {
      throw new Error("CurriculoLocal no está cargado.");
    }
    return window.CurriculoLocal;
  }

  function safeParentWindow() {
    try {
      if (window.parent && window.parent !== window) return window.parent;
    } catch (error) {
      return null;
    }
    return null;
  }

  function safeTopWindow() {
    try {
      if (window.top && window.top !== window) return window.top;
    } catch (error) {
      return null;
    }
    return null;
  }

  function readCurriculoBL(sourceWindow) {
    try {
      return sourceWindow && sourceWindow.CurriculoBL ? sourceWindow.CurriculoBL : null;
    } catch (error) {
      return null;
    }
  }

  function getBaseLocalRoot() {
    var candidates = [window, safeParentWindow(), safeTopWindow()];
    var index;
    var BL;

    for (index = 0; index < candidates.length; index += 1) {
      BL = readCurriculoBL(candidates[index]);
      if (BL) return BL;
    }

    return null;
  }

  function normalizeModuleName(value) {
    return String(value || "general")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/-/g, "_");
  }

  function getBaseLocalModule(collection) {
    var BL = getBaseLocalRoot();
    var moduleName = normalizeModuleName(collection);

    if (!BL || !BL.modulos) return null;
    return BL.modulos[moduleName] || null;
  }

  async function mirrorToBaseLocal(collection, id, data, options) {
    var BL = getBaseLocalRoot();
    var moduleConnector = getBaseLocalModule(collection);
    var payload;

    if (!BL || !BL.storage || !BL.schema) return null;

    payload = Object.assign({}, data || {}, {
      idLocal: (data && data.idLocal) || "queue-" + String(collection || "general") + "-" + String(id || "sin-id"),
      nombre: (data && (data.nombre || data.name || data.titulo)) || String(id || "registro-sin-nombre"),
      modulo: normalizeModuleName(collection),
      ruta: (options && options.ruta) || "Curriculo/" + normalizeModuleName(collection),
      estado: (BL.config && BL.config.estadosRegistro && BL.config.estadosRegistro.PENDIENTE) || "pendiente",
      origen: "curriculo-sync-queue"
    });

    try {
      if (moduleConnector && typeof moduleConnector.save === "function") {
        return await moduleConnector.save(payload);
      }

      return await BL.storage.appendToArray("registros", "registros", BL.schema.normalizeRecord(payload));
    } catch (error) {
      if (BL.logger && typeof BL.logger.warn === "function") {
        BL.logger.warn("No se pudo reflejar cambio en Base local BL.", {
          collection: collection,
          id: id,
          error: error.message
        });
      }
      return null;
    }
  }

  async function add(collection, id, data, options) {
    var result = await requireLocal().put(collection, id, data, options || {});
    await mirrorToBaseLocal(collection, id, data, options || {});
    return result;
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
    syncNow: syncNow,
    mirrorToBaseLocal: mirrorToBaseLocal,
    getBaseLocalRoot: getBaseLocalRoot
  };
})(window);
