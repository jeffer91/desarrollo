/*
Nombre completo: localsave.firebase-map.js
Ubicación: /desarrollo/localsave/localsave.firebase-map.js
Función o funciones:
- Traducir un cambio local al formato de operación que luego usará la sincronización con Firebase
- Resolver colección, docId y datos finales para upsert, delete o replaceScope
- Mantener una capa intermedia para no mezclar lógica local con lógica Firebase
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

  function cleanObject(value) {
    const raw = value && typeof value === "object" ? clone(value) : {};
    const out = {};
    const keys = Object.keys(raw);

    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const val = raw[key];
      if (typeof val === "undefined") continue;
      out[key] = val;
    }

    return out;
  }

  function resolveDocId(change) {
    if (!change || typeof change !== "object") return "";
    if (change.recordId) return String(change.recordId);

    const payload = change.payload && typeof change.payload === "object" ? change.payload : {};
    if (payload.id != null && String(payload.id).trim()) return String(payload.id);
    if (payload.cedula != null && String(payload.cedula).trim()) return String(payload.cedula);

    return "";
  }

  function toFirebaseOperation(change) {
    const Config = must("LocalSaveConfig");
    const raw = change && typeof change === "object" ? change : {};
    const scope = String(raw.scope || "").trim();
    const action = String(raw.action || "upsert").trim();
    const collection = Config.resolveCollection(scope);
    const docId = resolveDocId(raw);
    const payload = cleanObject(raw.payload || {});

    return {
      scope: scope,
      action: action,
      collection: collection,
      docId: docId,
      periodId: raw.periodId == null ? "" : String(raw.periodId),
      data: payload,
      raw: clone(raw)
    };
  }

  function mapQueue(queue) {
    const list = Array.isArray(queue) ? queue : [];
    const out = [];

    for (let i = 0; i < list.length; i += 1) {
      out.push(toFirebaseOperation(list[i]));
    }

    return out;
  }

  const api = {
    toFirebaseOperation,
    mapQueue
  };

  window.LocalSaveFirebaseMap = api;
})(window);