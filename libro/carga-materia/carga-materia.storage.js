/* =========================================================
Nombre completo: carga-materia.storage.js
Ruta o ubicación: /desarrollo/libro/carga-materia/carga-materia.storage.js
Función o funciones:
1. Guardar el expediente y la materia consolidada del módulo Libro.
2. Usar window.api.files.saveJson cuando la app corre en Electron.
3. Guardar una copia de respaldo en localStorage.
4. Descargar un JSON como respaldo cuando no exista API de escritorio.
5. Entregar una respuesta clara para la interfaz del Bloque 8.
========================================================= */

(function attachCargaMateriaStorage(window, document) {
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
      .slice(0, 90) || "materia";
  }

  function getMateria(expediente) {
    return expediente && expediente.materiaConsolidada ? expediente.materiaConsolidada : null;
  }

  function buildFileName(expediente) {
    var materia = getMateria(expediente) || {};
    var id = text(materia.idLocal || expediente.idLocal || "");

    if (id) return normalize(id) + ".json";

    return [
      normalize(materia.carrera || expediente.carrera || "carrera"),
      normalize(materia.materia || expediente.materia || "materia"),
      new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)
    ].join("-") + ".json";
  }

  function buildPath(expediente) {
    return "libro/datos/materias/" + buildFileName(expediente);
  }

  function buildPayload(expediente) {
    var materia = getMateria(expediente);

    if (!expediente || !materia) {
      throw new Error("No existe materia consolidada para guardar.");
    }

    return {
      version: "1.0.0",
      modulo: "libro",
      tipo: "materia_consolidada",
      guardadoEn: new Date().toISOString(),
      materiaConsolidada: materia,
      validacion: expediente.validacion || null,
      expediente: expediente
    };
  }

  function readLocalIndex() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (_error) {
      return [];
    }
  }

  function saveLocalCopy(payload, path) {
    var index = readLocalIndex();
    var item = {
      idLocal: payload.materiaConsolidada.idLocal || "",
      carrera: payload.materiaConsolidada.carrera || "",
      materia: payload.materiaConsolidada.materia || "",
      estado: payload.validacion ? payload.validacion.estado : payload.materiaConsolidada.estado,
      path: path,
      guardadoEn: payload.guardadoEn
    };

    index = index.filter(function filterItem(existing) {
      return existing.idLocal !== item.idLocal;
    });

    index.unshift(item);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(index.slice(0, 50)));
    window.localStorage.setItem(STORAGE_KEY + "." + item.idLocal, JSON.stringify(payload));

    return item;
  }

  function downloadJson(payload, fileName) {
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
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

  async function saveWithElectron(payload, path) {
    if (
      !window.api ||
      !window.api.files ||
      typeof window.api.files.saveJson !== "function"
    ) {
      return null;
    }

    return window.api.files.saveJson({
      path: path,
      data: payload
    });
  }

  async function save(expediente) {
    var payload = buildPayload(expediente);
    var path = buildPath(expediente);
    var fileName = buildFileName(expediente);
    var localItem = saveLocalCopy(payload, path);
    var electronResult = null;

    try {
      electronResult = await saveWithElectron(payload, path);
    } catch (error) {
      electronResult = {
        ok: false,
        message: error && error.message ? error.message : String(error)
      };
    }

    if (electronResult && electronResult.ok) {
      return {
        ok: true,
        modo: "electron_local_storage",
        path: electronResult.path || path,
        localStorage: localItem,
        message: electronResult.message || "Materia consolidada guardada."
      };
    }

    downloadJson(payload, fileName);

    return {
      ok: true,
      modo: "descarga_local_storage",
      path: path,
      localStorage: localItem,
      warning: electronResult && electronResult.message ? electronResult.message : "No se detectó guardado directo de escritorio.",
      message: "Se guardó una copia local y se descargó el JSON."
    };
  }

  function listLocal() {
    return readLocalIndex();
  }

  window.LibroCargaMateriaStorage = {
    save: save,
    listLocal: listLocal,
    buildPath: buildPath,
    buildFileName: buildFileName,
    buildPayload: buildPayload
  };
})(window, document);
