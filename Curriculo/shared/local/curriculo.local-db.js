/* Curriculo local DB: guardado local central + cola de sincronización */
(function (window, document) {
  "use strict";

  var DB_NAME = "curriculo_local_db_v1";
  var DB_VERSION = 2;
  var STORES = { records: "records", queue: "sync_queue", meta: "meta" };
  var FALLBACK_KEY = "curriculo_local_fallback_v1";
  var dbPromise = null;
  var indexedOk = !!window.indexedDB;

  function nowIso() { return new Date().toISOString(); }
  function text(v) { return String(v == null ? "" : v).trim(); }
  function key(c, id) { return text(c) + "::" + text(id); }
  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function clone(v) {
    try { return JSON.parse(JSON.stringify(v == null ? null : v)); } catch (e) { return v; }
  }
  function fallbackBase() {
    var base;
    try { base = JSON.parse(window.localStorage.getItem(FALLBACK_KEY) || "{}"); } catch (e) { base = {}; }
    if (!base || typeof base !== "object") base = {};
    if (!base.records) base.records = {};
    if (!base.queue) base.queue = {};
    if (!base.meta) base.meta = {};
    return base;
  }
  function saveFallback(base) { window.localStorage.setItem(FALLBACK_KEY, JSON.stringify(base || {})); }
  function emit(name, detail) {
    var ev;
    try { ev = new CustomEvent(name, { detail: detail || {} }); }
    catch (e) { ev = document.createEvent("CustomEvent"); ev.initCustomEvent(name, false, false, detail || {}); }
    window.dispatchEvent(ev);
  }

  function openDb() {
    if (!indexedOk) return Promise.resolve(null);
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve) {
      var req;
      try { req = window.indexedDB.open(DB_NAME, DB_VERSION); }
      catch (e) { indexedOk = false; resolve(null); return; }
      req.onupgradeneeded = function (ev) {
        var db = ev.target.result;
        Object.keys(STORES).forEach(function (k) {
          if (!db.objectStoreNames.contains(STORES[k])) db.createObjectStore(STORES[k], { keyPath: "key" });
        });
      };
      req.onsuccess = function (ev) {
        var db = ev.target.result;
        db.onversionchange = function () { db.close(); dbPromise = null; };
        resolve(db);
      };
      req.onerror = function () { indexedOk = false; dbPromise = null; resolve(null); };
      req.onblocked = function () { indexedOk = false; dbPromise = null; resolve(null); };
    });
    return dbPromise;
  }

  async function idbGet(storeName, recordKey) {
    var db = await openDb();
    if (!db) return null;
    return await new Promise(function (resolve, reject) {
      var tx = db.transaction(storeName, "readonly");
      var req = tx.objectStore(storeName).get(recordKey);
      req.onsuccess = function () { resolve(req.result || null); };
      req.onerror = function () { reject(req.error); };
      tx.onerror = function () { reject(tx.error); };
    }).catch(function () { indexedOk = false; dbPromise = null; return null; });
  }

  async function idbAll(storeName) {
    var db = await openDb();
    if (!db) return null;
    return await new Promise(function (resolve, reject) {
      var tx = db.transaction(storeName, "readonly");
      var req = tx.objectStore(storeName).getAll();
      req.onsuccess = function () { resolve(req.result || []); };
      req.onerror = function () { reject(req.error); };
      tx.onerror = function () { reject(tx.error); };
    }).catch(function () { indexedOk = false; dbPromise = null; return null; });
  }

  async function idbPut(storeName, value) {
    var db = await openDb();
    if (!db) return false;
    return await new Promise(function (resolve, reject) {
      var tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).put(value);
      tx.oncomplete = function () { resolve(true); };
      tx.onerror = function () { reject(tx.error); };
      tx.onabort = function () { reject(tx.error); };
    }).catch(function () { indexedOk = false; dbPromise = null; return false; });
  }

  async function idbDelete(storeName, recordKey) {
    var db = await openDb();
    if (!db) return false;
    return await new Promise(function (resolve, reject) {
      var tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).delete(recordKey);
      tx.oncomplete = function () { resolve(true); };
      tx.onerror = function () { reject(tx.error); };
      tx.onabort = function () { reject(tx.error); };
    }).catch(function () { indexedOk = false; dbPromise = null; return false; });
  }

  async function queueGet(queueKey) {
    var db = await openDb();
    var base;
    if (db) return await idbGet(STORES.queue, queueKey);
    base = fallbackBase();
    return base.queue[queueKey] || null;
  }

  async function queueSave(item) {
    var db = await openDb();
    var base;
    if (db && await idbPut(STORES.queue, item)) return;
    base = fallbackBase();
    base.queue[item.key] = item;
    saveFallback(base);
  }

  async function put(collection, id, data, options) {
    var col = text(collection), safeId = text(id), recordKey = key(col, safeId), opts = options || {};
    var record, previous, item, db, base;
    if (!col || !safeId) throw new Error("Currículo local: colección e id son obligatorios.");
    record = { key: recordKey, collection: col, id: safeId, data: clone(data || {}), updatedAtLocal: nowIso() };
    db = await openDb();
    if (db && await idbPut(STORES.records, record)) { /* guardado */ }
    else { base = fallbackBase(); base.records[recordKey] = record; saveFallback(base); }
    if (opts.markDirty === false) { dispatchStatus(); return clone(record.data); }
    previous = await queueGet(recordKey);
    item = {
      key: recordKey,
      collection: col,
      remoteCollection: text(opts.remoteCollection || col),
      id: safeId,
      operation: text(opts.operation || "set"),
      data: clone(data || {}),
      createdAtLocal: previous && previous.createdAtLocal ? previous.createdAtLocal : nowIso(),
      updatedAtLocal: nowIso(),
      attempts: Number(previous && previous.attempts ? previous.attempts : 0),
      lastError: "",
      status: "pending"
    };
    await queueSave(item);
    dispatchStatus();
    return clone(record.data);
  }

  async function get(collection, id) {
    var recordKey = key(collection, id), db = await openDb(), base, record;
    if (!text(collection) || !text(id)) return null;
    if (db) { record = await idbGet(STORES.records, recordKey); return record ? clone(record.data) : null; }
    base = fallbackBase(); record = base.records[recordKey]; return record ? clone(record.data) : null;
  }

  async function all(collection) {
    var col = text(collection), db = await openDb(), records, base;
    if (!col) return [];
    if (db) records = await idbAll(STORES.records);
    else { base = fallbackBase(); records = Object.keys(base.records).map(function (k) { return base.records[k]; }); }
    return (records || []).filter(function (r) { return r && r.collection === col; }).map(function (r) {
      var data = clone(r.data || {});
      if (!data.id) data.id = r.id;
      if (!data.updatedAtLocal) data.updatedAtLocal = r.updatedAtLocal || "";
      return data;
    });
  }

  async function remove(collection, id, options) {
    var col = text(collection), safeId = text(id), recordKey = key(col, safeId), opts = options || {};
    var db, base, previous;
    if (!col || !safeId) throw new Error("Currículo local: colección e id son obligatorios para eliminar.");
    db = await openDb();
    if (db && await idbDelete(STORES.records, recordKey)) { /* eliminado */ }
    else { base = fallbackBase(); delete base.records[recordKey]; saveFallback(base); }
    if (opts.markDirty === false) { dispatchStatus(); return true; }
    previous = await queueGet(recordKey);
    await queueSave({
      key: recordKey,
      collection: col,
      remoteCollection: text(opts.remoteCollection || col),
      id: safeId,
      operation: "delete",
      data: null,
      createdAtLocal: previous && previous.createdAtLocal ? previous.createdAtLocal : nowIso(),
      updatedAtLocal: nowIso(),
      attempts: Number(previous && previous.attempts ? previous.attempts : 0),
      lastError: "",
      status: "pending"
    });
    dispatchStatus();
    return true;
  }

  async function queueItems() {
    var db = await openDb(), list, base;
    if (db) list = await idbAll(STORES.queue);
    else { base = fallbackBase(); list = Object.keys(base.queue).map(function (k) { return base.queue[k]; }); }
    return (list || []).filter(Boolean);
  }
  async function pending() { return (await queueItems()).filter(function (x) { return x.status === "pending"; }); }
  async function markSynced(queueKey) {
    var item = await queueGet(text(queueKey));
    if (!item) return false;
    item.status = "synced"; item.syncedAtLocal = nowIso(); item.lastError = "";
    await queueSave(item); dispatchStatus(); return true;
  }
  async function markFailed(queueKey, message) {
    var item = await queueGet(text(queueKey));
    if (!item) return false;
    item.status = "pending"; item.attempts = Number(item.attempts || 0) + 1; item.lastError = text(message); item.lastAttemptAtLocal = nowIso();
    await queueSave(item); dispatchStatus(); return true;
  }
  async function clearSynced() {
    var db = await openDb(), list = await queueItems(), base, i;
    if (db) { for (i = 0; i < list.length; i += 1) if (list[i].status === "synced") await idbDelete(STORES.queue, list[i].key); }
    else { base = fallbackBase(); Object.keys(base.queue).forEach(function (k) { if (base.queue[k].status === "synced") delete base.queue[k]; }); saveFallback(base); }
    dispatchStatus(); return true;
  }

  async function getMeta(metaKey, fallback) {
    var k = text(metaKey), db = await openDb(), base, record;
    if (!k) return fallback;
    if (db) { record = await idbGet(STORES.meta, k); return record ? clone(record.value) : fallback; }
    base = fallbackBase(); return Object.prototype.hasOwnProperty.call(base.meta, k) ? clone(base.meta[k]) : fallback;
  }
  async function setMeta(metaKey, value) {
    var k = text(metaKey), db = await openDb(), base;
    if (!k) throw new Error("Currículo local: clave de metadato obligatoria.");
    if (db && await idbPut(STORES.meta, { key: k, value: clone(value) })) { /* guardado */ }
    else { base = fallbackBase(); base.meta[k] = clone(value); saveFallback(base); }
    dispatchStatus(); return clone(value);
  }
  async function count(collection) { return (await all(collection)).length; }
  async function status() {
    var db = await openDb(), p = await pending();
    return {
      pending: p.length,
      hasPending: p.length > 0,
      lastDailySyncDate: await getMeta("lastDailySyncDate", ""),
      lastDailySyncAt: await getMeta("lastDailySyncAt", ""),
      lastSyncAttemptAt: await getMeta("lastSyncAttemptAt", ""),
      today: todayKey(),
      storage: db ? "indexeddb" : "localstorage"
    };
  }
  function dispatchStatus() { window.setTimeout(function () { status().then(function (s) { emit("curriculo-local-status", s); }).catch(function () {}); }, 0); }

  window.CurriculoLocal = {
    ready: openDb,
    put: put,
    get: get,
    all: all,
    remove: remove,
    count: count,
    pending: pending,
    queueItems: queueItems,
    markSynced: markSynced,
    markFailed: markFailed,
    clearSynced: clearSynced,
    getMeta: getMeta,
    setMeta: setMeta,
    status: status,
    todayKey: todayKey,
    dispatchStatus: dispatchStatus
  };
  dispatchStatus();
})(window, document);
