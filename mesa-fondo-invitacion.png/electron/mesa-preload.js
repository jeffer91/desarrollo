/*
=========================================================
Nombre completo: mesa-preload.js
Ruta o ubicación: /electron/mesa-preload.js
Función o funciones:
- Exponer un puente mínimo y seguro al frontend.
- Permitir detectar si la app corre en Electron.
=========================================================
*/
"use strict";

const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("mesaElectron", {
  isElectron: true,
  platform: process.platform,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
    node: process.versions.node
  }
});