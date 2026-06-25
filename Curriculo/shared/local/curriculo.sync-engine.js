/* Curriculo sync engine: sube cambios locales pendientes a Firebase */
(function (window, document) {
  "use strict";

  var DEFAULT_CONFIG = {
    apiKey: "AIzaSyCaHf1C0BB0X_H3BDZ1o-UDAsPmLTjsZLA",
    authDomain: "utet-4387a.firebaseapp.com",
    projectId: "utet-4387a",
    storageBucket: "utet-4387a.firebasestorage.app",
    messagingSenderId: "902848131454",
    appId: "1:902848131454:web:47f515eb6480834724c32f"
  };
  var DEFAULT_INTERVAL_MS = 10 * 60 * 1000;
  var timerId = null;
  var running = false;

  function local() {
    if (!window.CurriculoLocal) throw new Error("CurriculoLocal no está cargado.");
    return window.CurriculoLocal;
  }
  function text(v) { return String(v == null ? "" : v).trim(); }
  function cleanCollection(v) { return text(v).replace(/^\/+|\/+$/g, ""); }
  function emit(detail) {
    var ev;
    try { ev = new CustomEvent("curriculo-sync-status", { detail: detail || {} }); }
    catch (e) { ev = document.createEvent("CustomEvent"); ev.initCustomEvent("curriculo-sync-status", false, false, detail || {}); }
    window.dispatchEvent(ev);
  }
  function firebaseConfig() {
    return window.__CURRICULO_FIREBASE_CONFIG__ && typeof window.__CURRICULO_FIREBASE_CONFIG__ === "object"
      ? window.__CURRICULO_FIREBASE_CONFIG__
      : DEFAULT_CONFIG;
  }
  function initFirebase() {
    var firebase = window.firebase;
    if (!firebase || !firebase.initializeApp || !firebase.firestore) {
      throw new Error("Firebase compat no está cargado.");
    }
    if (firebase.apps && firebase.apps.length) return firebase.app();
    return firebase.initializeApp(firebaseConfig());
  }
  function getDb() {
    var firebase = window.firebase;
    var app = initFirebase();
    return firebase.firestore(app);
  }
  function serverTimestamp() {
    if (window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue && window.firebase.firestore.FieldValue.serverTimestamp) {
      return window.firebase.firestore.FieldValue.serverTimestamp();
    }
    return new Date();
  }
  function shouldRun(status, force) {
    if (force) return true;
    if (!status || !status.hasPending) return false;
    return String(status.lastDailySyncDate || "") !== String(status.today || "");
  }
  function remotePayload(item) {
    var source = item && item.data && typeof item.data === "object" ? item.data : {};
    var payload = Object.assign({}, source);
    payload.id = text(item.id || payload.id);
    payload.curriculoLocal = {
      collection: cleanCollection(item.collection),
      queueKey: text(item.key),
      operation: text(item.operation || "set"),
      updatedAtLocal: text(item.updatedAtLocal),
      syncedAtClient: new Date().toISOString()
    };
    payload.updatedAt = serverTimestamp();
    if (!payload.createdAt && !payload.createdAtLocal) {
      payload.createdAtLocal = text(item.createdAtLocal || item.updatedAtLocal || new Date().toISOString());
    }
    return payload;
  }
  async function uploadOne(db, item) {
    var collection = cleanCollection(item.remoteCollection || item.collection);
    var id = text(item.id);
    if (!collection || !id) throw new Error("Elemento pendiente inválido: falta colección o id.");
    if (item.operation === "delete") return await db.collection(collection).doc(id).delete();
    return await db.collection(collection).doc(id).set(remotePayload(item), { merge: true });
  }

  async function syncNow(options) {
    var opts = options || {}, force = opts.force === true;
    var status, pending, db, uploaded = 0, failed = 0, i;
    if (running) return { ok: false, skipped: true, reason: "Ya hay una sincronización en curso." };
    try {
      status = await local().status();
      if (!status.hasPending) {
        emit({ ok: true, skipped: true, reason: "No hay cambios pendientes.", pending: 0, uploaded: 0 });
        return { ok: true, skipped: true, reason: "No hay cambios pendientes.", pending: 0, uploaded: 0 };
      }
      if (!shouldRun(status, force)) {
        emit({ ok: true, skipped: true, reason: "La subida diaria ya se ejecutó hoy.", pending: status.pending, uploaded: 0 });
        return { ok: true, skipped: true, reason: "La subida diaria ya se ejecutó hoy.", pending: status.pending, uploaded: 0 };
      }
      running = true;
      await local().setMeta("lastSyncAttemptAt", new Date().toISOString());
      emit({ ok: true, running: true, message: "Subiendo cambios pendientes a Firebase...", pending: status.pending });
      pending = await local().pending();
      db = getDb();
      for (i = 0; i < pending.length; i += 1) {
        try {
          await uploadOne(db, pending[i]);
          await local().markSynced(pending[i].key);
          uploaded += 1;
        } catch (e) {
          failed += 1;
          if (typeof local().markFailed === "function") await local().markFailed(pending[i].key, e.message || "No se pudo subir.");
          console.error("[curriculo-sync] No se pudo subir:", pending[i], e);
        }
      }
      if (uploaded > 0 && failed === 0) {
        await local().setMeta("lastDailySyncDate", local().todayKey());
        await local().setMeta("lastDailySyncAt", new Date().toISOString());
        if (typeof local().clearSynced === "function") await local().clearSynced();
      }
      status = await local().status();
      emit({ ok: failed === 0, running: false, uploaded: uploaded, failed: failed, pending: status.pending, message: failed === 0 ? "Cambios subidos correctamente a Firebase." : "Algunos cambios no pudieron subirse." });
      return { ok: failed === 0, uploaded: uploaded, failed: failed, pending: status.pending };
    } catch (e) {
      emit({ ok: false, running: false, error: e.message || "No se pudo sincronizar.", uploaded: uploaded, failed: failed });
      console.error("[curriculo-sync] Error general:", e);
      return { ok: false, uploaded: uploaded, failed: failed, error: e.message || "No se pudo sincronizar." };
    } finally {
      running = false;
    }
  }
  function stopDailySync() {
    if (timerId) window.clearInterval(timerId);
    timerId = null;
  }
  function startDailySync(options) {
    var opts = options || {};
    var interval = Math.max(60000, Number(opts.intervalMs || DEFAULT_INTERVAL_MS));
    var delay = Math.max(0, Number(opts.initialDelayMs || 2500));
    stopDailySync();
    window.setTimeout(function () { syncNow({ force: false }); }, delay);
    timerId = window.setInterval(function () { syncNow({ force: false }); }, interval);
    return timerId;
  }

  window.CurriculoSync = {
    syncNow: syncNow,
    startDailySync: startDailySync,
    stopDailySync: stopDailySync,
    getDb: getDb,
    isRunning: function () { return running; }
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { startDailySync(); });
  else startDailySync();
})(window, document);
