/* =========================================================
Nombre completo: preload.js
Ruta: /Titulacion/backend/preload.js
Función o funciones:
- Exponer una API segura entre Electron y el frontend.
- Permitir exportación PDF desde la ventana actual.
- Permitir guardar, leer y eliminar JSON local.
- Permitir consultar información básica de archivos Excel/CSV.
- Evitar acceso directo inseguro a Node desde el navegador.
========================================================= */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("titulacionAPI", {
  pdf: {
    exportCurrentWindow: function (options) {
      return ipcRenderer.invoke("titulacion:pdf:export-current-window", options || {});
    }
  },

  files: {
    saveJson: function (payload) {
      return ipcRenderer.invoke("titulacion:file:save-json", payload || {});
    },

    readJson: function () {
      return ipcRenderer.invoke("titulacion:file:read-json");
    },

    deleteJson: function () {
      return ipcRenderer.invoke("titulacion:file:delete-json");
    }
  },

  excel: {
    fileInfo: function (filePath) {
      return ipcRenderer.invoke("titulacion:excel:file-info", filePath);
    },

    readText: function (filePath) {
      return ipcRenderer.invoke("titulacion:excel:read-text", filePath);
    },

    readBufferInfo: function (filePath) {
      return ipcRenderer.invoke("titulacion:excel:read-buffer-info", filePath);
    }
  },

  app: {
    getInfo: function () {
      return ipcRenderer.invoke("titulacion:app:get-info");
    }
  }
});