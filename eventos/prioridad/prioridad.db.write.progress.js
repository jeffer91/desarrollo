/* =========================================================
Nombre del archivo: prioridad.db.write.progress.js
Ruta: /prioridad/prioridad.db.write.progress.js
Función:
- appendProgress(id, item)
========================================================= */
(function(){
  const { COL, assertDb } = window.PrioridadDBCore;

  async function appendProgress(id, item){
    const db = assertDb();
    const ref = db.collection(COL).doc(String(id));
    const doc = await ref.get();
    if (!doc.exists) return;
    const data = doc.data() || {};
    const progress = Array.isArray(data.progress) ? data.progress.slice() : [];
    progress.push(item);
    return ref.set({ progress }, { merge:true });
  }

  window.PrioridadDBWriteProgress = { appendProgress };
})();
