/* =========================================================
Nombre completo: lb.data-source.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.data-source.js
Función o funciones:
1. Obtener las materias guardadas desde Carga de la materia.
2. Agrupar materias por carrera para los selectores.
3. Entregar la materia consolidada seleccionada a Gen libro.
========================================================= */

(function attachLbDataSource(window) {
  "use strict";

  var Storage = window.LibroGenLibroStorage || null;

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalize(value) {
    return text(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function sortText(a, b) {
    return normalize(a).localeCompare(normalize(b), "es");
  }

  function listMaterias() {
    if (!Storage || typeof Storage.listMaterias !== "function") return [];
    return Storage.listMaterias();
  }

  function listCarreras() {
    var map = {};

    listMaterias().forEach(function eachMateria(item) {
      if (!item.carrera) return;
      map[normalize(item.carrera)] = item.carrera;
    });

    return Object.keys(map)
      .map(function mapKey(key) { return map[key]; })
      .sort(sortText);
  }

  function listMateriasByCarrera(carrera) {
    var wanted = normalize(carrera);

    return listMaterias()
      .filter(function filterMateria(item) {
        return normalize(item.carrera) === wanted;
      })
      .sort(function sortMateria(a, b) {
        return sortText(a.materia, b.materia);
      });
  }

  function findMateria(carrera, materiaId) {
    var wantedCarrera = normalize(carrera);
    var wantedMateria = text(materiaId);

    return listMaterias().find(function findItem(item) {
      return normalize(item.carrera) === wantedCarrera && String(item.id) === wantedMateria;
    }) || null;
  }

  function buildSummary(item) {
    var materia = item && item.materiaConsolidada ? item.materiaConsolidada : null;
    var unidades = materia && Array.isArray(materia.unidades) ? materia.unidades : [];
    var contenidos = unidades.reduce(function countContent(total, unidad) {
      return total + (Array.isArray(unidad.contenidos) ? unidad.contenidos.length : 0);
    }, 0);
    var actividades = unidades.reduce(function countActivities(total, unidad) {
      return total + (Array.isArray(unidad.actividades) ? unidad.actividades.length : 0);
    }, 0);

    return {
      carrera: item ? item.carrera : "",
      materia: item ? item.materia : "",
      unidades: unidades.length,
      contenidos: contenidos,
      actividades: actividades,
      guardadoEn: item ? item.guardadoEn : "",
      estado: item ? item.estado : ""
    };
  }

  window.LibroGenLibroDataSource = {
    listMaterias: listMaterias,
    listCarreras: listCarreras,
    listMateriasByCarrera: listMateriasByCarrera,
    findMateria: findMateria,
    buildSummary: buildSummary
  };
})(window);
