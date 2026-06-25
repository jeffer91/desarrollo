/*
Nombre del archivo: mat.guardar.js
Ubicación: /Curriculo/materias/backend/carga/mat.guardar.js
Función:
- Orquestar el guardado completo desde una vista previa
- Validar antes de guardar
- Generar snapshot antes y después
- Guardar primero local y dejar pendiente sincronización cuando aplique
*/

(function (window) {
  "use strict";

  window.MAT = window.MAT || {};
  var MAT = window.MAT;

  MAT.carga = MAT.carga || {};

  MAT.carga.guardarDesdePreview = async function (params) {
    var input = (params && typeof params === "object") ? params : {};
    var careerId = String(input.careerId || "").trim();
    var preview = input.preview || null;
    var currentDoc;
    var check;
    var beforeSnap;
    var mergeResult;
    var audit;
    var updatedDoc;
    var afterSnap;

    if (!careerId) {
      throw new Error("MAT: No se recibió el id de la carrera.");
    }

    if (!preview || typeof preview !== "object") {
      throw new Error("MAT: No se recibió una vista previa válida.");
    }

    currentDoc = await MAT.carreras.leerUna(careerId);

    if (!currentDoc) {
      throw new Error("MAT: La carrera seleccionada no existe.");
    }

    if (MAT.validar && MAT.validar.general && typeof MAT.validar.general.beforeSave === "function") {
      check = MAT.validar.general.beforeSave({
        careerId: careerId,
        loadType: preview.kind,
        preview: preview,
        careerType: currentDoc.tipo || ""
      });

      if (!check.ok) {
        throw new Error(check.errors.join(" ") || "MAT: La carga no pasó la validación.");
      }
    }

    beforeSnap = MAT.snapshot.onlyForLoadType(currentDoc, preview.kind);
    mergeResult = MAT.merge.fromPreview(currentDoc, preview, currentDoc.tipo);

    audit = {
      tipoCarga: String(preview.kind || ""),
      totalLineas: Number(preview.totalLines || 0),
      warnings: Array.isArray(mergeResult.warnings) ? mergeResult.warnings.slice() : [],
      stats: mergeResult.stats || {},
      fechaCliente: new Date().toISOString(),
      modoGuardado: MAT.firebase && MAT.firebase.localDisponible && MAT.firebase.localDisponible()
        ? "local_pendiente_sync"
        : "firebase_directo"
    };

    updatedDoc = await MAT.carga.actualizar(careerId, mergeResult.patch, { audit: audit });
    afterSnap = MAT.snapshot.onlyForLoadType(updatedDoc, preview.kind);

    return {
      ok: true,
      local: audit.modoGuardado === "local_pendiente_sync",
      pendienteSync: audit.modoGuardado === "local_pendiente_sync",
      careerId: careerId,
      kind: String(preview.kind || ""),
      before: beforeSnap,
      after: afterSnap,
      updated: updatedDoc,
      warnings: mergeResult.warnings || [],
      stats: mergeResult.stats || {},
      mensaje: audit.modoGuardado === "local_pendiente_sync"
        ? "Cambios guardados localmente. Quedaron pendientes para sincronizar con Firebase."
        : "Cambios guardados correctamente en Firebase."
    };
  };

  MAT.carga.guardar = MAT.carga.guardarDesdePreview;
})(window);
