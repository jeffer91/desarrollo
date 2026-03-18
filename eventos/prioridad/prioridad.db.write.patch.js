/* =========================================================
Nombre del archivo: prioridad.db.write.patch.js
Ruta: /prioridad/prioridad.db.write.patch.js
Función:
- updateEventPatch(id, patch)
========================================================= */
(function(){
  const { COL, assertDb } = window.PrioridadDBCore;

  async function updateEventPatch(id, patch){
    const db = assertDb();
    return db.collection(COL).doc(String(id)).set(patch || {}, { merge:true });
  }

  window.PrioridadDBWritePatch = { updateEventPatch };
})();
