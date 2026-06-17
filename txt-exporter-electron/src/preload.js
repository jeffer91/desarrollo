/**
 * ARCHIVO: preload.js
 * RUTA: src/preload.js
 * FUNCIÓN (FUERA DEL CÓDIGO):
 * - Puente seguro entre Renderer y Main (IPC).
 * - Expone métodos controlados en window.api.
 * - Valida callbacks y devuelve funciones para desuscribirse de eventos.
 */

const { contextBridge, ipcRenderer } = require("electron");

function safeOn(channel, cb) {
  if (typeof cb !== "function") {
    throw new TypeError(`El callback para "${channel}" debe ser una función.`);
  }

  const handler = (_event, payload) => {
    cb(payload);
  };

  ipcRenderer.on(channel, handler);

  return () => {
    ipcRenderer.removeListener(channel, handler);
  };
}

contextBridge.exposeInMainWorld("api", {
  selectRoot: () => ipcRenderer.invoke("ui:selectRoot"),

  scanRoot: (rootPath) =>
    ipcRenderer.invoke("ui:scanRoot", { rootPath }),

  exportTxt: () =>
    ipcRenderer.invoke("ui:exportTxt"),

  exportPdf: () =>
    ipcRenderer.invoke("ui:exportPdf"),

  openPath: (targetPath) =>
    ipcRenderer.invoke("ui:openPath", { path: targetPath }),

  onScanProgress: (cb) =>
    safeOn("ui:scanProgress", cb),

  onNotify: (cb) =>
    safeOn("ui:notify", cb)
});