/*
Nombre del archivo: pea.store.js
Ubicación: /Curriculo/pea_documentos/pea.store.js
Función:
- Guardar versiones PEA primero en local
- Mantener compatibilidad con localStorage
- Reflejar buckets en CurriculoLocal cuando exista
- Subir pendientes a Firebase/Storage bajo demanda o una vez al día
- Leer carreras y materias usando local primero y Firebase como respaldo
*/
(function (window) {
  "use strict";

  window.PEA = window.PEA || {};
  var PEA = window.PEA;

  var ROOT_COLLECTION = "pea_documentos";
  var LOCAL_KEY = "pea_local_cache_v2";
  var META_KEY = "pea_sync_meta_v2";

  function parse(value, fallback) { try { return JSON.parse(value); } catch (error) { return fallback; } }
  function clone(value) { try { return JSON.parse(JSON.stringify(value == null ? null : value)); } catch (error) { return value; } }
  function clean(value) { return PEA.parser && PEA.parser.cleanText ? PEA.parser.cleanText(value) : String(value || "").replace(/\s+/g, " ").trim(); }
  function slug(value) { return PEA.parser && PEA.parser.slugify ? PEA.parser.slugify(value) : clean(value).toLowerCase().replace(/\s+/g, "_"); }
  function todayKey() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

  function localDb() { return PEA.firebase && typeof PEA.firebase.getLocalDb === "function" ? PEA.firebase.getLocalDb() : null; }
  function db() { return PEA.firebase && typeof PEA.firebase.getDb === "function" ? PEA.firebase.getDb() : null; }
  function storage() { return PEA.firebase && typeof PEA.firebase.getStorage === "function" ? PEA.firebase.getStorage() : null; }
  function serverTimestamp() { return PEA.firebase && PEA.firebase.getServerTimestamp ? PEA.firebase.getServerTimestamp() : new Date(); }

  function getCache() {
    var cache = parse(localStorage.getItem(LOCAL_KEY), null);
    if (!cache || typeof cache !== "object") cache = { materias: {} };
    if (!cache.materias || typeof cache.materias !== "object") cache.materias = {};
    return cache;
  }

  function saveCache(cache) { localStorage.setItem(LOCAL_KEY, JSON.stringify(cache || { materias: {} })); }

  function getMeta() {
    var meta = parse(localStorage.getItem(META_KEY), null);
    if (!meta || typeof meta !== "object") meta = { lastPushDate: "", lastPullDate: "", lastDailySyncAt: "" };
    meta.lastPushDate = String(meta.lastPushDate || "");
    meta.lastPullDate = String(meta.lastPullDate || "");
    meta.lastDailySyncAt = String(meta.lastDailySyncAt || "");
    return meta;
  }

  function saveMeta(meta) {
    localStorage.setItem(META_KEY, JSON.stringify({
      lastPushDate: String(meta && meta.lastPushDate || ""),
      lastPullDate: String(meta && meta.lastPullDate || ""),
      lastDailySyncAt: String(meta && meta.lastDailySyncAt || "")
    }));
  }

  function ensureBucket(cache, materiaId, info) {
    var id = clean(materiaId);
    if (!id) throw new Error("El id de materia es obligatorio.");
    if (!cache.materias[id]) cache.materias[id] = { materiaId: id, materiaNombre: "", materiaCodigo: "", carreraId: "", carreraNombre: "", versions: [] };
    if (!Array.isArray(cache.materias[id].versions)) cache.materias[id].versions = [];
    if (info && typeof info === "object") {
      cache.materias[id].materiaId = id;
      cache.materias[id].materiaNombre = String(info.materiaNombre || cache.materias[id].materiaNombre || "");
      cache.materias[id].materiaCodigo = String(info.materiaCodigo || cache.materias[id].materiaCodigo || "");
      cache.materias[id].carreraId = String(info.carreraId || cache.materias[id].carreraId || "");
      cache.materias[id].carreraNombre = String(info.carreraNombre || cache.materias[id].carreraNombre || "");
    }
    return cache.materias[id];
  }

  function nextVersionNumber(bucket) {
    return (bucket.versions || []).reduce(function (max, item) { return Math.max(max, Number(item && item.meta && item.meta.versionNumber || 0)); }, 0) + 1;
  }

  function listFromBucket(bucket) {
    if (!bucket || !Array.isArray(bucket.versions)) return [];
    return bucket.versions.map(function (item) { return clone(item.meta); }).sort(function (a, b) { return Number(b.versionNumber || 0) - Number(a.versionNumber || 0); });
  }

  async function mirrorBucket(materiaId, bucket, markDirty) {
    var local = localDb();
    if (!local || typeof local.put !== "function") return false;
    await local.put(ROOT_COLLECTION, materiaId, clone(bucket), { remoteCollection: ROOT_COLLECTION, markDirty: markDirty !== false });
    if (PEA.firebase && PEA.firebase.refreshLocalStatus) PEA.firebase.refreshLocalStatus();
    return true;
  }

  async function loadBucketFromCurriculoLocal(materiaId) {
    var local = localDb();
    if (!local || typeof local.get !== "function") return null;
    return await local.get(ROOT_COLLECTION, materiaId);
  }

  async function uploadJson(materiaId, versionId, payload) {
    var st = storage();
    var path = [ROOT_COLLECTION, materiaId, "versiones", versionId + ".json"].join("/");
    if (!st) return { path: path, downloadURL: "" };
    var ref = st.ref(path);
    await ref.putString(JSON.stringify(payload, null, 2), "raw", { contentType: "application/json" });
    return { path: path, downloadURL: await ref.getDownloadURL() };
  }

  async function nextRemoteNumber(materiaId) {
    var database = db();
    if (!database) return 1;
    var snap = await database.collection(ROOT_COLLECTION).doc(materiaId).collection("versiones").orderBy("versionNumber", "desc").limit(1).get();
    return snap.empty ? 1 : Number((snap.docs[0].data() || {}).versionNumber || 0) + 1;
  }

  async function pushOne(materiaId, localVersion) {
    var database = db();
    if (!database) throw new Error("Firebase no está disponible para subir PEA.");
    var remoteNumber = await nextRemoteNumber(materiaId);
    var remoteVersionId = "v" + remoteNumber;
    var payload = clone(localVersion.payload || {});
    var meta = localVersion.meta || {};
    var upload = await uploadJson(materiaId, remoteVersionId, payload);

    await database.collection(ROOT_COLLECTION).doc(materiaId).set({
      materiaId: String(meta.materiaId || materiaId),
      materiaNombre: String(meta.materiaNombre || ""),
      materiaCodigo: String(meta.materiaCodigo || ""),
      carreraId: String(meta.carreraId || ""),
      carreraNombre: String(meta.carreraNombre || ""),
      updatedAt: serverTimestamp(),
      updatedAtClient: new Date().toISOString()
    }, { merge: true });

    await database.collection(ROOT_COLLECTION).doc(materiaId).collection("versiones").doc(remoteVersionId).set({
      versionId: remoteVersionId,
      versionNumber: remoteNumber,
      materiaId: String(meta.materiaId || materiaId),
      materiaNombre: String(meta.materiaNombre || ""),
      materiaCodigo: String(meta.materiaCodigo || ""),
      carreraId: String(meta.carreraId || ""),
      carreraNombre: String(meta.carreraNombre || ""),
      versionNota: String(meta.versionNota || ""),
      origenTipo: String(meta.origenTipo || ""),
      createdAt: serverTimestamp(),
      createdAtClient: String(meta.createdAtClient || new Date().toISOString()),
      resumen: clone(meta.resumen || {}),
      jsonPath: upload.path,
      jsonUrl: upload.downloadURL
    });

    meta.synced = true;
    meta.syncedAtClient = new Date().toISOString();
    meta.remoteVersionId = remoteVersionId;
    localVersion.meta = meta;
    return { ok: true, remoteVersionId: remoteVersionId };
  }

  function importRemote(remoteMeta, remotePayload, currentLength) {
    return {
      meta: {
        versionId: "local_import_" + String(remoteMeta.versionId || ""),
        versionNumber: Number(currentLength || 0) + 1,
        materiaId: String(remoteMeta.materiaId || remotePayload.materiaId || ""),
        materiaNombre: String(remoteMeta.materiaNombre || remotePayload.materiaNombre || ""),
        materiaCodigo: String(remoteMeta.materiaCodigo || remotePayload.materiaCodigo || ""),
        carreraId: String(remoteMeta.carreraId || remotePayload.carreraId || ""),
        carreraNombre: String(remoteMeta.carreraNombre || remotePayload.carreraNombre || ""),
        versionNota: String(remoteMeta.versionNota || ""),
        origenTipo: String(remoteMeta.origenTipo || remotePayload.origenTipo || ""),
        createdAtClient: String(remoteMeta.createdAtClient || ""),
        resumen: clone(remoteMeta.resumen || remotePayload.resumen || {}),
        synced: true,
        syncedAtClient: new Date().toISOString(),
        remoteVersionId: String(remoteMeta.versionId || "")
      },
      payload: clone(remotePayload)
    };
  }

  function arraysFromCarrera(data) {
    return []
      .concat(Array.isArray(data.materiasNivel1) ? data.materiasNivel1 : [])
      .concat(Array.isArray(data.materiasNivel2) ? data.materiasNivel2 : [])
      .concat(Array.isArray(data.materiasNivel3) ? data.materiasNivel3 : [])
      .concat(Array.isArray(data.materiasNivel4) ? data.materiasNivel4 : [])
      .concat(Array.isArray(data.materiasTransversal1) ? data.materiasTransversal1 : [])
      .concat(Array.isArray(data.materiasTransversal2) ? data.materiasTransversal2 : [])
      .concat(Array.isArray(data.materiasTransversal3) ? data.materiasTransversal3 : [])
      .concat(Array.isArray(data.materiasTransversal4) ? data.materiasTransversal4 : []);
  }

  function uniqueSorted(list) {
    var seen = Object.create(null), out = [];
    (Array.isArray(list) ? list : []).forEach(function (item) { var text = clean(item); var key = text.toLowerCase(); if (text && !seen[key]) { seen[key] = true; out.push(text); } });
    return out.sort(function (a, b) { return a.localeCompare(b, "es", { sensitivity: "base", numeric: true }); });
  }

  PEA.store = {
    saveVersionLocal: function (parsedData) {
      var data = parsedData || {};
      var materiaId = clean(data.materiaId);
      var cache = getCache();
      var bucket = ensureBucket(cache, materiaId, data);
      var number = nextVersionNumber(bucket);
      var versionId = "local_v" + number;
      var localVersion = { meta: { versionId: versionId, versionNumber: number, materiaId: materiaId, materiaNombre: String(data.materiaNombre || ""), materiaCodigo: String(data.materiaCodigo || ""), carreraId: String(data.carreraId || ""), carreraNombre: String(data.carreraNombre || ""), versionNota: String(data.versionNota || ""), origenTipo: String(data.origenTipo || ""), createdAtClient: String(data.createdAtClient || new Date().toISOString()), resumen: clone(data.resumen || {}), synced: false, syncedAtClient: "", remoteVersionId: "" }, payload: clone(data) };
      bucket.versions.push(localVersion);
      saveCache(cache);
      mirrorBucket(materiaId, bucket, true);
      return { ok: true, materiaId: materiaId, versionId: versionId, versionNumber: number };
    },

    listVersionsLocal: function (materiaId) {
      var cache = getCache();
      return listFromBucket(cache.materias[clean(materiaId)]);
    },

    readVersionLocal: function (materiaId, versionId) {
      var cache = getCache();
      var bucket = cache.materias[clean(materiaId)];
      var found;
      if (!bucket || !Array.isArray(bucket.versions)) throw new Error("No existe información local para esa materia.");
      found = bucket.versions.find(function (item) { return String(item && item.meta && item.meta.versionId || "") === String(versionId || ""); });
      if (!found) throw new Error("No existe la versión local solicitada.");
      return { meta: clone(found.meta), data: clone(found.payload) };
    },

    getLocalCacheSnapshot: function () { return clone(getCache()); },

    countPendingLocal: function () {
      var cache = getCache(), total = 0;
      Object.keys(cache.materias || {}).forEach(function (id) { (cache.materias[id].versions || []).forEach(function (v) { if (v && v.meta && v.meta.synced !== true) total += 1; }); });
      return total;
    },

    pushPendingToFirebaseIfDue: async function (force) {
      var meta = getMeta();
      var cache = getCache();
      var today = todayKey();
      var ids = Object.keys(cache.materias || {});
      var pushed = 0;
      if (!force && meta.lastPushDate === today) return { ok: true, pushed: 0, skipped: true, reason: "La subida del día ya se ejecutó." };
      for (var i = 0; i < ids.length; i += 1) {
        var id = ids[i], bucket = cache.materias[id];
        for (var j = 0; j < (bucket.versions || []).length; j += 1) {
          if (bucket.versions[j].meta && bucket.versions[j].meta.synced !== true) { await pushOne(id, bucket.versions[j]); pushed += 1; }
        }
        await mirrorBucket(id, bucket, false);
      }
      saveCache(cache);
      meta.lastPushDate = today; meta.lastDailySyncAt = new Date().toISOString(); saveMeta(meta);
      if (PEA.firebase && PEA.firebase.refreshLocalStatus) PEA.firebase.refreshLocalStatus();
      return { ok: true, pushed: pushed, skipped: false };
    },

    pullFromFirebaseIfDue: async function (force) {
      var meta = getMeta();
      var today = todayKey();
      var database = db();
      var cache = getCache();
      var pulled = 0;
      if (!database) return { ok: true, pulled: 0, skipped: true, reason: "Firebase no disponible." };
      if (!force && meta.lastPullDate === today) return { ok: true, pulled: 0, skipped: true, reason: "La descarga del día ya se ejecutó." };
      var materiasSnap = await database.collection(ROOT_COLLECTION).get();
      for (var i = 0; i < materiasSnap.docs.length; i += 1) {
        var materiaDoc = materiasSnap.docs[i], materiaData = materiaDoc.data() || {}, materiaId = String(materiaDoc.id || "");
        var bucket = ensureBucket(cache, materiaId, materiaData);
        var versionesSnap = await database.collection(ROOT_COLLECTION).doc(materiaId).collection("versiones").orderBy("versionNumber", "asc").get();
        for (var j = 0; j < versionesSnap.docs.length; j += 1) {
          var remoteMeta = versionesSnap.docs[j].data() || {}, remoteId = String(remoteMeta.versionId || "");
          var exists = bucket.versions.some(function (item) { return String(item && item.meta && item.meta.remoteVersionId || "") === remoteId; });
          if (exists || !remoteMeta.jsonUrl) continue;
          var res = await fetch(String(remoteMeta.jsonUrl));
          if (!res.ok) continue;
          bucket.versions.push(importRemote(remoteMeta, await res.json(), bucket.versions.length));
          pulled += 1;
        }
        await mirrorBucket(materiaId, bucket, false);
      }
      saveCache(cache);
      meta.lastPullDate = today; saveMeta(meta);
      return { ok: true, pulled: pulled, skipped: false };
    },

    listCarrerasForSelect: async function () {
      var local = localDb();
      var items = [];
      var database;
      if (local && typeof local.all === "function") items = await local.all("carreras");
      if (!items.length && (database = db())) {
        var snap = await database.collection("carreras").orderBy("nombre").get();
        snap.forEach(function (doc) { var data = doc.data() || {}; data.id = data.id || doc.id; items.push(data); });
      }
      return uniqueSorted(items.map(function (item) { return { id: String(item.id || ""), nombre: String(item.nombre || item.id || ""), tipo: String(item.tipo || ""), estado: String(item.estado || "") }; })).filter(function (item) { return item.id; });
    },

    readCarreraLocalFirst: async function (carreraId) {
      var id = clean(carreraId), local = localDb(), database, snap, data;
      if (!id) return null;
      if (local && typeof local.get === "function") {
        data = await local.get("carreras", id);
        if (data) { data.id = data.id || id; return data; }
      }
      database = db();
      if (!database) return null;
      snap = await database.collection("carreras").doc(id).get();
      if (!snap.exists) return null;
      data = snap.data() || {}; data.id = data.id || snap.id;
      if (local && typeof local.put === "function") await local.put("carreras", id, data, { remoteCollection: "carreras", markDirty: false });
      return data;
    },

    createMateriaId: function (carreraId, materiaNombre) { return String(carreraId || "") + "__" + slug(materiaNombre); }
  };
})(window);
