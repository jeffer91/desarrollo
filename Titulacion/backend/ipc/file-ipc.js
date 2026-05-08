/* =========================================================
Nombre completo: file-ipc.js
Ruta: /Titulacion/backend/ipc/file-ipc.js
Función o funciones:
- Registrar canales IPC relacionados con archivos.
- Guardar JSON institucional del módulo Titulación.
- Leer JSON persistente desde userData.
- Eliminar archivo local de datos cuando sea necesario.
========================================================= */

const fileService = require("../services/file-service");

function registerFileIpc(ipcMain, app) {
  if (!ipcMain || !app) {
    throw new Error("registerFileIpc requiere ipcMain y app.");
  }

  ipcMain.handle("titulacion:file:save-json", async function (_event, payload) {
    const filePath = fileService.getDefaultStoragePath(app);
    return fileService.saveJson(filePath, payload || {});
  });

  ipcMain.handle("titulacion:file:read-json", async function () {
    const filePath = fileService.getDefaultStoragePath(app);
    return fileService.readJson(filePath);
  });

  ipcMain.handle("titulacion:file:delete-json", async function () {
    const filePath = fileService.getDefaultStoragePath(app);
    return fileService.deleteFile(filePath);
  });
}

module.exports = {
  registerFileIpc
};