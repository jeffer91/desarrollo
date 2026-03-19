/*
=========================================================
Nombre completo: preload.js
Ruta o ubicación: /desarrollo/electron/preload.js
Función o funciones:
- Expone una API segura desde Electron hacia la interfaz
- Marca el entorno como Electron para el shell principal
- Centraliza funciones host, shell, utilidades y actualizaciones mediante contextBridge
- Permite escuchar eventos del actualizador sin exponer ipcRenderer completo
=========================================================
*/
"use strict";

const { contextBridge, ipcRenderer } = require("electron");

function invoke(channel, payload) {
  return ipcRenderer.invoke(channel, payload);
}

function safeOn(channel, callback) {
  if (typeof callback !== "function") {
    throw new TypeError('El callback debe ser una función.');
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