/*
=========================================================
Nombre completo: main.js
Ruta o ubicación: /desarrollo/electron/main.js

Función o funciones:
1. Iniciar la app grande Desarrollo.
2. Cargar /desarrollo/index.html.
3. Cerrar completamente la app al presionar X.
4. Detener el motor oculto de Eventos al cerrar.
5. Evitar que la app quede viva en segundo plano.
6. Desactivar inicio automático con Windows.
7. Registrar IPC de host, shell, scan, PDF, actualizaciones y Eventos.
=========================================================
*/

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  dialog,
  nativeImage,
  Notification
} = require("electron");

const {
  setupUpdater,
  bindUpdaterWindow,
  checkForAppUpdates,
  downloadAppUpdate,
  installDownloadedUpdate,
  getUpdateState
} = require("./updater");

const {
  registerEventosBackgroundIpc,
  stopEventosBackground,
  getEventosBackgroundStatus
} = require("./eventos-background-manager");

const APP_NAME = "Desarrollo";
const APP_ID = "com.jeff.desarrollo.shell";

const ROOT_DIR = path.resolve(__dirname, "..");
const ELECTRON_DIR = path.resolve(__dirname, ".");
const PRELOAD_PATH = path.join(ELECTRON_DIR, "preload.js");
const INDEX_PATH = path.join(ROOT_DIR, "index.html");

let mainWindow = null;
let isQuitting = false;
let ipcRegistered = false;

function nowISO() {
  return new Date().toISOString();
}

function safeMessage(error) {
  if (!error) return "Error desconocido.";
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  return String(error);
}

function getIconPath() {
  const candidates = [
    path.join(ROOT_DIR, "app", "assets", "app-icon.ico"),
    path.join(ROOT_DIR, "app", "assets", "app-icon.png"),
    path.join(ROOT_DIR, "eventos", "src", "assets", "app-icon.ico"),
    path.join(ROOT_DIR, "eventos", "src", "assets", "app-icon.png"),
    path.join(ROOT_DIR, "incorporaciones", "sedes", "assets", "Logo.png")
  ];

  return candidates.find((candidate) => {
    try {
      return fs.existsSync(candidate);
    } catch (_error) {
      return false;
    }
  }) || null;
}

function getNativeIcon() {
  const iconPath = getIconPath();
  if (!iconPath) return null;

  try {
    const icon = nativeImage.createFromPath(iconPath);
    if (!icon || icon.isEmpty()) return null;
    return icon;
  } catch (_error) {
    return null;
  }
}

function showDesktopNotification(payload = {}) {
  if (!Notification.isSupported()) {
    return {
      ok: false,
      message: "Las notificaciones de escritorio no están soportadas en este sistema."
    };
  }

  const icon = getNativeIcon();
  const notification = new Notification({
    title: payload.title || APP_NAME,
    body: payload.body || "Tienes una notificación pendiente.",
    silent: Boolean(payload.silent),
    ...(icon ? { icon } : {})
  });

  notification.on("click", () => {
    showMainWindow();
  });

  notification.show();

  return {
    ok: true,
    message: "Notificación enviada."
  };
}

async function quitCompletely() {
  if (isQuitting) {
    return;
  }

  isQuitting = true;

  try {
    await stopEventosBackground();
  } catch (_error) {
    // Aunque Eventos no responda, la app debe cerrarse.
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy();
  }

  app.quit();
}

function createMainWindow() {
  const icon = getNativeIcon();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 720,
    show: false,
    backgroundColor: "#f4f6fb",
    autoHideMenuBar: false,
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      sandbox: false,
      nodeIntegration: false,
      webSecurity: false
    }
  });

  mainWindow.once("ready-to-show", function onReady() {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    mainWindow.show();
    mainWindow.focus();
  });

  /*
    Corrección:
    Antes la X no cerraba la app. Se cancelaba el cierre, se ocultaba la ventana
    y Eventos quedaba trabajando en segundo plano.

    Ahora la X cierra completamente:
    - detiene Eventos
    - destruye la ventana principal
    - sale de Electron
  */
  mainWindow.on("close", function onClose(event) {
    if (isQuitting) return;

    event.preventDefault();

    quitCompletely().catch(() => {
      isQuitting = true;
      app.quit();
    });
  });

  mainWindow.on("closed", function onClosed() {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(function onWindowOpen(details) {
    const url = String(details && details.url ? details.url : "").trim();

    if (url) {
      shell.openExternal(url).catch(() => null);
    }

    return { action: "deny" };
  });

  mainWindow.loadFile(INDEX_PATH);
  bindUpdaterWindow(mainWindow);

  return mainWindow;
}

function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return createMainWindow();
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();

  return mainWindow;
}

function configureLoginAtStartup() {
  /*
    Corrección:
    Antes la app se registraba para iniciar con Windows en modo oculto.

    Ahora:
    - se desactiva openAtLogin
    - se elimina la entrada "Desarrollo" del registro de Windows si existe
  */
  try {
    if (process.platform === "win32" || process.platform === "darwin") {
      app.setLoginItemSettings({
        openAtLogin: false,
        openAsHidden: false,
        name: APP_NAME
      });
    }
  } catch (_error) {
    // No se detiene la app si el sistema no permite modificar el inicio automático.
  }

  if (process.platform === "win32") {
    try {
      execFileSync(
        "reg",
        [
          "delete",
          "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
          "/v",
          APP_NAME,
          "/f"
        ],
        {
          windowsHide: true,
          stdio: "ignore"
        }
      );
    } catch (_error) {
      // Si la entrada no existe, no hay nada que eliminar.
    }
  }
}

function walkFolder(folderPath, options = {}) {
  const root = path.resolve(folderPath);
  const maxFiles = Number.isFinite(Number(options.maxFiles)) ? Number(options.maxFiles) : 3000;
  const allowedExt = Array.isArray(options.extensions)
    ? options.extensions.map((ext) => String(ext).toLowerCase())
    : [".html", ".js", ".css", ".json", ".txt", ".md"];

  const excludedFolders = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    "txt_convertidos"
  ]);

  const results = [];

  function scan(currentPath) {
    if (results.length >= maxFiles) return;

    let entries = [];

    try {
      entries = fs.readdirSync(currentPath, { withFileTypes: true });
    } catch (_error) {
      return;
    }

    entries.forEach((entry) => {
      if (results.length >= maxFiles) return;

      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(root, fullPath);

      if (entry.isDirectory()) {
        if (excludedFolders.has(entry.name)) return;
        scan(fullPath);
        return;
      }

      if (!entry.isFile()) return;

      const ext = path.extname(entry.name).toLowerCase();
      if (allowedExt.length && !allowedExt.includes(ext)) return;

      let stat = null;

      try {
        stat = fs.statSync(fullPath);
      } catch (_error) {
        stat = null;
      }

      results.push({
        name: entry.name,
        path: fullPath,
        relativePath,
        ext,
        size: stat ? stat.size : 0,
        modifiedAt: stat ? stat.mtime.toISOString() : null
      });
    });
  }

  scan(root);
  return results;
}

function registerIpcHandlers() {
  if (ipcRegistered) return;
  ipcRegistered = true;

  registerEventosBackgroundIpc();

  ipcMain.handle("host:info", async () => {
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
      electronDir: ELECTRON_DIR,
      appVersion: app.getVersion(),
      eventosBackground: getEventosBackgroundStatus()
    };
  });

  ipcMain.handle("desktop:notify", async (_event, payload) => {
    return showDesktopNotification(payload);
  });

  ipcMain.handle("shell:openPath", async (_event, targetPath) => {
    try {
      const rawPath = String(targetPath || "").trim();

      if (!rawPath) {
        return { ok: false, message: "No se recibió una ruta." };
      }

      if (/^https?:\/\//i.test(rawPath)) {
        await shell.openExternal(rawPath);
      } else {
        await shell.openPath(rawPath);
      }

      return { ok: true, message: "Ruta abierta." };
    } catch (error) {
      return { ok: false, message: safeMessage(error) };
    }
  });

  ipcMain.handle("shell:revealPath", async (_event, targetPath) => {
    try {
      const rawPath = String(targetPath || "").trim();

      if (!rawPath) {
        return { ok: false, message: "No se recibió una ruta." };
      }

      shell.showItemInFolder(rawPath);

      return { ok: true, message: "Ruta mostrada en carpeta." };
    } catch (error) {
      return { ok: false, message: safeMessage(error) };
    }
  });

  ipcMain.handle("shell:chooseFolder", async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "Seleccionar carpeta",
        properties: ["openDirectory"]
      });

      if (result.canceled || !result.filePaths.length) {
        return {
          ok: false,
          canceled: true,
          path: "",
          message: "Selección cancelada."
        };
      }

      return {
        ok: true,
        canceled: false,
        path: result.filePaths[0],
        message: "Carpeta seleccionada."
      };
    } catch (error) {
      return { ok: false, message: safeMessage(error) };
    }
  });

  ipcMain.handle("scan:pick-folder", async (_event, payload = {}) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        title: "Seleccionar carpeta para escanear",
        defaultPath: payload.initialPath || ROOT_DIR,
        properties: ["openDirectory"]
      });

      if (result.canceled || !result.filePaths.length) {
        return {
          ok: false,
          canceled: true,
          path: "",
          message: "Selección cancelada."
        };
      }

      return {
        ok: true,
        canceled: false,
        path: result.filePaths[0],
        message: "Carpeta seleccionada."
      };
    } catch (error) {
      return { ok: false, message: safeMessage(error) };
    }
  });

  ipcMain.handle("scan:run", async (_event, payload = {}) => {
    try {
      const folderPath = String(payload.folderPath || payload.path || "").trim();

      if (!folderPath) {
        return { ok: false, message: "No se recibió carpeta para escanear." };
      }

      if (!fs.existsSync(folderPath)) {
        return { ok: false, message: "La carpeta indicada no existe." };
      }

      const files = walkFolder(folderPath, payload);

      return {
        ok: true,
        root: path.resolve(folderPath),
        total: files.length,
        files,
        generatedAt: nowISO()
      };
    } catch (error) {
      return { ok: false, message: safeMessage(error) };
    }
  });

  ipcMain.handle("files:saveText", async (_event, payload = {}) => {
    try {
      const filePath = String(payload.path || "").trim();
      const content = String(payload.content || "");

      if (!filePath) {
        return { ok: false, message: "No se recibió ruta para guardar." };
      }

      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, content, "utf8");

      return {
        ok: true,
        path: filePath,
        message: "Archivo guardado."
      };
    } catch (error) {
      return { ok: false, message: safeMessage(error) };
    }
  });

  ipcMain.handle("files:saveJson", async (_event, payload = {}) => {
    try {
      const filePath = String(payload.path || "").trim();
      const data = payload.data == null ? {} : payload.data;

      if (!filePath) {
        return { ok: false, message: "No se recibió ruta para guardar JSON." };
      }

      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");

      return {
        ok: true,
        path: filePath,
        message: "JSON guardado."
      };
    } catch (error) {
      return { ok: false, message: safeMessage(error) };
    }
  });

  ipcMain.handle("pdf:export", async (_event, payload = {}) => {
    try {
      if (!mainWindow || mainWindow.isDestroyed()) {
        return {
          ok: false,
          message: "No existe ventana activa para exportar PDF."
        };
      }

      const filePath = String(payload.path || "").trim();
      const pdfBuffer = await mainWindow.webContents.printToPDF({
        printBackground: true,
        landscape: Boolean(payload.landscape),
        pageSize: payload.pageSize || "A4"
      });

      if (filePath) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, pdfBuffer);

        return {
          ok: true,
          path: filePath,
          message: "PDF exportado."
        };
      }

      return {
        ok: true,
        buffer: pdfBuffer,
        message: "PDF generado."
      };
    } catch (error) {
      return { ok: false, message: safeMessage(error) };
    }
  });

  ipcMain.handle("updates:state", async () => {
    return getUpdateState();
  });

  ipcMain.handle("updates:check", async () => {
    return checkForAppUpdates();
  });

  ipcMain.handle("updates:download", async () => {
    return downloadAppUpdate();
  });

  ipcMain.handle("updates:install", async () => {
    isQuitting = true;

    try {
      await stopEventosBackground();
    } catch (_error) {
      // La actualización debe continuar aunque Eventos no responda.
    }

    return installDownloadedUpdate();
  });
}

async function boot() {
  app.setName(APP_NAME);

  if (process.platform === "win32") {
    app.setAppUserModelId(APP_ID);
  }

  configureLoginAtStartup();
  registerIpcHandlers();

  setupUpdater({
    app,
    mainWindowGetter: () => mainWindow
  });

  createMainWindow();

  app.on("activate", () => {
    if (!isQuitting) {
      showMainWindow();
    }
  });
}

app.whenReady().then(boot);

app.on("before-quit", async () => {
  isQuitting = true;

  try {
    await stopEventosBackground();
  } catch (_error) {
    // No se bloquea el cierre si Eventos ya estaba detenido.
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    isQuitting = true;
    app.quit();
  }
});