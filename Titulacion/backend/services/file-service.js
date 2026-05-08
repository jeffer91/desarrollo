/* =========================================================
Nombre completo: file-service.js
Ruta: /Titulacion/backend/services/file-service.js
Función o funciones:
- Centralizar lectura y escritura de archivos JSON del módulo Titulación.
- Guardar datos persistentes en la carpeta userData de Electron.
- Leer datos guardados sin romper la app si el archivo no existe.
- Crear carpetas necesarias antes de guardar.
========================================================= */

const fs = require("fs");
const path = require("path");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getDefaultStoragePath(app) {
  return path.join(app.getPath("userData"), "titulacion-data.json");
}

function safeJsonParse(raw, fallback = null) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function saveJson(filePath, payload) {
  try {
    const targetPath = String(filePath || "").trim();

    if (!targetPath) {
      return {
        ok: false,
        error: "No se recibió ruta para guardar el archivo JSON."
      };
    }

    ensureDir(path.dirname(targetPath));

    fs.writeFileSync(
      targetPath,
      JSON.stringify(payload || {}, null, 2),
      "utf8"
    );

    return {
      ok: true,
      path: targetPath
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message || String(error)
    };
  }
}

function readJson(filePath) {
  try {
    const targetPath = String(filePath || "").trim();

    if (!targetPath) {
      return {
        ok: false,
        error: "No se recibió ruta para leer el archivo JSON.",
        data: null
      };
    }

    if (!fs.existsSync(targetPath)) {
      return {
        ok: true,
        exists: false,
        path: targetPath,
        data: null
      };
    }

    const raw = fs.readFileSync(targetPath, "utf8");

    return {
      ok: true,
      exists: true,
      path: targetPath,
      data: safeJsonParse(raw, null)
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message || String(error),
      data: null
    };
  }
}

function deleteFile(filePath) {
  try {
    const targetPath = String(filePath || "").trim();

    if (!targetPath) {
      return {
        ok: false,
        error: "No se recibió ruta para eliminar."
      };
    }

    if (!fs.existsSync(targetPath)) {
      return {
        ok: true,
        deleted: false,
        path: targetPath
      };
    }

    fs.unlinkSync(targetPath);

    return {
      ok: true,
      deleted: true,
      path: targetPath
    };
  } catch (error) {
    return {
      ok: false,
      error: error.message || String(error)
    };
  }
}

module.exports = {
  ensureDir,
  getDefaultStoragePath,
  safeJsonParse,
  saveJson,
  readJson,
  deleteFile
};