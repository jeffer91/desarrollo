/* =========================================================
Nombre completo: electron-main.js
Ruta: /Titulacion/backend/electron-main.js
Función o funciones:
- Iniciar la aplicación Electron.
- Crear la ventana principal.
- Cargar titulacion.html.
- Registrar IPC modular de PDF, archivos y Excel.
- Mantener el archivo principal como orquestador limpio.
========================================================= */

const path = require("path");
const { app, BrowserWindow, ipcMain } = require("electron");

const { registerFileIpc } = require("./ipc/file-ipc");
const { registerPdfIpc } = require("./ipc/pdf-ipc");
const { registerExcelIpc } = require("./ipc/excel-ipc");

let mainWindow = null;
let ipcRegistered = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 850,
    minWidth: 1050,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "..", "frontend", "titulacion.html"));

  mainWindow.on("closed", function () {
    mainWindow = null;
  });
}

function getMainWindow() {
  return mainWindow;
}

function registerIpcOnce() {
  if (ipcRegistered) {
    return;
  }

  ipcRegistered = true;

  ipcMain.handle("titulacion:app:get-info", function () {
    return {
      ok: true,
      name: app.getName(),
      version: app.getVersion(),
      userData: app.getPath("userData")
    };
  });

  registerFileIpc(ipcMain, app);
  registerPdfIpc(ipcMain, getMainWindow);
  registerExcelIpc(ipcMain);
}

app.whenReady().then(function () {
  registerIpcOnce();
  createWindow();
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", function () {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});