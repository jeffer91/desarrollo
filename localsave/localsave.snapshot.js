/*
Nombre completo: localsave.snapshot.js
Ubicación: /desarrollo/localsave/localsave.snapshot.js
Función o funciones:
- Mantener el estado local consolidado en snapshot.json
- Crear y actualizar scopes internos por tipo de dato
- Insertar, reemplazar, eliminar y consultar registros del snapshot
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

  function readSnapshot() {
    const FS = must("LocalSaveFS");
    const cfg = must("LocalSaveConfig").get();

    const base = FS.readDataFile(cfg.files.snapshot, {
      meta: {
        createdAt: nowIso(),
        updatedAt: nowIso(),
        version: cfg.moduleVersion
      },
      scopes: {}
    });

    if (!base || typeof base !== "object") {
      return {
        meta: {
          createdAt: nowIso(),
          updatedAt: nowIso(),
          version: cfg.moduleVersion
        },
        scopes: {}
      };
    }

    if (!base.meta || typeof base.meta !== "object") {
      base.meta = {
        createdAt: nowIso(),
        updatedAt: nowIso(),
        version: cfg.moduleVersion
      };
    }

    if (!base.scopes || typeof base.scopes !== "object") {
      base.scopes = {};
    }

    return base;
  }

  function writeSnapshot(snapshot) {
    const FS = must("LocalSaveFS");
    const cfg = must("LocalSaveConfig").get();

    const next = snapshot && typeof snapshot === "object" ? snapshot : {};
    if (!next.meta || typeof next.meta !== "object") next.meta = {};
    if (!next.scopes || typeof next.scopes !== "object") next.scopes = {};

    if (!next.meta.createdAt) next.meta.createdAt = nowIso();
    next.meta.updatedAt = nowIso();
    next.meta.version = cfg.moduleVersion;

    return FS.writeDataFile(cfg.files.snapshot, next);
  }

  function ensureScope(snapshot, scope) {
    const key = String(scope || "").trim();
    if (!key) throw new Error("scope requerido.");

    if (!snapshot.scopes[key] || typeof snapshot.scopes[key] !== "object") {
      snapshot.scopes[key] = {
        updatedAt: nowIso(),
        items: {}
      };
    }

    if (!snapshot.scopes[key].items || typeof snapshot.scopes[key].items !== "object") {
      snapshot.scopes[key].items = {};
    }

    return snapshot.scopes[key];
  }

  function upsert(scope, record, idField) {
    const snapshot = readSnapshot();
    const key = String(scope || "").trim();
    const idKey = String(idField || "id").trim();
    const row = record && typeof record === "object" ? clone(record) : {};

    if (!row[idKey]) throw new Error("El registro no tiene id válido.");

    const bucket = ensureScope(snapshot, key);
    bucket.items[String(row[idKey])] = row;
    bucket.updatedAt = nowIso();

    const saved = writeSnapshot(snapshot);
    if (!saved.ok) return saved;

    return {
      ok: true,
      scope: key,
      recordId: String(row[idKey]),
      snapshot: snapshot
    };
  }

  function remove(scope, recordId) {
    const snapshot = readSnapshot();
    const key = String(scope || "").trim();
    const id = String(recordId || "").trim();
    const bucket = ensureScope(snapshot, key);

    if (bucket.items[id]) {
      delete bucket.items[id];
      bucket.updatedAt = nowIso();
    }

    const saved = writeSnapshot(snapshot);
    if (!saved.ok) return saved;

    return {
      ok: true,
      scope: key,
      recordId: id
    };
  }

  function replaceScope(scope, records, idField) {
    const snapshot = readSnapshot();
    const key = String(scope || "").trim();
    const idKey = String(idField || "id").trim();
    const list = Array.isArray(records) ? records : [];
    const bucket = ensureScope(snapshot, key);

    bucket.items = {};

    for (let i = 0; i < list.length; i += 1) {
      const row = list[i] && typeof list[i] === "object" ? clone(list[i]) : null;
      if (!row || !row[idKey]) continue;
      bucket.items[String(row[idKey])] = row;
    }

    bucket.updatedAt = nowIso();

    const saved = writeSnapshot(snapshot);
    if (!saved.ok) return saved;

    return {
      ok: true,
      scope: key,
      total: Object.keys(bucket.items).length
    };
  }

  function readScope(scope) {
    const snapshot = readSnapshot();
    const key = String(scope || "").trim();
    const bucket = snapshot.scopes[key];

    if (!bucket || !bucket.items || typeof bucket.items !== "object") return [];
    return Object.keys(bucket.items).map(function (id) {
      return clone(bucket.items[id]);
    });
  }

  function getRecord(scope, recordId) {
    const snapshot = readSnapshot();
    const key = String(scope || "").trim();
    const id = String(recordId || "").trim();
    const bucket = snapshot.scopes[key];

    if (!bucket || !bucket.items || !bucket.items[id]) return null;
    return clone(bucket.items[id]);
  }

  const api = {
    read: readSnapshot,
    write: writeSnapshot,
    upsert,
    remove,
    replaceScope,
    readScope,
    getRecord
  };

  window.LocalSaveSnapshot = api;
})(window);