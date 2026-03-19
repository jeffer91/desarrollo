/*
=========================================================
Nombre completo: main.js
Ruta o ubicación: /desarrollo/electron/main.js
Función o funciones:
- Punto de entrada principal de Electron para toda la app desarrollo
- Crea la ventana principal y carga /desarrollo/index.html
- Expone IPC básicos para entorno escritorio sin tocar módulos existentes
- Integra el sistema de auto update con GitHub Releases
- Permite revisar, descargar e instalar actualizaciones desde IPC
=========================================================
*/
"use strict";

const path = require("path");
const fs = require("fs");
const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");

const {
  setupUpdater,
  bindUpdaterWindow,
  checkForAppUpdates,
  downloadAppUpdate,
  installDownloadedUpdate,
  getUpdateState
} = require("./updater");

const ROOT_DIR = path.resolve(__dirname, "..");
const PRELOAD_PATH = path.join(__dirname, "preload.js");
const INDEX_PATH = path.join(ROOT_DIR, "index.html");

let mainWindow = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    backgroundColor: "#f4f6fb",
    autoHideMenuBar: false,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
      webSecurity: true
    }
  });

  mainWindow.once("ready-to-show", function onReady() {
    if (!mainWindow) {
      return;
    }
    mainWindow.show();
  });

  mainWindow.on("closed", function onClosed() {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(function onWindowOpen(details) {
    const url = String(details && details.url ? details.url : "").trim();
    if (url) {
      shell.openExternal(url).catch(function ignoreError() {
        return null;
      });
    }
    return { action: "deny" };
  });

  mainWindow.loadFile(INDEX_PATH);

  bindUpdaterWindow(mainWindow);

  return mainWindow;
}

function registerIpcHandlers() {
  ipcMain.handle("host:info", async function handleHostInfo() {
    return {
      ok: true,
      mode: "electron",
      platform: process.platform,
      versions: {
        electron: process.versions.electron,
        chrome: process.versions.chrome,
        node: process.versions.node
      },
      rootDir: ROOT_DIR,
      appVersion: app.getVersion()
    };
  });

  ipcMain.handle("shell:openPath", async function handleOpenPath(event, targetPath) {
    try {
      const rawPath = String(targetPath || "").trim();
      if (!rawPath) {
        return { ok: false, message: "No se recibió una ruta válida." };
      }

      const resolvedPath = path.isAbsolute(rawPath)
        ? rawPath
        : path.resolve(ROOT_DIR, rawPath);

      const result = await shell.openPath(resolvedPath);
      if (result) {
        return { ok: false, message: result };
      }

      return {
        ok: true,
        message: "Ruta abierta correctamente.",
        path: resolvedPath
      };
    } catch (error) {
      return {
        ok: false,
        message: error && error.message ? error.message : "No se pudo abrir la ruta."
      };
    }
  });

  ipcMain.handle("shell:revealPath", async function handleRevealPath(event, targetPath) {
    try {
      const rawPath = String(targetPath || "").trim();
      if (!rawPath) {
        return { ok: false, message: "No se recibió una ruta válida." };
      }

      const resolvedPath = path.isAbsolute(rawPath)
        ? rawPath
        : path.resolve(ROOT_DIR, rawPath);

      if (!fs.existsSync(resolvedPath)) {
        return {
          ok: false,
          message: "La ruta indicada no existe.",
          path: resolvedPath
        };
      }

      shell.showItemInFolder(resolvedPath);

      return {
        ok: true,
        message: "Ruta mostrada correctamente.",
        path: resolvedPath
      };
    } catch (error) {
      return {
        ok: false,
        message: error && error.message ? error.message : "No se pudo mostrar la ruta."
      };
    }
  });

  ipcMain.handle("shell:chooseFolder", async function handleChooseFolder() {
    try {
      const result = await dialog.showOpenDialog({
        title: "Seleccionar carpeta",
        properties: ["openDirectory", "createDirectory"]
      });

      if (result.canceled || !result.filePaths || !result.filePaths.length) {
        return {
          ok: false,
          canceled: true,
          message: "Selección cancelada."
        };
      }

      return {
        ok: true,
        canceled: false,
        path: result.filePaths[0]
      };
    } catch (error) {
      return {
        ok: false,
        message: error && error.message ? error.message : "No se pudo seleccionar carpeta."
      };
    }
  });

  ipcMain.handle("utils:openExternal", async function handleOpenExternal(event, url) {
    try {
      const safeUrl = String(url || "").trim();
      if (!safeUrl) {
        return { ok: false, message: "No se recibió una URL válida." };
      }

      await shell.openExternal(safeUrl);

      return {
        ok: true,
        message: "Recurso externo abierto correctamente."
      };
    } catch (error) {
      return {
        ok: false,
        message: error && error.message ? error.message : "No se pudo abrir el recurso externo."
      };
    }
  });

  ipcMain.handle("updates:getState", async function handleGetUpdateState() {
    return {
      ok: true,
      state: getUpdateState()
    };
  });

  ipcMain.handle("updates:check", async function handleCheckUpdates(event, payload) {
    return checkForAppUpdates({
      manual: Boolean(payload && payload.manual)
    });
  });

  ipcMain.handle("updates:download", async function handleDownloadUpdate() {
    return downloadAppUpdate();
  });

  ipcMain.handle("updates:install", async function handleInstallUpdate() {
    return installDownloadedUpdate();
  });
}

app.whenReady().then(async function onReady() {
  registerIpcHandlers();
  createMainWindow();
  setupUpdater({ mainWindow });
});

app.on("activate", function onActivate() {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  } else {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      bindUpdaterWindow(focusedWindow);
    }
  }
});

app.on("window-all-closed", function onWindowAllClosed() {
  if (process.platform !== "darwin") {
    app.quit();
  }
});