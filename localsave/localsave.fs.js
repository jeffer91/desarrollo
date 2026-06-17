/*
Nombre completo: localsave.fs.js
Ubicación: /desarrollo/localsave/localsave.fs.js
Función o funciones:
- Gestionar el acceso al sistema de archivos local
- Crear automáticamente la carpeta localsave y la carpeta data
- Crear y leer los archivos JSON base del módulo
- Escribir JSON de forma segura
*/

(function (window) {
  "use strict";

  function getRequireFn() {
    if (typeof window.require === "function") return window.require;
    if (typeof require === "function") return require;
    return null;
  }

  function getNodeModules() {
    const req = getRequireFn();
    if (!req) return null;

    try {
      return {
        fs: req("fs"),
        path: req("path"),
        os: req("os")
      };
    } catch (err) {
      return null;
    }
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function safeNowIso() {
    return new Date().toISOString();
  }

  function getDefaultsForFile(fileName) {
    const cfg = window.LocalSaveConfig.get();
    if (fileName === cfg.files.queue) return [];
    if (fileName === cfg.files.snapshot) {
      return {
        meta: {
          createdAt: safeNowIso(),
          updatedAt: safeNowIso(),
          version: cfg.moduleVersion
        },
        scopes: {}
      };
    }
    if (fileName === cfg.files.syncLog) return [];
    return {};
  }

  function ensureDir(mods, dirPath) {
    if (!mods.fs.existsSync(dirPath)) {
      mods.fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  function getBaseRoot(mods) {
    if (window.LocalSaveBridge && typeof window.LocalSaveBridge.getBaseDir === "function") {
      const fromBridge = window.LocalSaveBridge.getBaseDir();
      if (fromBridge) return String(fromBridge);
    }

    if (typeof process !== "undefined" && process && typeof process.cwd === "function") {
      return process.cwd();
    }

    if (mods && mods.os && typeof mods.os.homedir === "function") {
      return mods.os.homedir();
    }

    return "";
  }

  function getPaths() {
    const mods = getNodeModules();
    if (!mods) {
      return {
        supported: false,
        reason: "filesystem_no_disponible"
      };
    }

const cfg = window.LocalSaveConfig.get();
const baseRoot = getBaseRoot(mods);
const rootFolder = String(cfg.rootFolderName || "").trim();
const moduleFolder = String(cfg.moduleFolderName || "").trim();
// FIX: evita duplicar "localsave/localsave" cuando ambas config tienen el mismo valor.
// Esto corrige la ruta real de trabajo para que apunte a localsave/data.
const moduleDir = moduleFolder && moduleFolder !== rootFolder
  ? mods.path.join(baseRoot, rootFolder, moduleFolder)
  : mods.path.join(baseRoot, rootFolder);
const dataDir = mods.path.join(moduleDir, cfg.dataFolderName);

    return {
      supported: true,
      baseRoot,
      moduleDir,
      dataDir,
      files: {
        queue: mods.path.join(dataDir, cfg.files.queue),
        snapshot: mods.path.join(dataDir, cfg.files.snapshot),
        syncLog: mods.path.join(dataDir, cfg.files.syncLog)
      }
    };
  }

  function ensureBaseStructure() {
    const mods = getNodeModules();
    if (!mods) {
      return { ok: false, reason: "filesystem_no_disponible" };
    }

    const paths = getPaths();
    if (!paths.supported) {
      return { ok: false, reason: paths.reason || "paths_no_disponibles" };
    }

    ensureDir(mods, paths.moduleDir);
    ensureDir(mods, paths.dataDir);

    const cfg = window.LocalSaveConfig.get();
    const fileMap = [
      { name: cfg.files.queue, path: paths.files.queue },
      { name: cfg.files.snapshot, path: paths.files.snapshot },
      { name: cfg.files.syncLog, path: paths.files.syncLog }
    ];

    for (let i = 0; i < fileMap.length; i += 1) {
      const item = fileMap[i];
      if (!mods.fs.existsSync(item.path)) {
        const initial = getDefaultsForFile(item.name);
        mods.fs.writeFileSync(
          item.path,
          JSON.stringify(initial, null, cfg.storage.prettyJsonSpaces),
          "utf8"
        );
      }
    }

    return {
      ok: true,
      paths
    };
  }

  function readJson(filePath, fallbackValue) {
    const mods = getNodeModules();
    if (!mods) return clone(fallbackValue);

    try {
      if (!mods.fs.existsSync(filePath)) return clone(fallbackValue);
      const raw = mods.fs.readFileSync(filePath, "utf8");
      if (!raw || !String(raw).trim()) return clone(fallbackValue);
      return JSON.parse(raw);
    } catch (err) {
      return clone(fallbackValue);
    }
  }

  function writeJson(filePath, value) {
    const mods = getNodeModules();
    if (!mods) {
      return { ok: false, reason: "filesystem_no_disponible" };
    }

    const cfg = window.LocalSaveConfig.get();
    const payload = JSON.stringify(value, null, cfg.storage.prettyJsonSpaces);

    try {
      if (cfg.storage.useAtomicWrite) {
        const tmpPath = filePath + ".tmp";
        mods.fs.writeFileSync(tmpPath, payload, "utf8");
        mods.fs.renameSync(tmpPath, filePath);
      } else {
        mods.fs.writeFileSync(filePath, payload, "utf8");
      }

      return { ok: true };
    } catch (err) {
      return {
        ok: false,
        reason: err && err.message ? err.message : "error_escritura_json"
      };
    }
  }

  function readDataFile(fileName, fallbackValue) {
    const ready = ensureBaseStructure();
    if (!ready.ok) return clone(fallbackValue);

    const mods = getNodeModules();
    const target = mods.path.join(ready.paths.dataDir, fileName);
    return readJson(target, fallbackValue);
  }

  function writeDataFile(fileName, value) {
    const ready = ensureBaseStructure();
    if (!ready.ok) return ready;

    const mods = getNodeModules();
    const target = mods.path.join(ready.paths.dataDir, fileName);
    return writeJson(target, value);
  }

  const api = {
    isSupported() {
      return !!getNodeModules();
    },

    getPaths,

    ensureReady: ensureBaseStructure,

    readJson,
    writeJson,

    readDataFile,
    writeDataFile
  };

  window.LocalSaveFS = api;
})(window);