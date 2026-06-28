/*
  Nombre completo: ta-titulo-articulo-main.js
  Ruta o ubicación: /Requisitos/Titulos/electron/ta-titulo-articulo-main.js
  Función o funciones:
  - Abrir las pantallas estudiante, coordinador o administrador en Electron.
  - Mantener una ventana simple para pruebas de escritorio.
  - Forzar el origen de datos local a Firebase directo.
  - Cargar HTML local sin depender primero de Netlify.
  - Bloquear navegación externa dentro de la ventana.
  Se conecta con:
  - Requisitos/Titulos/package.json
  - Requisitos/Titulos/public/ta-titulo-articulo-estudiante.html
  - Requisitos/Titulos/public/ta-titulo-articulo-coordinador.html
  - Requisitos/Titulos/electron/admin/ta-titulo-articulo-administrador.html
*/

import { app, BrowserWindow, shell } from "electron";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "..");

const SCREENS = Object.freeze({
  estudiante: {
    title: "Títulos de artículos académicos - Estudiante",
    html: join(ROOT_DIR, "public", "ta-titulo-articulo-estudiante.html"),
    width: 1180,
    height: 820,
    minWidth: 980,
    minHeight: 680,
    runtime: "electron-estudiante"
  },
  coordinador: {
    title: "Títulos de artículos académicos - Coordinador",
    html: join(ROOT_DIR, "public", "ta-titulo-articulo-coordinador.html"),
    width: 1280,
    height: 840,
    minWidth: 1050,
    minHeight: 700,
    runtime: "electron-coordinador"
  },
  admin: {
    title: "Títulos de artículos académicos - Administrador",
    html: join(__dirname, "admin", "ta-titulo-articulo-administrador.html"),
    width: 1380,
    height: 860,
    minWidth: 1100,
    minHeight: 720,
    runtime: "electron-admin"
  }
});

const IS_DEV = process.env.NODE_ENV === "development" || process.argv.includes("--dev");

function getArgValue(name) {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : "";
}

function detectarPantalla() {
  const screenArg = getArgValue("screen") || getArgValue("pantalla");
  if (SCREENS[screenArg]) return screenArg;
  if (process.argv.includes("--estudiante")) return "estudiante";
  if (process.argv.includes("--coordinador")) return "coordinador";
  if (process.argv.includes("--admin")) return "admin";
  return "admin";
}

function createWindow() {
  const screenName = detectarPantalla();
  const screen = SCREENS[screenName] || SCREENS.admin;

  const win = new BrowserWindow({
    width: screen.width,
    height: screen.height,
    minWidth: screen.minWidth,
    minHeight: screen.minHeight,
    title: screen.title,
    backgroundColor: "#f6f7fb",
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

  win.loadFile(screen.html, {
    query: {
      taDataMode: "firebase-direct",
      taRuntime: screen.runtime,
      taScreen: screenName
    }
  });
}

app.setName("Títulos Académicos");

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
