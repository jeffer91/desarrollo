/* =========================================================
Nombre del archivo: electron.main.js
Ubicación: /electron/electron.main.js
Función o funciones:
- Proceso principal Electron
- Crea la ventana
- Carga /menu/menu.index.html como inicio
========================================================= */

"use strict";

const path = require("path");
const { app, BrowserWindow, shell } = require("electron");

function createWindow(){
  const win = new BrowserWindow({
    width: 1200,
    height: 760,
    backgroundColor: "#ffffff",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, "electron.preload.js")
    }
  });

  const startFile = path.join(__dirname, "..", "menu", "menu.index.html");
  win.loadFile(startFile);

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
