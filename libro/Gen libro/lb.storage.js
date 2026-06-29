/* =========================================================
Nombre completo: lb.storage.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.storage.js
Función o funciones:
1. Leer materias consolidadas guardadas por Carga de la materia.
2. Preparar el registro local de libros generados.
3. Centralizar acceso a localStorage para Gen libro.
========================================================= */

(function attachLbStorage(window) {
  "use strict";

  var Constants = window.LibroGenLibroConstants || {};
  var STORAGE = Constants.STORAGE || {};
  var materiasKey = STORAGE.materiasKey || "libro.cargaMateria.materias";
  var librosKey = STORAGE.librosKey || "libro.genLibro.libros";

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function readJson(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (_error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  function normalizeKey(value) {
    return text(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function getMateriaId(item) {
    return text(item && (item.idLocal || item.id || item.path || item.materia));
  }

  function readMateriaPayload(item) {
    var idLocal = text(item && item.idLocal);
    var payload = idLocal ? readJson(materiasKey + "." + idLocal, null) : null;

    if (payload) return payload;

    return {
      version: "1.0.0",
      modulo: "libro",
      tipo: "materia_consolidada_indice",
      guardadoEn: item && item.guardadoEn ? item.guardadoEn : null,
      materiaConsolidada: item || null,
      validacion: null,
      expediente: null
    };
  }

  function listMateriasIndex() {
    var items = readJson(materiasKey, []);
    return Array.isArray(items) ? items : [];
  }

  function listMaterias() {
    return listMateriasIndex()
      .map(function mapItem(item, index) {
        var payload = readMateriaPayload(item);
        var materia = payload && payload.materiaConsolidada ? payload.materiaConsolidada : item;
        var id = getMateriaId(item) || getMateriaId(materia) || String(index + 1);

        return {
          id: id,
          idKey: normalizeKey(id || String(index + 1)),
          carrera: text(materia && materia.carrera) || text(item && item.carrera),
          materia: text(materia && materia.materia) || text(item && item.materia),
          estado: text(item && item.estado) || text(materia && materia.estado),
          guardadoEn: text(item && item.guardadoEn) || text(payload && payload.guardadoEn),
          path: text(item && item.path),
          payload: payload,
          materiaConsolidada: materia
        };
      })
      .filter(function filterItem(item) {
        return item.carrera && item.materia;
      });
  }

  function readLibrosIndex() {
    var items = readJson(librosKey, []);
    return Array.isArray(items) ? items : [];
  }

  function saveLibroRecord(record) {
    var item = Object.assign({}, record || {}, {
      guardadoEn: new Date().toISOString()
    });
    var index = readLibrosIndex();

    index.unshift(item);
    writeJson(librosKey, index.slice(0, 50));

    if (item.id) {
      writeJson(librosKey + "." + item.id, item);
    }

    return item;
  }

  window.LibroGenLibroStorage = {
    listMaterias: listMaterias,
    listMateriasIndex: listMateriasIndex,
    readMateriaPayload: readMateriaPayload,
    readLibrosIndex: readLibrosIndex,
    saveLibroRecord: saveLibroRecord
  };
})(window);
