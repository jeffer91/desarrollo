/* =========================================================
Nombre completo: excel-service.js
Ruta: /Titulacion/backend/services/excel-service.js
Función o funciones:
- Proveer utilidades backend para archivos Excel/CSV.
- Validar extensiones permitidas.
- Leer archivos como buffer o texto cuando Electron lo requiera.
- Mantener respaldo backend aunque la importación principal se haga en frontend.
========================================================= */

const fs = require("fs");
const path = require("path");

const ALLOWED_EXTENSIONS = [".xlsx", ".xls", ".xlsm", ".csv", ".txt"];

function getExtension(filePath) {
  return path.extname(String(filePath || "")).toLowerCase();
}

function isAllowedExcelFile(filePath) {
  return ALLOWED_EXTENSIONS.includes(getExtension(filePath));
}

function readFileInfo(filePath) {
  try {
    const targetPath = String(filePath || "").trim();

    if (!targetPath) {
      return {
        ok: false,
        error: "No se recibió ruta de archivo."
      };
    }

    if (!fs.existsSync(targetPath)) {
      return {
        ok: false,
        error: "El archivo no existe.",
        path: targetPath
      };
    }

    const stats = fs.statSync(targetPath);

    return {
      ok: true,
      path: targetPath,
      name: path.basename(targetPath),
      extension: getExtension(targetPath),
      size: stats.size,
      allowed: isAllowedExcelFile(targetPath)
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message || String(error)
    };
  }
}

function readFileAsBuffer(filePath) {
  try {
    const info = readFileInfo(filePath);

    if (!info.ok) {
      return info;
    }

    if (!info.allowed) {
      return {
        ok: false,
        error: "Formato no permitido. Use .xlsx, .xls, .xlsm, .csv o .txt.",
        path: info.path
      };
    }

    return {
      ok: true,
      info,
      buffer: fs.readFileSync(info.path)
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message || String(error)
    };
  }
}

function readFileAsText(filePath) {
  try {
    const info = readFileInfo(filePath);

    if (!info.ok) {
      return info;
    }

    if (!info.allowed) {
      return {
        ok: false,
        error: "Formato no permitido. Use .xlsx, .xls, .xlsm, .csv o .txt.",
        path: info.path
      };
    }

    return {
      ok: true,
      info,
      text: fs.readFileSync(info.path, "utf8")
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message || String(error)
    };
  }
}

module.exports = {
  ALLOWED_EXTENSIONS,
  getExtension,
  isAllowedExcelFile,
  readFileInfo,
  readFileAsBuffer,
  readFileAsText
};