/*
  Nombre completo: ta-titulo-articulo-preload.js
  Ruta o ubicación: /Requisitos/Titulos/electron/ta-titulo-articulo-preload.js
  Función o funciones:
  - Exponer un puente seguro entre la pantalla web y el proceso principal de Electron.
  - Permitir generar sugerencias con Gemini sin exponer GEMINI_API_KEY al navegador.
  Se conecta con:
  - Requisitos/Titulos/electron/ta-titulo-articulo-main.js
  - Requisitos/Titulos/src/services/ta-titulo-articulo-gemini-client.service.js
*/

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("taTituloArticuloElectron", {
  generarSugerenciasTitulo(payload) {
    return ipcRenderer.invoke("ta-titulo-articulo:gemini:generar-sugerencias", payload);
  }
});
