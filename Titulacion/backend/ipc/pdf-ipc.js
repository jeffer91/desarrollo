/* =========================================================
Nombre completo: pdf-ipc.js
Ruta: /Titulacion/backend/ipc/pdf-ipc.js
Función o funciones:
- Registrar canales IPC para exportación PDF.
- Conectar el renderer con pdf-service.
- Mantener electron-main.js como orquestador limpio.
========================================================= */

const pdfService = require("../services/pdf-service");

function registerPdfIpc(ipcMain, getMainWindow) {
  if (!ipcMain || typeof getMainWindow !== "function") {
    throw new Error("registerPdfIpc requiere ipcMain y getMainWindow.");
  }

  ipcMain.handle("titulacion:pdf:export-current-window", async function (_event, options) {
    return pdfService.exportCurrentWindowToPdf(getMainWindow(), options || {});
  });
}

module.exports = {
  registerPdfIpc
};