/*
  Nombre completo: ta-titulo-articulo-preload.cjs
  Ruta o ubicación: /Requisitos/Titulos/electron/ta-titulo-articulo-preload.cjs
  Función o funciones:
  - Exponer un puente seguro entre la pantalla web y el proceso principal de Electron.
  - Permitir generar sugerencias con Gemini sin exponer GEMINI_API_KEY al navegador.
  - Funcionar correctamente en un proyecto con package.json type=module.
  Se conecta con:
  - Requisitos/Titulos/electron/ta-titulo-articulo-main.js
  - Requisitos/Titulos/src/services/ta-titulo-articulo-gemini-client.service.js
*/

const { contextBridge, ipcRenderer } = require("electron");

const FILE_PATH = "Requisitos/Titulos/electron/ta-titulo-articulo-preload.cjs";

contextBridge.exposeInMainWorld("taTituloArticuloElectron", {
  origen: "electron-preload",
  archivo: FILE_PATH,
  generarSugerenciasTitulo(payload) {
    return ipcRenderer.invoke("ta-titulo-articulo:gemini:generar-sugerencias", payload);
  }
});
