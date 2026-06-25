/*
Nombre del archivo: mat.actualizar.js
Ubicación: /Curriculo/materias/backend/carga/mat.actualizar.js
Función:
- Actualizar una carrera con los bloques de materias
- Guardar primero en base local central cuando exista
- Mantener merge para no borrar otros campos
- Devolver el documento actualizado
*/

(function (window) {
  "use strict";

  window.MAT = window.MAT || {};
  var MAT = window.MAT;

  MAT.carga = MAT.carga || {};

  function cloneObject(value) {
    var source = (value && typeof value === "object") ? value : {};
    var out = {};
    var key;

    for (key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        out[key] = source[key];
      }
    }

    return out;
  }

  function getServerTimestamp() {
    if (
      window.firebase &&
      window.firebase.firestore &&
      window.firebase.firestore.FieldValue &&
      typeof window.firebase.firestore.FieldValue.serverTimestamp === "function"
    ) {
      return window.firebase.firestore.FieldValue.serverTimestamp();
    }

    return new Date();
  }

  async function actualizarFirebaseDirecto(careerId, payload) {
    var docRef = MAT.refs.carreraDoc(careerId);

    if (!docRef) {
      throw new Error("MAT: No hay referencia a la carrera seleccionada.");
    }

    payload.updatedAt = getServerTimestamp();
    await docRef.set(payload, { merge: true });
    return await MAT.carreras.leerUna(careerId);
  }

  MAT.carga.actualizar = async function (careerId, patch, options) {
    var id = String(careerId || "").trim();
    var payload = cloneObject(patch);
    var opts = (options && typeof options === "object") ? options : {};
    var currentDoc;
    var updatedDoc;

    if (!id) {
      throw new Error("MAT: Debes indicar el id de la carrera.");
    }

    if (opts.audit && typeof opts.audit === "object") {
      payload.ultimaCarga = opts.audit;
    }

    payload.updatedAtLocal = payload.updatedAtLocal || new Date().toISOString();

    if (MAT.firebase && typeof MAT.firebase.localDisponible === "function" && MAT.firebase.localDisponible()) {
      currentDoc = await MAT.carreras.leerUna(id);

      if (!currentDoc) {
        throw new Error("MAT: No existe la carrera seleccionada.");
      }

      updatedDoc = MAT.carreras.ensureShape({
        ...currentDoc,
        ...payload,
        id: id
      });

      await MAT.firebase.guardarLocalCarrera(id, updatedDoc);
      return updatedDoc;
    }

    return await actualizarFirebaseDirecto(id, payload);
  };
})(window);
