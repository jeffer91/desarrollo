/* =========================================================
Nombre completo: generador-libro.storage.js
Ruta o ubicación: /desarrollo/libro/generador-libro/generador-libro.storage.js
Función o funciones:
1. Leer materias consolidadas guardadas por el Bloque 8 desde localStorage.
2. Cargar materias desde archivos JSON externos.
3. Exportar el libro generado en TXT y JSON.
4. Usar window.api.files.saveText/saveJson cuando esté disponible en Electron.
5. Descargar archivos como respaldo cuando no exista API de escritorio.
========================================================= */

(function attachGeneradorLibroStorage(window, document) {
  "use strict";

  var STORAGE_KEY = "libro.cargaMateria.materias";

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalize(value) {
    return text(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 90) || "libro";
  }

  function readIndex() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function readSavedById(idLocal) {
    var id = text(idLocal);

    if (!id) return null;

    try {
      var raw = window.localStorage.getItem(STORAGE_KEY + "." + id);
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  }

  function extractMateria(payload) {
    if (!payload) return null;
    if (payload.materiaConsolidada) return payload.materiaConsolidada;
    if (payload.expediente && payload.expediente.materiaConsolidada) return payload.expediente.materiaConsolidada;
    if (payload.modulo === "libro" && payload.unidades) return payload;

    return null;
  }

  function readFileAsText(file) {
    return new Promise(function promiseRead(resolve, reject) {
      var reader = new FileReader();

      reader.onload = function onLoad(event) {
        resolve(String(event.target.result || ""));
      };
      reader.onerror = function onError() {
        reject(new Error("No se pudo leer el archivo JSON."));
      };

      reader.readAsText(file, "utf-8");
    });
  }

  async function loadJsonFile(file) {
    var raw = await readFileAsText(file);
    var payload = JSON.parse(raw);
    var materia = extractMateria(payload);

    if (!materia) {
      throw new Error("El JSON no contiene una materia consolidada válida.");
    }

    return {
      payload: payload,
      materia: materia
    };
  }

  function buildBaseName(libro) {
    return normalize([
      "libro",
      libro && libro.materia ? libro.materia : "materia",
      libro && libro.materiaIdLocal ? libro.materiaIdLocal : new Date().toISOString().slice(0, 10)
    ].join("-"));
  }

  function download(content, fileName, mimeType) {
    var blob = new Blob([content], { type: mimeType || "text/plain;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function saveTextFile(path, content) {
    if (window.api && window.api.files && typeof window.api.files.saveText === "function") {
      return window.api.files.saveText({ path: path, content: content });
    }

    return null;
  }

  async function saveJsonFile(path, data) {
    if (window.api && window.api.files && typeof window.api.files.saveJson === "function") {
      return window.api.files.saveJson({ path: path, data: data });
    }

    return null;
  }

  async function exportTxt(libro) {
    var baseName = buildBaseName(libro);
    var path = "libro/datos/libros/" + baseName + ".txt";
    var textContent = libro && libro.libro ? libro.libro.texto || "" : "";
    var result = await saveTextFile(path, textContent);

    if (result && result.ok) {
      return {
        ok: true,
        modo: "electron",
        path: result.path || path,
        message: result.message || "TXT exportado."
      };
    }

    download(textContent, baseName + ".txt", "text/plain;charset=utf-8");

    return {
      ok: true,
      modo: "descarga",
      path: path,
      message: "TXT descargado."
    };
  }

  async function exportJson(libro) {
    var baseName = buildBaseName(libro);
    var path = "libro/datos/libros/" + baseName + ".json";
    var result = await saveJsonFile(path, libro);

    if (result && result.ok) {
      return {
        ok: true,
        modo: "electron",
        path: result.path || path,
        message: result.message || "JSON exportado."
      };
    }

    download(JSON.stringify(libro, null, 2), baseName + ".json", "application/json;charset=utf-8");

    return {
      ok: true,
      modo: "descarga",
      path: path,
      message: "JSON descargado."
    };
  }

  window.GeneradorLibroStorage = {
    readIndex: readIndex,
    readSavedById: readSavedById,
    extractMateria: extractMateria,
    loadJsonFile: loadJsonFile,
    exportTxt: exportTxt,
    exportJson: exportJson
  };
})(window, document);
