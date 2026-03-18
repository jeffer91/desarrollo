/* =========================================================
Nombre del archivo: electron.preload.js
Ubicación: /electron/electron.preload.js
Función o funciones:
- Preload seguro
- Expone un objeto mínimo de solo lectura para detectar Electron si lo necesitas
========================================================= */

"use strict";

const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("APP", {
  isElectron: true
});
