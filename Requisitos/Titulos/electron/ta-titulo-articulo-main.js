/*
  Nombre completo: ta-titulo-articulo-main.js
  Ruta o ubicación: /Requisitos/Titulos/electron/ta-titulo-articulo-main.js
  Función o funciones:
  - Abrir las pantallas estudiante, coordinador o administrador en Electron.
  - Mantener una ventana simple para pruebas de escritorio.
  - Forzar el origen de datos local a Firebase directo.
  - Cargar HTML local sin depender primero de Netlify.
  - Bloquear navegación externa dentro de la ventana.
  - Cargar normalización visual de períodos en el administrador Electron.
  - Conectar Gemini por IPC seguro sin exponer GEMINI_API_KEY al navegador.
  - Devolver errores indicando el archivo responsable.
  Se conecta con:
  - Requisitos/Titulos/package.json
  - Requisitos/Titulos/public/ta-titulo-articulo-estudiante.html
  - Requisitos/Titulos/public/ta-titulo-articulo-coordinador.html
  - Requisitos/Titulos/electron/admin/ta-titulo-articulo-administrador.html
  - Requisitos/Titulos/electron/ta-titulo-articulo-preload.cjs
  - Requisitos/Titulos/electron/ta-titulo-articulo-gemini.service.js
*/

import { app, BrowserWindow, shell, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { generarSugerenciasTituloElectron } from "./ta-titulo-articulo-gemini.service.js";

const FILE_PATH = "Requisitos/Titulos/electron/ta-titulo-articulo-main.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, "..");
const PRELOAD_FILE = join(__dirname, "ta-titulo-articulo-preload.cjs");

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

function errorPayload(error) {
  const detalle = error?.message || "Gemini no pudo generar sugerencias en Electron.";
  return {
    ok: false,
    origen: "gemini-electron-error",
    bloqueado: true,
    archivo: FILE_PATH,
    motivo: `[Archivo: ${FILE_PATH}] ${detalle}`,
    error: `[Archivo: ${FILE_PATH}] ${detalle}`
  };
}

function registrarCanalesElectron() {
  ipcMain.handle("ta-titulo-articulo:gemini:generar-sugerencias", async (_event, payload) => {
    try {
      return await generarSugerenciasTituloElectron(payload, ROOT_DIR);
    } catch (error) {
      console.error(`[${FILE_PATH}]`, error);
      return errorPayload(error);
    }
  });
}

function cargarComplementosAdmin(win, screenName) {
  if (screenName !== "admin") return;
  win.webContents.once("did-finish-load", () => {
    win.webContents.executeJavaScript(
      'import("../../src/admin/ta-titulo-articulo-admin-periodos-normalizados.app.js").catch((error) => console.error("[Títulos admin períodos]", error));'
    ).catch((error) => {
      console.warn(`[Títulos Electron] No se pudo cargar normalizador de períodos: ${error.message}`);
    });
  });
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
      preload: PRELOAD_FILE,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true
    }
  });

  win.removeMenu();

  win.once("ready-to-show", () => {
    win.show();
    if (IS_DEV) win.webContents.openDevTools({ mode: "detach" });
  });

  win.webContents.on("preload-error", (_event, preloadPath, error) => {
    console.error(`[${FILE_PATH}] Error cargando preload ${preloadPath}:`, error);
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

  cargarComplementosAdmin(win, screenName);

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
  registrarCanalesElectron();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
