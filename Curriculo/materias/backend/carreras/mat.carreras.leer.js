/*
Nombre del archivo: mat.carreras.leer.js
Ubicación: /Curriculo/materias/backend/carreras/mat.carreras.leer.js
Función:
- Leer carreras desde base local y Firebase
- Ordenar por nombre
- Cachear datos remotos en local sin marcarlos como pendientes
- Devolver estructura limpia para selectores
*/

(function (window) {
  "use strict";

  window.MAT = window.MAT || {};
  var MAT = window.MAT;

  MAT.carreras = MAT.carreras || {};

  function cleanText(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalizar(value) {
    return cleanText(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function sortCarreras(list) {
    return (Array.isArray(list) ? list : []).slice().sort(function (a, b) {
      return normalizar(a.nombre || a.id).localeCompare(normalizar(b.nombre || b.id), "es", {
        sensitivity: "base",
        numeric: true
      });
    });
  }

  function shape(id, data) {
    var fn = MAT.carreras && typeof MAT.carreras.ensureShape === "function"
      ? MAT.carreras.ensureShape
      : function (value) { return value || {}; };
    var out = fn(data || {});
    out.id = cleanText(out.id || id);
    return out;
  }

  async function listarRemotas() {
    var ref = MAT.refs.carreras();
    var snapshot;
    var list = [];

    if (!ref) {
      return list;
    }

    snapshot = await ref.get();

    snapshot.forEach(function (doc) {
      list.push(shape(doc.id, doc.data() || {}));
    });

    return list;
  }

  async function cachearRemotas(list) {
    if (!MAT.firebase || typeof MAT.firebase.guardarLocalCarrera !== "function") {
      return;
    }

    await Promise.all((Array.isArray(list) ? list : []).map(function (item) {
      if (!item || !item.id) return Promise.resolve(false);
      return MAT.firebase.guardarLocalCarrera(item.id, item, { markDirty: false });
    }));
  }

  MAT.carreras.listar = async function () {
    var localList = [];
    var remoteList = [];
    var map = Object.create(null);
    var result = [];

    if (MAT.firebase && typeof MAT.firebase.listarLocalCarreras === "function") {
      localList = await MAT.firebase.listarLocalCarreras();
    }

    try {
      remoteList = await listarRemotas();
      await cachearRemotas(remoteList);
    } catch (error) {
      console.warn("MAT: No se pudo leer Firebase. Se usarán datos locales si existen.", error);
      remoteList = [];
    }

    remoteList.forEach(function (item) {
      if (!item || !item.id) return;
      map[item.id] = shape(item.id, item);
    });

    localList.forEach(function (item) {
      var id = cleanText(item && item.id);
      if (!id) return;
      map[id] = shape(id, item);
    });

    Object.keys(map).forEach(function (id) {
      result.push(map[id]);
    });

    return sortCarreras(result);
  };

  MAT.carreras.buscarLocal = function (id) {
    if (MAT.state && typeof MAT.state.getCareerById === "function") {
      return MAT.state.getCareerById(id);
    }

    return null;
  };
})(window);
