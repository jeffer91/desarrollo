/* =========================================================
Nombre completo: localsave/localsave.config.js
Función:
- Configuración central de LocalSave
- Define nombres de archivos, horarios de pull/sync y mapeo de colecciones
- Expone helpers de lectura y actualización segura
========================================================= */
(function attachLocalSaveConfig(window) {
  "use strict";

  var STORAGE_KEY = "__localsave_config__";

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function deepMerge(target, source) {
    var base = isObject(target) ? clone(target) : {};
    var patch = isObject(source) ? source : {};
    Object.keys(patch).forEach(function (key) {
      var nextValue = patch[key];
      if (isObject(nextValue) && isObject(base[key])) {
        base[key] = deepMerge(base[key], nextValue);
        return;
      }
      base[key] = clone(nextValue);
    });
    return base;
  }

  var DEFAULTS = {
    moduleVersion: "1.0.0",
    rootFolderName: "localsave",
    moduleFolderName: "localsave",
    dataFolderName: "data",

    files: {
      queue: "pending-queue.json",
      snapshot: "snapshot.json",
      syncLog: "sync-log.json"
    },

    queue: {
      enabled: true
    },

    snapshot: {
      enabled: true
    },

    workday: {
      mode: "local-first",

      morningPull: {
        enabled: true,
        manualOnly: true,
        startHour24: 8,
        startMinute: 0,
        endHour24: 9,
        endMinute: 0,
        oncePerDay: true,
        allowForce: true,
        stateStorageKey: "__localsave_pull_state__"
      },

      eveningPush: {
        enabled: true,
        startHour24: 17,
        startMinute: 0,
        endHour24: 18,
        endMinute: 0,
        oncePerDay: true,
        stateStorageKey: "__localsave_push_state__"
      }
    },

    sync: {
      enabled: true,
      hour24: 17,
      minute: 0,
      windowEndHour24: 18,
      windowEndMinute: 0,
      retryOnOpen: true,
      clearQueueAfterSuccess: true,
      runOnlyInsideWindow: false,
      schedulerIntervalMs: 60000
    },

    firebase: {
      enabled: true,
      dryRun: false,
      adapterKey: "__DESARROLLO_FIREBASE_ADAPTER__",
      pullAdapterKey: "__DESARROLLO_FIREBASE_PULL_ADAPTER__",
      config: {
        apiKey: "AIzaSyCaHf1C0BB0X_H3BDZ1o-UDAsPmLTjsZLA",
        authDomain: "utet-4387a.firebaseapp.com",
        projectId: "utet-4387a",
        storageBucket: "utet-4387a.firebasestorage.app",
        messagingSenderId: "902848131454",
        appId: "1:902848131454:web:47f515eb6480834724c32f"
      }
    },

    collections: {
      estudiantes: "Estudiantes",
      periodos: "periodos",
      historial: "historial_periodos",
      estados: "Estados",
      incorporacionesPlanes: "IncorporacionesPlanes"
    }
  };

  function loadStored() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return clone(DEFAULTS);
      }
      var parsed = JSON.parse(raw);
      return deepMerge(DEFAULTS, parsed);
    } catch (error) {
      return clone(DEFAULTS);
    }
  }

  var current = loadStored();

  function persist() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
      return true;
    } catch (error) {
      return false;
    }
  }

  function get() {
    return clone(current);
  }

  function set(patch) {
    current = deepMerge(current, patch);
    persist();
    return get();
  }

  function reset() {
    current = clone(DEFAULTS);
    persist();
    return get();
  }

  function getModuleRelativeParts() {
    var cfg = get();
    return [cfg.moduleFolderName];
  }

  function getDataRelativeParts() {
    var cfg = get();
    return [cfg.moduleFolderName, cfg.dataFolderName];
  }

  function getFileNames() {
    var cfg = get();
    return clone(cfg.files);
  }

  function getSyncTime() {
    var cfg = get();
    return {
      hour24: Number(cfg.sync.hour24 || 17),
      minute: Number(cfg.sync.minute || 0)
    };
  }

  function getSyncWindow() {
    var cfg = get();
    return {
      startHour24: Number(cfg.sync.hour24 || 17),
      startMinute: Number(cfg.sync.minute || 0),
      endHour24: Number(cfg.sync.windowEndHour24 || 18),
      endMinute: Number(cfg.sync.windowEndMinute || 0)
    };
  }

  function getMorningPullWindow() {
    var cfg = get();
    var item = cfg.workday && cfg.workday.morningPull ? cfg.workday.morningPull : {};
    return {
      startHour24: Number(item.startHour24 || 8),
      startMinute: Number(item.startMinute || 0),
      endHour24: Number(item.endHour24 || 9),
      endMinute: Number(item.endMinute || 0)
    };
  }

  function resolveCollection(scope) {
    var cfg = get();
    var normalized = String(scope == null ? "" : scope).trim();
    if (!normalized) {
      return "";
    }
    if (cfg.collections[normalized]) {
      return cfg.collections[normalized];
    }
    return normalized;
  }

  window.LocalSaveConfig = {
    STORAGE_KEY: STORAGE_KEY,
    DEFAULTS: clone(DEFAULTS),
    get: get,
    set: set,
    reset: reset,
    getModuleRelativeParts: getModuleRelativeParts,
    getDataRelativeParts: getDataRelativeParts,
    getFileNames: getFileNames,
    getSyncTime: getSyncTime,
    getSyncWindow: getSyncWindow,
    getMorningPullWindow: getMorningPullWindow,
    resolveCollection: resolveCollection
  };
})(window);