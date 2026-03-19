/*
=========================================================
Nombre completo: updater.js
Ruta o ubicación: /desarrollo/electron/updater.js
Función o funciones:
- Centraliza la lógica de auto update del shell Electron
- Configura electron-updater para GitHub Releases
- Revisa actualizaciones al iniciar y periódicamente
- Muestra diálogo para descargar la nueva versión disponible
- Permite instalar la actualización descargada al reiniciar
=========================================================
*/
"use strict";

const { app, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 15000;

let isConfigured = false;
let mainWindowRef = null;
let intervalId = null;
let manualCheckRequested = false;
let lastPromptedVersion = "";
let lastDownloadedVersion = "";

const state = {
  status: "idle",
  message: "Sin revisar actualizaciones todavía.",
  checking: false,
  available: false,
  downloaded: false,
  downloadInProgress: false,
  progressPercent: 0,
  currentVersion: app.getVersion(),
  availableVersion: "",
  lastCheckedAt: "",
  lastError: ""
};

function getUpdateState() {
  return {
    status: state.status,
    message: state.message,
    checking: state.checking,
    available: state.available,
    downloaded: state.downloaded,
    downloadInProgress: state.downloadInProgress,
    progressPercent: state.progressPercent,
    currentVersion: state.currentVersion,
    availableVersion: state.availableVersion,
    lastCheckedAt: state.lastCheckedAt,
    lastError: state.lastError
  };
}

function bindUpdaterWindow(windowInstance) {
  if (windowInstance) {
    mainWindowRef = windowInstance;
    emitStatus();
  }
}

function setState(patch) {
  Object.assign(state, patch || {});
  emitStatus();
}

function emitStatus() {
  if (
    mainWindowRef &&
    !mainWindowRef.isDestroyed() &&
    mainWindowRef.webContents &&
    !mainWindowRef.webContents.isDestroyed()
  ) {
    mainWindowRef.webContents.send("updates:status", getUpdateState());
  }
}

function getParentWindow() {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    return mainWindowRef;
  }
  return null;
}

function consumeManualFlag() {
  const current = manualCheckRequested;
  manualCheckRequested = false;
  return current;
}

async function showNoUpdateDialog() {
  await dialog.showMessageBox(getParentWindow(), {
    type: "info",
    title: "Actualizaciones",
    message: "No hay actualizaciones disponibles.",
    detail: "Tu aplicación ya está en la versión más reciente.",
    buttons: ["Aceptar"],
    defaultId: 0
  });
}

async function showDownloadPrompt(info, forcedByManualCheck) {
  const version = String(info && info.version ? info.version : "").trim();
  if (!version) {
    return;
  }

  if (!forcedByManualCheck && version === lastPromptedVersion) {
    return;
  }

  lastPromptedVersion = version;

  const result = await dialog.showMessageBox(getParentWindow(), {
    type: "info",
    title: "Nueva versión disponible",
    message: "Se encontró una nueva versión de Desarrollo.",
    detail:
      "Versión disponible: " +
      version +
      "\nVersión actual: " +
      app.getVersion() +
      "\n\n¿Deseas descargarla ahora?",
    buttons: ["Descargar ahora", "Más tarde"],
    defaultId: 0,
    cancelId: 1,
    noLink: true
  });

  if (result.response === 0) {
    await downloadAppUpdate();
  }
}

async function showDownloadedPrompt(info) {
  const version = String(info && info.version ? info.version : "").trim();

  if (version && version === lastDownloadedVersion) {
    return;
  }

  lastDownloadedVersion = version;

  const result = await dialog.showMessageBox(getParentWindow(), {
    type: "info",
    title: "Actualización lista",
    message: "La actualización ya se descargó correctamente.",
    detail:
      "Versión descargada: " +
      (version || "Nueva versión") +
      "\n\nPuedes reiniciar ahora para instalarla.",
    buttons: ["Reiniciar e instalar", "Más tarde"],
    defaultId: 0,
    cancelId: 1,
    noLink: true
  });

  if (result.response === 0) {
    installDownloadedUpdate();
  }
}

async function checkForAppUpdates(options = {}) {
  const manual = Boolean(options.manual);

  if (!app.isPackaged) {
    setState({
      status: "idle",
      checking: false,
      message: "Modo desarrollo detectado. El auto update solo funciona en la app instalada."
    });

    if (manual) {
      await dialog.showMessageBox(getParentWindow(), {
        type: "info",
        title: "Actualizaciones",
        message: "La búsqueda de actualizaciones solo funciona en la app instalada.",
        detail: "Primero genera e instala el Setup NSIS para probar este flujo.",
        buttons: ["Aceptar"],
        defaultId: 0
      });
    }

    return {
      ok: false,
      message: "Modo desarrollo. No se revisaron actualizaciones."
    };
  }

  if (state.checking) {
    return {
      ok: false,
      message: "Ya hay una revisión de actualizaciones en curso."
    };
  }

  manualCheckRequested = manual;

  try {
    await autoUpdater.checkForUpdates();
    return {
      ok: true,
      message: "Revisión de actualizaciones iniciada."
    };
  } catch (error) {
    const message =
      error && error.message
        ? error.message
        : "No se pudo revisar si existen actualizaciones.";

    setState({
      status: "error",
      checking: false,
      lastError: message,
      message: message
    });

    if (manual) {
      await dialog.showMessageBox(getParentWindow(), {
        type: "error",
        title: "Error al revisar actualizaciones",
        message: "No se pudo revisar si hay una nueva versión.",
        detail: message,
        buttons: ["Aceptar"],
        defaultId: 0
      });
    }

    return {
      ok: false,
      message: message
    };
  }
}

async function downloadAppUpdate() {
  if (!app.isPackaged) {
    return {
      ok: false,
      message: "La descarga de actualizaciones solo funciona en la app instalada."
    };
  }

  if (state.downloadInProgress) {
    return {
      ok: false,
      message: "La actualización ya se está descargando."
    };
  }

  if (!state.available && !state.availableVersion) {
    return {
      ok: false,
      message: "No hay una actualización lista para descargar."
    };
  }

  try {
    setState({
      status: "downloading",
      downloadInProgress: true,
      downloaded: false,
      progressPercent: 0,
      message: "Descargando actualización..."
    });

    await autoUpdater.downloadUpdate();

    return {
      ok: true,
      message: "Descarga iniciada."
    };
  } catch (error) {
    const message =
      error && error.message
        ? error.message
        : "No se pudo descargar la actualización.";

    setState({
      status: "error",
      downloadInProgress: false,
      downloaded: false,
      lastError: message,
      message: message
    });

    await dialog.showMessageBox(getParentWindow(), {
      type: "error",
      title: "Error al descargar",
      message: "No se pudo descargar la actualización.",
      detail: message,
      buttons: ["Aceptar"],
      defaultId: 0
    });

    return {
      ok: false,
      message: message
    };
  }
}

function installDownloadedUpdate() {
  if (!state.downloaded) {
    return {
      ok: false,
      message: "Todavía no hay una actualización descargada."
    };
  }

  autoUpdater.quitAndInstall(false, true);

  return {
    ok: true,
    message: "Instalación iniciada."
  };
}

function configureAutoUpdater() {
  log.initialize();
  log.transports.file.level = "info";
  autoUpdater.logger = log;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.autoRunAppAfterInstall = true;
  autoUpdater.disableWebInstaller = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on("checking-for-update", function onChecking() {
    setState({
      status: "checking",
      checking: true,
      available: false,
      downloaded: false,
      downloadInProgress: false,
      progressPercent: 0,
      lastCheckedAt: new Date().toISOString(),
      lastError: "",
      message: "Revisando actualizaciones..."
    });
  });

  autoUpdater.on("update-available", async function onUpdateAvailable(info) {
    const manual = consumeManualFlag();
    const version = String(info && info.version ? info.version : "").trim();

    setState({
      status: "available",
      checking: false,
      available: true,
      downloaded: false,
      downloadInProgress: false,
      progressPercent: 0,
      availableVersion: version,
      message: "Hay una nueva versión disponible."
    });

    try {
      await showDownloadPrompt(info, manual);
    } catch (error) {
      log.error("No se pudo mostrar el diálogo de actualización disponible:", error);
    }
  });

  autoUpdater.on("update-not-available", async function onUpdateNotAvailable() {
    const manual = consumeManualFlag();

    setState({
      status: "idle",
      checking: false,
      available: false,
      downloaded: false,
      downloadInProgress: false,
      progressPercent: 0,
      availableVersion: "",
      message: "No hay actualizaciones disponibles."
    });

    if (manual) {
      try {
        await showNoUpdateDialog();
      } catch (error) {
        log.error("No se pudo mostrar el diálogo sin actualizaciones:", error);
      }
    }
  });

  autoUpdater.on("download-progress", function onDownloadProgress(progress) {
    const percent = Number(progress && progress.percent ? progress.percent : 0);

    setState({
      status: "downloading",
      checking: false,
      available: true,
      downloaded: false,
      downloadInProgress: true,
      progressPercent: Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0,
      message:
        "Descargando actualización... " +
        Math.round(Number.isFinite(percent) ? percent : 0) +
        "%"
    });
  });

  autoUpdater.on("update-downloaded", async function onUpdateDownloaded(info) {
    setState({
      status: "downloaded",
      checking: false,
      available: true,
      downloaded: true,
      downloadInProgress: false,
      progressPercent: 100,
      availableVersion: String(info && info.version ? info.version : ""),
      message: "Actualización descargada. Lista para instalar."
    });

    try {
      await showDownloadedPrompt(info);
    } catch (error) {
      log.error("No se pudo mostrar el diálogo de actualización descargada:", error);
    }
  });

  autoUpdater.on("error", async function onError(error) {
    const manual = consumeManualFlag();
    const message =
      error && error.message
        ? error.message
        : "Se produjo un error durante el proceso de actualización.";

    setState({
      status: "error",
      checking: false,
      downloadInProgress: false,
      lastError: message,
      message: message
    });

    log.error("Error en autoUpdater:", error);

    if (manual) {
      try {
        await dialog.showMessageBox(getParentWindow(), {
          type: "error",
          title: "Actualizaciones",
          message: "Ocurrió un error durante la actualización.",
          detail: message,
          buttons: ["Aceptar"],
          defaultId: 0
        });
      } catch (dialogError) {
        log.error("No se pudo mostrar el diálogo de error:", dialogError);
      }
    }
  });
}

function scheduleAutomaticChecks() {
  if (!app.isPackaged) {
    return;
  }

  if (intervalId) {
    return;
  }

  setTimeout(function delayedStartupCheck() {
    checkForAppUpdates({ manual: false }).catch(function ignoreError() {
      return null;
    });
  }, STARTUP_DELAY_MS);

  intervalId = setInterval(function periodicCheck() {
    checkForAppUpdates({ manual: false }).catch(function ignoreError() {
      return null;
    });
  }, SIX_HOURS_MS);
}

function setupUpdater(options = {}) {
  if (options.mainWindow) {
    bindUpdaterWindow(options.mainWindow);
  }

  if (isConfigured) {
    return;
  }

  configureAutoUpdater();
  scheduleAutomaticChecks();
  isConfigured = true;
}

module.exports = {
  setupUpdater,
  bindUpdaterWindow,
  checkForAppUpdates,
  downloadAppUpdate,
  installDownloadedUpdate,
  getUpdateState
};