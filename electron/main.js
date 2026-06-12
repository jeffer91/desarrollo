/*
=========================================================
Nombre completo: main.js
Ruta o ubicación: /desarrollo/electron/main.js

Función o funciones:
1. Iniciar la app grande Desarrollo.
2. Cargar /desarrollo/index.html.
3. Mantener la app viva en segundo plano al cerrar con X.
4. Iniciar solamente el motor oculto de Eventos.
5. Crear bandeja de Windows.
6. Activar inicio automático con Windows.
7. Registrar IPC de host, shell, scan, PDF, actualizaciones y Eventos.
8. Evitar Render para recordatorios.

Con qué se comunica:
- /desarrollo/index.html
- /desarrollo/electron/preload.js
- /desarrollo/electron/updater.js
- /desarrollo/electron/eventos-background-manager.js
- /desarrollo/eventos/background.html

Qué aporta:
Convierte la app grande en una app que puede permanecer viva, pero solo con Eventos
trabajando en segundo plano.
=========================================================
*/

"use strict";

const fs = require("fs");
const path = require("path");
const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  dialog,
  Tray,
  Menu,
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
  startEventosBackground,
  stopEventosBackground,
  getEventosBackgroundStatus,
  restartEventosBackground
} = require("./eventos-background-manager");

const APP_NAME = "Desarrollo";
const APP_ID = "com.jeff.desarrollo.shell";

const ROOT_DIR = path.resolve(__dirname, "..");
const ELECTRON_DIR = path.resolve(__dirname, ".");
const PRELOAD_PATH = path.join(ELECTRON_DIR, "preload.js");
const INDEX_PATH = path.join(ROOT_DIR, "index.html");

let mainWindow = null;
let tray = null;
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
    if (!mainWindow) return;
    mainWindow.show();
  });

  mainWindow.on("close", function onClose(event) {
    if (isQuitting) return;

    event.preventDefault();
    mainWindow.hide();

    showDesktopNotification({
      title: "Desarrollo sigue activo",
      body: "Eventos quedó funcionando en segundo plano para mantener tus recordatorios.",
      silent: true
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

function createTray() {
  if (tray) return;

  const icon = getNativeIcon();
  if (!icon) return;

  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip("Desarrollo - Eventos activos");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Abrir Desarrollo",
      click: () => {
        showMainWindow();
      }
    },
    {
      label: "Estado de Eventos",
      click: () => {
        const status = getEventosBackgroundStatus();
        showDesktopNotification({
          title: "Motor de Eventos",
          body: status.running
            ? "Eventos está activo en segundo plano."
            : "Eventos no está activo.",
          silent: false
        });
      }
    },
    {
      label: "Reiniciar motor de Eventos",
      click: () => {
        restartEventosBackground({ reason: "tray-restart" }).catch(() => null);
      }
    },
    {
      type: "separator"
    },
    {
      label: "Salir completamente",
      click: async () => {
        isQuitting = true;
        await stopEventosBackground();
        app.quit();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => {
    showMainWindow();
  });
}

function configureLoginAtStartup() {
  try {
    if (process.platform !== "win32" && process.platform !== "darwin") {
      return;
    }

    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true,
      name: APP_NAME
    });
  } catch (_error) {
    // No se detiene la app si Windows no permite registrar inicio automático.
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
        return { ok: false, canceled: true, path: "", message: "Selección cancelada." };
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
        return { ok: false, canceled: true, path: "", message: "Selección cancelada." };
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

      return { ok: true, path: filePath, message: "Archivo guardado." };
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

      return { ok: true, path: filePath, message: "JSON guardado." };
    } catch (error) {
      return { ok: false, message: safeMessage(error) };
    }
  });

  ipcMain.handle("pdf:export", async (_event, payload = {}) => {
    try {
      if (!mainWindow || mainWindow.isDestroyed()) {
        return { ok: false, message: "No existe ventana activa para exportar PDF." };
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
        return { ok: true, path: filePath, message: "PDF exportado." };
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
  createTray();

  await startEventosBackground({
    reason: "app-boot"
  });

  app.on("activate", () => {
    showMainWindow();
  });
}

app.whenReady().then(boot);

app.on("before-quit", async () => {
  isQuitting = true;
  await stopEventosBackground();
});

app.on("window-all-closed", () => {
  if (process.platform === "darwin") {
    return;
  }

  if (!isQuitting) {
    return;
  }

  app.quit();
});