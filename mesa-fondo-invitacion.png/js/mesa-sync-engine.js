/*
=========================================================
Nombre completo: mesa-sync-engine.js
Ruta o ubicación: /js/mesa-sync-engine.js
Función o funciones:
- Leer estudiantes desde Firebase una vez al día.
- Guardarlos en IndexedDB.
- Sincronizar invitaciones locales a Firebase desde las 16:30.
- Reintentar automáticamente si falla.
- Permitir una sola sincronización exitosa por día.
=========================================================
*/
"use strict";

(function attachMesaSyncEngine(global) {
  const META_LAST_STUDENTS_READ = "last_students_read_date";
  const META_LAST_SYNC_SUCCESS = "last_invitations_sync_success_date";
  const META_LAST_SYNC_ATTEMPT = "last_invitations_sync_attempt_at";

  const SYNC_HOUR = 16;
  const SYNC_MINUTE = 30;
  const RETRY_EVERY_MS = 10 * 60 * 1000;

  let retryTimer = null;
  let readRunning = false;
  let syncRunning = false;

  function getTodayStamp() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function isAfterSyncTime(now) {
    const date = now instanceof Date ? now : new Date();

    if (date.getHours() > SYNC_HOUR) {
      return true;
    }

    if (date.getHours() === SYNC_HOUR && date.getMinutes() >= SYNC_MINUTE) {
      return true;
    }

    return false;
  }

  async function shouldReadStudentsToday() {
    const lastRead = await global.MesaIndexedDb.getMeta(META_LAST_STUDENTS_READ);
    return lastRead !== getTodayStamp();
  }

  async function shouldSyncInvitationsToday() {
    const lastSuccess = await global.MesaIndexedDb.getMeta(META_LAST_SYNC_SUCCESS);
    return lastSuccess !== getTodayStamp();
  }

  async function bootstrapDailyStudentsRead() {
    if (readRunning) {
      return { performed: false, reason: "already_running" };
    }

    const mustRead = await shouldReadStudentsToday();
    if (!mustRead) {
      return { performed: false, reason: "already_read_today" };
    }

    readRunning = true;

    try {
      const students = await global.MesaFirebase.readAllStudents();
      await global.MesaIndexedDb.replaceStudentsCache(students);
      await global.MesaIndexedDb.setMeta(META_LAST_STUDENTS_READ, getTodayStamp());

      return {
        performed: true,
        count: Array.isArray(students) ? students.length : 0
      };
    } finally {
      readRunning = false;
    }
  }

  async function syncDirtyInvitationsNow() {
    if (syncRunning) {
      return { performed: false, reason: "already_running" };
    }

    const mustSync = await shouldSyncInvitationsToday();
    if (!mustSync) {
      return { performed: false, reason: "already_synced_today" };
    }

    if (!isAfterSyncTime(new Date())) {
      return { performed: false, reason: "before_sync_time" };
    }

    syncRunning = true;

    try {
      await global.MesaIndexedDb.setMeta(META_LAST_SYNC_ATTEMPT, new Date().toISOString());

      const dirty = await global.MesaIndexedDb.getDirtyInvitations();

      if (!dirty.length) {
        await global.MesaIndexedDb.setMeta(META_LAST_SYNC_SUCCESS, getTodayStamp());
        clearRetry();
        return {
          performed: true,
          uploaded: 0,
          reason: "nothing_to_sync"
        };
      }

      await global.MesaFirebase.upsertManyInvitations(dirty);

      for (const invitation of dirty) {
        await global.MesaIndexedDb.markInvitationAsSynced(invitation.id);
      }

      await global.MesaIndexedDb.setMeta(META_LAST_SYNC_SUCCESS, getTodayStamp());
      clearRetry();

      return {
        performed: true,
        uploaded: dirty.length
      };
    } finally {
      syncRunning = false;
    }
  }

  function clearRetry() {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  }

  function scheduleRetry() {
    clearRetry();

    retryTimer = setTimeout(async () => {
      try {
        const shouldStillSync = await shouldSyncInvitationsToday();

        if (!shouldStillSync) {
          clearRetry();
          return;
        }

        if (!isAfterSyncTime(new Date())) {
          scheduleRetry();
          return;
        }

        await syncDirtyInvitationsNow();
      } catch (error) {
        console.error("MesaSyncEngine: falló reintento automático.", error);
        scheduleRetry();
      }
    }, RETRY_EVERY_MS);
  }

  async function ensureDailyInvitationSync() {
    const mustSync = await shouldSyncInvitationsToday();

    if (!mustSync) {
      return {
        performed: false,
        reason: "already_synced_today"
      };
    }

    if (!isAfterSyncTime(new Date())) {
      return {
        performed: false,
        reason: "before_sync_time"
      };
    }

    try {
      const result = await syncDirtyInvitationsNow();
      return result;
    } catch (error) {
      console.error("MesaSyncEngine: falló sincronización diaria.", error);
      scheduleRetry();
      throw error;
    }
  }

  function startAutoSyncWatcher() {
    clearRetry();

    const now = new Date();

    if (isAfterSyncTime(now)) {
      ensureDailyInvitationSync().catch((error) => {
        console.error("MesaSyncEngine: watcher inmediato con error.", error);
      });
      return;
    }

    const target = new Date(now);
    target.setHours(SYNC_HOUR);
    target.setMinutes(SYNC_MINUTE);
    target.setSeconds(0);
    target.setMilliseconds(0);

    const waitMs = Math.max(target.getTime() - now.getTime(), 1000);

    retryTimer = setTimeout(async () => {
      try {
        await ensureDailyInvitationSync();
      } catch (error) {
        console.error("MesaSyncEngine: error al llegar la hora de sincronización.", error);
      }
    }, waitMs);
  }

  global.MesaSyncEngine = {
    getTodayStamp,
    isAfterSyncTime,
    shouldReadStudentsToday,
    shouldSyncInvitationsToday,
    bootstrapDailyStudentsRead,
    syncDirtyInvitationsNow,
    ensureDailyInvitationSync,
    startAutoSyncWatcher
  };
})(window);