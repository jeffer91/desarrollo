/*
=========================================================
Nombre completo: eventos-background-manager.js
Ruta o ubicación: /desarrollo/electron/eventos-background-manager.js

Función o funciones:
1. Crear una ventana oculta exclusiva para el motor de Eventos.
2. Cargar /eventos/background.html sin mostrar interfaz.
3. Mantener vivos los recordatorios aunque el usuario no abra Eventos.
4. Permitir iniciar, detener, reiniciar y consultar estado del motor.
5. Conectar el motor oculto con el proceso principal de Electron.
6. Evitar que toda la app desarrollo quede trabajando en segundo plano.

Con qué se comunica:
- /desarrollo/electron/main.js
- /desarrollo/electron/preload.js
- /desarrollo/eventos/background.html
- /desarrollo/eventos/src/js/background-boot.js

Qué aporta:
Permite que solo Eventos trabaje en segundo plano dentro de la app grande.
=========================================================
*/

"use strict";

const fs = require("fs");
const path = require("path");
const { BrowserWindow, ipcMain } = require("electron");

const DEFAULT_STATE = {
  ok: true,
  running: false,
  loaded: false,
  visible: false,
  status: "stopped",
  message: "Motor de Eventos detenido.",
  lastStartAt: null,
  lastStopAt: null,
  lastHeartbeatAt: null,
  lastTickAt: null,
  lastError: "",
  pid: process.pid
};

let backgroundWindow = null;
let state = { ...DEFAULT_STATE };
let registered = false;

function nowISO() {
  return new Date().toISOString();
}

function safeMessage(error) {
  if (!error) return "Error desconocido.";
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  return String(error);
}

function getProjectRoot() {
  return path.resolve(__dirname, "..");
}

function getEventosBackgroundPath() {
  return path.join(getProjectRoot(), "eventos", "background.html");
}

function getPreloadPath() {
  return path.join(__dirname, "preload.js");
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (_error) {
    return false;
  }
}

function normalizeStatusPatch(patch = {}) {
  return {
    ...patch,
    ok: patch.ok !== false,
    updatedAt: nowISO()
  };
}

function updateState(patch = {}) {
  state = {
    ...state,
    ...normalizeStatusPatch(patch)
  };
  return getEventosBackgroundStatus();
}

function getEventosBackgroundStatus() {
  return {
    ...state,
    hasWindow: Boolean(backgroundWindow && !backgroundWindow.isDestroyed())
  };
}

function sendToBackground(channel, payload) {
  if (!backgroundWindow || backgroundWindow.isDestroyed()) {
    return {
      ok: false,
      message: "La ventana oculta de Eventos no está disponible."
    };
  }

  try {
    backgroundWindow.webContents.send(channel, payload);
    return {
      ok: true,
      message: "Mensaje enviado al motor oculto."
    };
  } catch (error) {
    return {
      ok: false,
      message: safeMessage(error)
    };
  }
}

async function startEventosBackground(options = {}) {
  const backgroundPath = getEventosBackgroundPath();
  const preloadPath = getPreloadPath();

  if (!fileExists(backgroundPath)) {
    return updateState({
      ok: false,
      running: false,
      loaded: false,
      status: "missing-background-html",
      message: `No existe el archivo requerido: ${backgroundPath}`,
      lastError: `No existe ${backgroundPath}`
    });
  }

  if (!fileExists(preloadPath)) {
    return updateState({
      ok: false,
      running: false,
      loaded: false,
      status: "missing-preload",
      message: `No existe el preload requerido: ${preloadPath}`,
      lastError: `No existe ${preloadPath}`
    });
  }

  if (backgroundWindow && !backgroundWindow.isDestroyed()) {
    if (options.forceReload) {
      try {
        await backgroundWindow.loadFile(backgroundPath);
      } catch (error) {
        return updateState({
          ok: false,
          running: false,
          status: "reload-error",
          message: safeMessage(error),
          lastError: safeMessage(error)
        });
      }
    }

    return updateState({
      ok: true,
      running: true,
      loaded: true,
      status: "already-running",
      message: "El motor oculto de Eventos ya estaba activo."
    });
  }

  try {
    backgroundWindow = new BrowserWindow({
      width: 420,
      height: 320,
      show: Boolean(options.show),
      skipTaskbar: true,
      title: "Eventos Background Engine",
      backgroundColor: "#111827",
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        webSecurity: false
      }
    });

    backgroundWindow.on("closed", function onClosed() {
      backgroundWindow = null;
      updateState({
        running: false,
        loaded: false,
        status: "closed",
        message: "La ventana oculta de Eventos se cerró.",
        lastStopAt: nowISO()
      });
    });

    backgroundWindow.webContents.on("did-finish-load", function onLoaded() {
      updateState({
        ok: true,
        running: true,
        loaded: true,
        visible: backgroundWindow ? backgroundWindow.isVisible() : false,
        status: "loaded",
        message: "Motor oculto de Eventos cargado correctamente.",
        lastError: ""
      });
    });

    backgroundWindow.webContents.on("did-fail-load", function onFailedLoad(_event, errorCode, errorDescription) {
      updateState({
        ok: false,
        running: false,
        loaded: false,
        status: "load-error",
        message: `No se pudo cargar Eventos background: ${errorDescription}`,
        lastError: `${errorCode} - ${errorDescription}`
      });
    });

    await backgroundWindow.loadFile(backgroundPath);

    return updateState({
      ok: true,
      running: true,
      loaded: true,
      visible: backgroundWindow.isVisible(),
      status: "starting",
      message: "Iniciando motor oculto de Eventos.",
      lastStartAt: nowISO(),
      lastError: ""
    });
  } catch (error) {
    backgroundWindow = null;

    return updateState({
      ok: false,
      running: false,
      loaded: false,
      status: "start-error",
      message: safeMessage(error),
      lastError: safeMessage(error)
    });
  }
}

async function stopEventosBackground() {
  if (!backgroundWindow || backgroundWindow.isDestroyed()) {
    return updateState({
      ok: true,
      running: false,
      loaded: false,
      status: "stopped",
      message: "El motor oculto de Eventos ya estaba detenido.",
      lastStopAt: nowISO()
    });
  }

  try {
    sendToBackground("eventos-background:stop-runner", {
      reason: "main-process-stop",
      at: nowISO()
    });

    backgroundWindow.destroy();
    backgroundWindow = null;

    return updateState({
      ok: true,
      running: false,
      loaded: false,
      status: "stopped",
      message: "Motor oculto de Eventos detenido.",
      lastStopAt: nowISO()
    });
  } catch (error) {
    return updateState({
      ok: false,
      status: "stop-error",
      message: safeMessage(error),
      lastError: safeMessage(error)
    });
  }
}

async function restartEventosBackground(options = {}) {
  await stopEventosBackground();
  return startEventosBackground({
    ...options,
    forceReload: true
  });
}

function showEventosBackgroundDevWindow() {
  if (!backgroundWindow || backgroundWindow.isDestroyed()) {
    return {
      ok: false,
      message: "El motor oculto de Eventos no está iniciado."
    };
  }

  backgroundWindow.show();
  backgroundWindow.focus();

  return updateState({
    visible: true,
    message: "Ventana técnica del motor de Eventos visible."
  });
}

function hideEventosBackgroundDevWindow() {
  if (!backgroundWindow || backgroundWindow.isDestroyed()) {
    return {
      ok: false,
      message: "El motor oculto de Eventos no está iniciado."
    };
  }

  backgroundWindow.hide();

  return updateState({
    visible: false,
    message: "Ventana técnica del motor de Eventos oculta."
  });
}

function registerEventosBackgroundIpc() {
  if (registered) {
    return;
  }

  registered = true;

  ipcMain.handle("eventos-background:start", async (_event, options = {}) => {
    return startEventosBackground(options);
  });

  ipcMain.handle("eventos-background:stop", async () => {
    return stopEventosBackground();
  });

  ipcMain.handle("eventos-background:restart", async (_event, options = {}) => {
    return restartEventosBackground(options);
  });

  ipcMain.handle("eventos-background:status", async () => {
    return getEventosBackgroundStatus();
  });

  ipcMain.handle("eventos-background:show-dev-window", async () => {
    return showEventosBackgroundDevWindow();
  });

  ipcMain.handle("eventos-background:hide-dev-window", async () => {
    return hideEventosBackgroundDevWindow();
  });

  ipcMain.on("eventos-background:heartbeat", (_event, payload = {}) => {
    updateState({
      ok: payload.ok !== false,
      running: payload.running !== false,
      loaded: true,
      status: payload.status || "heartbeat",
      message: payload.message || "Motor de Eventos activo.",
      lastHeartbeatAt: nowISO(),
      lastTickAt: payload.lastTickAt || state.lastTickAt,
      lastError: payload.lastError || ""
    });
  });

  ipcMain.on("eventos-background:tick", (_event, payload = {}) => {
    updateState({
      ok: payload.ok !== false,
      running: true,
      loaded: true,
      status: payload.status || "tick",
      message: payload.message || "Ciclo de recordatorios ejecutado.",
      lastTickAt: payload.lastTickAt || nowISO(),
      lastError: payload.lastError || ""
    });
  });

  ipcMain.on("eventos-background:error", (_event, payload = {}) => {
    updateState({
      ok: false,
      running: true,
      loaded: true,
      status: "error",
      message: payload.message || "Error en el motor oculto de Eventos.",
      lastError: payload.message || "Error desconocido.",
      lastHeartbeatAt: nowISO()
    });
  });
}

module.exports = {
  registerEventosBackgroundIpc,
  startEventosBackground,
  stopEventosBackground,
  restartEventosBackground,
  getEventosBackgroundStatus,
  showEventosBackgroundDevWindow,
  hideEventosBackgroundDevWindow,
  sendToBackground
};