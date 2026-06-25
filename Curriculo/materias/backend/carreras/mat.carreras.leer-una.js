/*
Nombre del archivo: mat.carreras.leer-una.js
Ubicación: /Curriculo/materias/backend/carreras/mat.carreras.leer-una.js
Función:
- Leer una carrera específica desde base local o Firebase
- Asegurar una estructura consistente
- Normalizar arreglos base del documento
*/

(function (window) {
  "use strict";

  window.MAT = window.MAT || {};
  var MAT = window.MAT;

  MAT.carreras = MAT.carreras || {};

  function cleanText(value) {
    return String(value == null ? "" : value).trim().replace(/\s+/g, " ");
  }

  function toCleanArray(value) {
    if (!Array.isArray(value)) return [];

    return value
      .map(cleanText)
      .filter(function (item) {
        return !!item;
      });
  }

  function normalizeLevelArrays(out) {
    var i;

    for (i = 1; i <= 4; i += 1) {
      out["materiasNivel" + i] = toCleanArray(out["materiasNivel" + i]);
      out["materiasTransversal" + i] = toCleanArray(out["materiasTransversal" + i]);
    }

    return out;
  }

  function normalizeNucleos(value) {
    var items = Array.isArray(value) ? value.slice(0, 4).map(cleanText) : [];

    while (items.length < 4) {
      items.push("");
    }

    return items;
  }

  MAT.carreras.ensureShape = function (data) {
    var source = (data && typeof data === "object") ? data : {};
    var out = {};
    var key;

    for (key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        out[key] = source[key];
      }
    }

    out.id = cleanText(out.id);
    out.nombre = cleanText(out.nombre);
    out.nombreNormalizado = cleanText(out.nombreNormalizado || out.nombre.toLowerCase());
    out.tipo = cleanText(out.tipo);
    out.estado = cleanText(out.estado || "activa").toLowerCase();

    normalizeLevelArrays(out);

    out.nucleos = normalizeNucleos(out.nucleos);
    out.ejes = toCleanArray(out.ejes);

    out.createdAt = out.createdAt || null;
    out.updatedAt = out.updatedAt || null;
    out.createdAtLocal = cleanText(out.createdAtLocal);
    out.updatedAtLocal = cleanText(out.updatedAtLocal);

    return out;
  };

  async function leerRemota(careerId) {
    var docRef = MAT.refs.carreraDoc(careerId);
    var docSnap;
    var data;

    if (!docRef) {
      return null;
    }

    docSnap = await docRef.get();

    if (!docSnap.exists) {
      return null;
    }

    data = MAT.carreras.ensureShape(docSnap.data() || {});
    data.id = String(docSnap.id || "");

    if (MAT.firebase && typeof MAT.firebase.guardarLocalCarrera === "function") {
      await MAT.firebase.guardarLocalCarrera(data.id, data, { markDirty: false });
    }

    return data;
  }

  MAT.carreras.leerUna = async function (careerId) {
    var id = cleanText(careerId);
    var local;

    if (!id) {
      throw new Error("MAT: Debes indicar el id de la carrera.");
    }

    if (MAT.firebase && typeof MAT.firebase.leerLocalCarrera === "function") {
      local = await MAT.firebase.leerLocalCarrera(id);

      if (local) {
        local.id = local.id || id;
        return MAT.carreras.ensureShape(local);
      }
    }

    return await leerRemota(id);
  };
})(window);
