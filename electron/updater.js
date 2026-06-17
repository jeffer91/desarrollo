/*
=========================================================
Nombre completo: updater.js
Ruta o ubicación: /desarrollo/electron/updater.js

Función o funciones:
1. Centraliza la lógica de actualización del shell Electron.
2. Revisa actualizaciones en GitHub Releases cuando la app está instalada.
3. Evita descargas e instalaciones automáticas peligrosas.
4. Permite descargar la actualización solo cuando el usuario lo pide.
5. Permite instalar la actualización solo al presionar el botón correspondiente.
6. Mantiene informado al panel visual de actualizaciones mediante IPC.
=========================================================
*/

"use strict";

const { app, dialog } = require("electron");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

const STARTUP_DELAY_MS = 5000;
const PERIODIC_CHECK_MS = 15 * 60 * 1000;

let isConfigured = false;
let mainWindowRef = null;
let intervalId = null;
let startupTimeoutId = null;
let manualCheckRequested = false;

const state = {
  status: "idle",
  message: "Sin revisar actualizaciones todavía.",
  checking: false,
  available: false,
  downloaded: false,
  downloadInProgress: false,
  installing: false,
  progressPercent: 0,
  currentVersion: app.getVersion(),
  availableVersion: "",
  lastCheckedAt: "",
  lastError: ""
};

function safeString(value) {
  return String(value == null ? "" : value).trim();
}

function getUpdateState() {
  return {
    status: state.status,
    message: state.message,
    checking: state.checking,
    available: state.available,
    downloaded: state.downloaded,
    downloadInProgress: state.downloadInProgress,
    installing: state.installing,
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

function normalizeErrorMessage(error, fallbackMessage) {
  if (error && error.message) {
    return String(error.message);
  }

  if (typeof error === "string") {
    return error;
  }

  return fallbackMessage || "Se produjo un error durante el proceso de actualización.";
}

async function showManualMessage(type, title, message, detail) {
  try {
    await dialog.showMessageBox(getParentWindow(), {
      type: type || "info",
      title: title || "Actualizaciones",
      message: message || "",
      detail: detail || "",
      buttons: ["Aceptar"],
      defaultId: 0,
      cancelId: 0,
      noLink: true
    });
  } catch (error) {
    log.error("No se pudo mostrar el mensaje de actualización:", error);
  }
}

async function checkForAppUpdates(options = {}) {
  const manual = Boolean(options.manual);

  if (!app.isPackaged) {
    setState({
      status: "dev",
      checking: false,
      available: false,
      downloaded: false,
      downloadInProgress: false,
      installing: false,
      progressPercent: 0,
      lastError: "",
      message: "Modo desarrollo detectado. El auto update solo funciona en la app instalada."
    });

    if (manual) {
      await showManualMessage(
        "info",
        "Actualizaciones",
        "La búsqueda de actualizaciones solo funciona en la app instalada.",
        "Primero genera e instala el Setup NSIS para probar este flujo."
      );
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

  if (state.downloadInProgress) {
    return {
      ok: false,
      message: "Ya hay una descarga de actualización en curso."
    };
  }

  if (state.installing) {
    return {
      ok: false,
      message: "Ya se está iniciando la instalación de la actualización."
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
    const message = normalizeErrorMessage(
      error,
      "No se pudo revisar si existen actualizaciones."
    );

    setState({
      status: "error",
      checking: false,
      downloadInProgress: false,
      installing: false,
      lastError: message,
      message: message
    });

    if (manual) {
      await showManualMessage(
        "error",
        "Error al revisar actualizaciones",
        "No se pudo revisar si hay una nueva versión.",
        message
      );
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

  if (state.installing) {
    return {
      ok: false,
      message: "Ya se está iniciando la instalación de la actualización."
    };
  }

  if (state.downloaded) {
    return {
      ok: true,
      message: "La actualización ya está descargada. Presiona Reiniciar e instalar."
    };
  }

  if (state.downloadInProgress) {
    return {
      ok: true,
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
      checking: false,
      available: true,
      downloaded: false,
      downloadInProgress: true,
      installing: false,
      progressPercent: 0,
      lastError: "",
      message: "Descargando actualización..."
    });

    await autoUpdater.downloadUpdate();

    return {
      ok: true,
      message: "Descarga iniciada."
    };
  } catch (error) {
    const message = normalizeErrorMessage(
      error,
      "No se pudo descargar la actualización."
    );

    setState({
      status: "error",
      checking: false,
      downloadInProgress: false,
      downloaded: false,
      installing: false,
      lastError: message,
      message: message
    });

    return {
      ok: false,
      message: message
    };
  }
}

function installDownloadedUpdate() {
  if (!app.isPackaged) {
    return {
      ok: false,
      message: "La instalación de actualizaciones solo funciona en la app instalada."
    };
  }

  if (!state.downloaded) {
    return {
      ok: false,
      message: "Todavía no hay una actualización descargada."
    };
  }

  if (state.installing) {
    return {
      ok: true,
      message: "La instalación ya fue iniciada."
    };
  }

  setState({
    status: "installing",
    checking: false,
    downloadInProgress: false,
    installing: true,
    lastError: "",
    message: "Cerrando la app para instalar la actualización..."
  });

  setTimeout(function startSafeInstall() {
    try {
      autoUpdater.quitAndInstall(false, true);
    } catch (error) {
      const message = normalizeErrorMessage(
        error,
        "No se pudo iniciar la instalación de la actualización."
      );

      setState({
        status: "error",
        installing: false,
        lastError: message,
        message: message
      });

      log.error("No se pudo iniciar quitAndInstall:", error);
    }
  }, 800);

  return {
    ok: true,
    message: "Instalación iniciada."
  };
}

function configureAutoUpdater() {
  if (typeof log.initialize === "function") {
    log.initialize();
  }

  log.transports.file.level = "info";
  autoUpdater.logger = log;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  autoUpdater.autoRunAppAfterInstall = true;
  autoUpdater.disableWebInstaller = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;

  autoUpdater.on("checking-for-update", function onCheckingForUpdate() {
    setState({
      status: "checking",
      checking: true,
      available: false,
      downloaded: false,
      downloadInProgress: false,
      installing: false,
      progressPercent: 0,
      lastCheckedAt: new Date().toISOString(),
      lastError: "",
      message: "Revisando actualizaciones..."
    });
  });

  autoUpdater.on("update-available", async function onUpdateAvailable(info) {
    const manual = consumeManualFlag();
    const version = safeString(info && info.version);

    setState({
      status: "available",
      checking: false,
      available: true,
      downloaded: false,
      downloadInProgress: false,
      installing: false,
      progressPercent: 0,
      availableVersion: version,
      lastError: "",
      message: "Nueva versión encontrada. Presiona Descargar actualización para continuar."
    });

    if (manual) {
      await showManualMessage(
        "info",
        "Actualización disponible",
        "Hay una nueva versión disponible.",
        version
          ? "Versión disponible: " + version + ". Descárgala desde el panel de actualizaciones."
          : "Descárgala desde el panel de actualizaciones."
      );
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
      installing: false,
      progressPercent: 0,
      availableVersion: "",
      lastError: "",
      message: "No hay actualizaciones disponibles."
    });

    if (manual) {
      await showManualMessage(
        "info",
        "Actualizaciones",
        "No hay actualizaciones disponibles.",
        "Tu aplicación ya está en la versión más reciente."
      );
    }
  });

  autoUpdater.on("download-progress", function onDownloadProgress(progress) {
    const rawPercent = Number(progress && progress.percent ? progress.percent : 0);
    const safePercent = Number.isFinite(rawPercent)
      ? Math.max(0, Math.min(100, rawPercent))
      : 0;

    setState({
      status: "downloading",
      checking: false,
      available: true,
      downloaded: false,
      downloadInProgress: true,
      installing: false,
      progressPercent: safePercent,
      lastError: "",
      message: "Descargando actualización... " + Math.round(safePercent) + "%"
    });
  });

  autoUpdater.on("update-downloaded", function onUpdateDownloaded(info) {
    const version = safeString(info && info.version);

    setState({
      status: "downloaded",
      checking: false,
      available: true,
      downloaded: true,
      downloadInProgress: false,
      installing: false,
      progressPercent: 100,
      availableVersion: version,
      lastError: "",
      message: "Actualización descargada. Presiona Reiniciar e instalar cuando estés listo."
    });

    log.info(
      "Actualización descargada. Esperando confirmación manual para instalar.",
      version || ""
    );
  });

  autoUpdater.on("error", async function onError(error) {
    const manual = consumeManualFlag();

    const message = normalizeErrorMessage(
      error,
      "Se produjo un error durante el proceso de actualización."
    );

    setState({
      status: "error",
      checking: false,
      downloadInProgress: false,
      installing: false,
      lastError: message,
      message: message
    });

    log.error("Error en autoUpdater:", error);

    if (manual) {
      await showManualMessage(
        "error",
        "Actualizaciones",
        "Ocurrió un error durante la actualización.",
        message
      );
    }
  });
}

function scheduleAutomaticChecks() {
  if (!app.isPackaged) {
    setState({
      status: "dev",
      checking: false,
      available: false,
      downloaded: false,
      downloadInProgress: false,
      installing: false,
      progressPercent: 0,
      message: "Modo desarrollo detectado. El auto update solo funciona en la app instalada."
    });

    return;
  }

  if (startupTimeoutId || intervalId) {
    return;
  }

  startupTimeoutId = setTimeout(function delayedStartupCheck() {
    startupTimeoutId = null;

    checkForAppUpdates({ manual: false }).catch(function onStartupCheckError(error) {
      log.error("Error en revisión automática inicial:", error);
    });
  }, STARTUP_DELAY_MS);

  intervalId = setInterval(function periodicCheck() {
    checkForAppUpdates({ manual: false }).catch(function onPeriodicCheckError(error) {
      log.error("Error en revisión automática periódica:", error);
    });
  }, PERIODIC_CHECK_MS);
}

function setupUpdater(options = {}) {
  if (options.mainWindow) {
    bindUpdaterWindow(options.mainWindow);
  }

  if (isConfigured) {
    return;
  }

  configureAutoUpdater();
  isConfigured = true;
  scheduleAutomaticChecks();
}

module.exports = {
  setupUpdater,
  bindUpdaterWindow,
  checkForAppUpdates,
  downloadAppUpdate,
  installDownloadedUpdate,
  getUpdateState
};