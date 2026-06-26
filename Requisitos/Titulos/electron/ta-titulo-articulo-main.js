/*
  Nombre completo: ta-titulo-articulo-main.js
  Ruta o ubicación: /Requisitos/Titulos/electron/ta-titulo-articulo-main.js
  Función o funciones:
  - Abrir el panel local del administrador en Electron.
  - Mantener una ventana simple para pruebas de escritorio.
  - Forzar el origen de datos local a Firebase directo.
  - Cargar la pantalla HTML de administración sin depender primero de Netlify.
  - Bloquear navegación externa dentro de la ventana administrativa.
  Se conecta con:
  - Requisitos/Titulos/package.json
  - Requisitos/Titulos/electron/admin/ta-titulo-articulo-administrador.html
  - Requisitos/Titulos/src/admin/ta-titulo-articulo-admin.app.js
*/

import { app, BrowserWindow, shell } from "electron";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ADMIN_HTML = join(__dirname, "admin", "ta-titulo-articulo-administrador.html");
const IS_DEV = process.env.NODE_ENV === "development" || process.argv.includes("--dev");

function createWindow() {
  const win = new BrowserWindow({
    width: 1380,
    height: 860,
    minWidth: 1100,
    minHeight: 720,
    title: "Títulos de artículos académicos - Administrador",
    backgroundColor: "#071527",
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });

  win.removeMenu();

  win.once("ready-to-show", () => {
    win.show();
    if (IS_DEV) win.webContents.openDevTools({ mode: "detach" });
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, url) => {
    if (!url.startsWith("file://")) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  win.loadFile(ADMIN_HTML, {
    query: {
      taDataMode: "firebase-direct",
      taRuntime: "electron"
    }
  });
}

app.setName("Títulos Académicos - Administrador");

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
