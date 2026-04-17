/*
=========================================================
Nombre completo: preload.js
Ruta o ubicación: /desarrollo/electron/preload.js
Función o funciones:
- Expone una API segura desde Electron hacia la interfaz
- Marca el entorno como Electron para el shell principal
- Centraliza funciones host, shell, utilidades y actualizaciones mediante contextBridge
- Permite escuchar eventos del actualizador sin exponer ipcRenderer completo
- Agrega compatibilidad para scan, pdf y rules del módulo audit
=========================================================
*/
"use strict";

const { contextBridge, ipcRenderer } = require("electron");

function invoke(channel, payload) {
  return ipcRenderer.invoke(channel, payload);
}

function safeOn(channel, callback) {
  if (typeof callback !== "function") {
    throw new TypeError("El callback debe ser una función.");
  }

  const handler = function onMessage(event, payload) {
    callback(payload);
  };

  ipcRenderer.on(channel, handler);

  return function unsubscribe() {
    ipcRenderer.removeListener(channel, handler);
  };
}

const api = {
  host: {
    info: function info() {
      return invoke("host:info");
    }
  },
  shell: {
    openPath: function openPath(targetPath) {
      return invoke("shell:openPath", targetPath);
    },
    revealPath: function revealPath(targetPath) {
      return invoke("shell:revealPath", targetPath);
    },
    chooseFolder: function chooseFolder() {
      return invoke("shell:chooseFolder");
    }
  },
  scan: {
    // Corrección técnica: audit requiere window.api.scan para seleccionar carpeta y ejecutar escaneo.
    // Evita fallos funcionales cuando audit se abre desde el shell principal.
    pickFolder: function pickFolder(initialPath) {
      return invoke("scan:pick-folder", {
        initialPath: initialPath || ""
      });
    },
    run: function run(payload) {
      return invoke("scan:run", payload);
    }
  },
  pdf: {
    // Corrección técnica: audit requiere window.api.pdf.export para exportar reportes.
    // Evita error por API inexistente en preload del shell principal.
    export: function exportPdf(payload) {
      return invoke("pdf:export", payload);
    }
  },
  rules: {
    // Corrección técnica: audit necesita listar reglas disponibles desde IPC.
    // Mantiene compatibilidad con la pantalla rules del módulo.
    listFiles: function listFiles() {
      return invoke("rules:list-files");
    }
  },
  utils: {
    openExternal: function openExternal(url) {
      return invoke("utils:openExternal", url);
    }
  },
  updates: {
    getState: function getState() {
      return invoke("updates:getState");
    },
    check: function check() {
      return invoke("updates:check", { manual: true });
    },
    download: function download() {
      return invoke("updates:download");
    },
    install: function install() {
      return invoke("updates:install");
    },
    onStatus: function onStatus(callback) {
      return safeOn("updates:status", callback);
    }
  }
};

contextBridge.exposeInMainWorld("__DESARROLLO_ELECTRON__", true);
contextBridge.exposeInMainWorld("api", api);