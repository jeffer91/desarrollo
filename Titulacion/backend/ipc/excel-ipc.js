/* =========================================================
Nombre completo: excel-ipc.js
Ruta: /Titulacion/backend/ipc/excel-ipc.js
Función o funciones:
- Registrar canales IPC relacionados con Excel/CSV.
- Validar archivos de importación desde Electron.
- Leer información básica del archivo si se requiere en backend.
========================================================= */

const excelService = require("../services/excel-service");

function registerExcelIpc(ipcMain) {
  if (!ipcMain) {
    throw new Error("registerExcelIpc requiere ipcMain.");
  }

  ipcMain.handle("titulacion:excel:file-info", async function (_event, filePath) {
    return excelService.readFileInfo(filePath);
  });

  ipcMain.handle("titulacion:excel:read-text", async function (_event, filePath) {
    return excelService.readFileAsText(filePath);
  });

  ipcMain.handle("titulacion:excel:read-buffer-info", async function (_event, filePath) {
    const result = excelService.readFileAsBuffer(filePath);

    if (!result.ok) {
      return result;
    }

    return {
      ok: true,
      info: result.info,
      bufferLength: result.buffer.length
    };
  });
}

module.exports = {
  registerExcelIpc
};