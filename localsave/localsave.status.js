/*
Nombre completo: localsave.status.js
Ubicación: /desarrollo/localsave/localsave.status.js
Función o funciones:
- Consultar el estado general del módulo localsave
- Verificar soporte de filesystem, pendientes y últimas sincronizaciones
- Entregar un resumen listo para mostrar en UI o consola
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

  function getSyncLog() {
    const FS = must("LocalSaveFS");
    const cfg = must("LocalSaveConfig").get();
    const data = FS.readDataFile(cfg.files.syncLog, []);
    return Array.isArray(data) ? data : [];
  }

  function getLastSync() {
    const log = getSyncLog();
    if (!log.length) return null;
    return clone(log[log.length - 1]);
  }

  function getStatus() {
    const FS = must("LocalSaveFS");
    const Queue = must("LocalSaveQueue");
    const Snapshot = must("LocalSaveSnapshot");

    const ready = FS.ensureReady();
    const supported = FS.isSupported();
    const snapshot = Snapshot.read();
    const lastSync = getLastSync();
    const pendingCount = Queue.count();

    return {
      supported: supported,
      ready: !!ready.ok,
      paths: ready.ok ? ready.paths : null,
      pendingCount: pendingCount,
      lastSync: lastSync,
      snapshotUpdatedAt:
        snapshot &&
        snapshot.meta &&
        snapshot.meta.updatedAt
          ? String(snapshot.meta.updatedAt)
          : null
    };
  }

  const api = {
    getSyncLog,
    getLastSync,
    getStatus
  };

  window.LocalSaveStatus = api;
})(window);