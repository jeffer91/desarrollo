/* =========================================================
Nombre del archivo: prioridad.db.js
Ruta: /prioridad/prioridad.db.js
Función:
- API Firestore (compat) para events:
  listEvents, getEvent, updateEventMerge
========================================================= */

(function(){
  const COL = "events";

  function assertDb(){
    if (!window.db) throw new Error("Firestore no inicializado (window.db).");
    return window.db;
  }

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

  async function updateEventMerge(id, patch){
    const db = assertDb();
    return db.collection(COL).doc(String(id)).set(patch, { merge:true });
  }

  window.PrioridadDB = { listEvents, getEvent, updateEventMerge };
})();
