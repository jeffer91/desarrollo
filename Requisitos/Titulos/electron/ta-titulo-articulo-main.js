/*
  Nombre completo: ta-titulo-articulo-main.js
  Ruta o ubicación: /Requisitos/Titulos/electron/ta-titulo-articulo-main.js
  Función o funciones:
  - Abrir el panel local del administrador en Electron.
  - Mantener una ventana simple para pruebas de escritorio.
  - Cargar la pantalla HTML de administración sin exponer credenciales en el frontend.
  Se conecta con:
  - Requisitos/Titulos/package.json
  - Requisitos/Titulos/electron/admin/ta-titulo-articulo-administrador.html
*/

import { app, BrowserWindow } from "electron";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function createWindow() {
  const win = new BrowserWindow({
    width: 1380,
    height: 860,
    minWidth: 1100,
    minHeight: 720,
    title: "Títulos de artículos académicos - Administrador",
    backgroundColor: "#071527",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  win.removeMenu();
  win.loadFile(join(__dirname, "admin", "ta-titulo-articulo-administrador.html"));
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
