/*
=========================================================
Nombre completo: mesa-storage.js
Ruta o ubicación: /js/mesa-storage.js
Función o funciones:
- Centralizar el guardado local de la aplicación.
- Leer y escribir datos en localStorage.
- Exportar respaldo JSON.
- Importar respaldo JSON desde archivo local.
- Preparar la persistencia para navegador y Electron.
=========================================================
*/
"use strict";

(function attachMesaStorage(global) {
  const MESA_DEFAULT_STORAGE_KEY = "mesa_invitaciones_app_v1";
  const MESA_DEFAULT_EXPORT_NAME = "mesa-invitaciones-local.json";

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function buildSafePayload(payload) {
    if (!isObject(payload)) {
      return {
        config: {},
        records: [],
        currentRecordId: null
      };
    }

    return {
      config: isObject(payload.config) ? payload.config : {},
      records: Array.isArray(payload.records) ? payload.records : [],
      currentRecordId: payload.currentRecordId || null
    };
  }

  function saveToLocalStorage(payload, storageKey) {
    const key = storageKey || MESA_DEFAULT_STORAGE_KEY;
    const safePayload = buildSafePayload(payload);
    localStorage.setItem(key, JSON.stringify(safePayload, null, 2));
    return safePayload;
  }

  function loadFromLocalStorage(storageKey) {
    const key = storageKey || MESA_DEFAULT_STORAGE_KEY;
    const raw = localStorage.getItem(key);

    if (!raw) {
      return buildSafePayload({});
    }

    try {
      const parsed = JSON.parse(raw);
      return buildSafePayload(parsed);
    } catch (error) {
      console.error("No se pudo leer el almacenamiento local de mesa.", error);
      return buildSafePayload({});
    }
  }

  function clearLocalStorage(storageKey) {
    const key = storageKey || MESA_DEFAULT_STORAGE_KEY;
    localStorage.removeItem(key);
  }

  function exportPayloadAsJson(payload, fileName) {
    const safePayload = buildSafePayload(payload);
    const blob = new Blob([JSON.stringify(safePayload, null, 2)], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName || MESA_DEFAULT_EXPORT_NAME;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function readJsonFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error("No se recibió ningún archivo JSON."));
        return;
      }

      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(String(event.target.result || ""));
          resolve(buildSafePayload(parsed));
        } catch (error) {
          reject(new Error("El archivo seleccionado no contiene un JSON válido."));
        }
      };

      reader.onerror = () => {
        reject(new Error("No se pudo leer el archivo seleccionado."));
      };

      reader.readAsText(file, "utf-8");
    });
  }

  function buildPortableState(config, records, currentRecordId) {
    return buildSafePayload({
      config,
      records,
      currentRecordId
    });
  }

  function isElectronEnvironment() {
    return !!(global.mesaElectron && global.mesaElectron.isElectron);
  }

  global.MesaStorage = {
    DEFAULT_STORAGE_KEY: MESA_DEFAULT_STORAGE_KEY,
    DEFAULT_EXPORT_NAME: MESA_DEFAULT_EXPORT_NAME,
    buildSafePayload,
    buildPortableState,
    saveToLocalStorage,
    loadFromLocalStorage,
    clearLocalStorage,
    exportPayloadAsJson,
    readJsonFile,
    isElectronEnvironment
  };
})(window);