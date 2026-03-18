/* =========================================================
Nombre del archivo: prioridad.db.read.js
Ruta: /prioridad/prioridad.db.read.js
Función:
- Lecturas: listEvents, getEvent
========================================================= */
(function(){
  const { COL, assertDb } = window.PrioridadDBCore;

  async function listEvents(){
    const db = assertDb();
    const snap = await db.collection(COL).orderBy("createdAt","desc").limit(300).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async function getEvent(id){
    const db = assertDb();
    const doc = await db.collection(COL).doc(String(id)).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  window.PrioridadDBRead = { listEvents, getEvent };
})();
