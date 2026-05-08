/* =========================================================
Nombre completo: pdf-service.js
Ruta: /Titulacion/backend/services/pdf-service.js
Función o funciones:
- Exportar la ventana activa de Electron como PDF.
- Abrir cuadro de diálogo para elegir ubicación de guardado.
- Usar printToPDF con formato A4 y fondo activado.
- Devolver resultado controlado al renderer.
========================================================= */

const fs = require("fs");
const path = require("path");
const { BrowserWindow, dialog } = require("electron");

function sanitizePdfName(value) {
  const name = String(value || "informe-final-titulacion.pdf")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  return name.toLowerCase().endsWith(".pdf") ? name : `${name}.pdf`;
}

function getActiveWindow(fallbackWindow) {
  return BrowserWindow.getFocusedWindow() || fallbackWindow || null;
}

async function exportCurrentWindowToPdf(fallbackWindow, options = {}) {
  try {
    const win = getActiveWindow(fallbackWindow);

    if (!win) {
      return {
        ok: false,
        error: "No existe ventana activa para exportar."
      };
    }

    const defaultPath = sanitizePdfName(
      options.defaultPath || "informe-final-titulacion.pdf"
    );

    const result = await dialog.showSaveDialog(win, {
      title: "Guardar informe de titulación",
      defaultPath,
      filters: [
        {
          name: "PDF",
          extensions: ["pdf"]
        }
      ]
    });

    if (result.canceled || !result.filePath) {
      return {
        ok: false,
        canceled: true
      };
    }

    const pdfBuffer = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: "A4",
      landscape: false,
      marginsType: 0,
      ...(options.printOptions || {})
    });

    fs.mkdirSync(path.dirname(result.filePath), { recursive: true });
    fs.writeFileSync(result.filePath, pdfBuffer);

    return {
      ok: true,
      filePath: result.filePath
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message || String(error)
    };
  }
}

module.exports = {
  sanitizePdfName,
  getActiveWindow,
  exportCurrentWindowToPdf
};