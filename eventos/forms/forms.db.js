/* =========================================================
Nombre del archivo: forms.db.js
Ruta: /forms.db.js
Función o funciones:
- API de Firestore para events:
  addEvent, listEvents, deleteEvent
- Lectura opcional de eventFamilies:
  listFamilies
========================================================= */
(function(){
  const EVENTS_COL = "events";
  const FAMILIES_COL = "eventFamilies";

  function assertDb(){
    if (!window.db) throw new Error("Firestore no inicializado en window.db.");
    return window.db;
  }

  function normalizeRow(doc){
    return { id: doc.id, ...doc.data() };
  }

  function compareRows(a, b){
    const ca = String(b.createdAt || b.updatedAt || "");
    const cb = String(a.createdAt || a.updatedAt || "");
    if (ca !== cb) return ca.localeCompare(cb);

    const da = String(b.date || "");
    const db = String(a.date || "");
    if (da !== db) return da.localeCompare(db);

    return String(a.title || "").localeCompare(String(b.title || ""));
  }

  async function addEvent(payload){
    const db = assertDb();
    return db.collection(EVENTS_COL).add(payload);
  }

  async function listEvents(){
    const db = assertDb();

    try{
      const snap = await db
        .collection(EVENTS_COL)
        .orderBy("createdAt", "desc")
        .limit(300)
        .get();

      return snap.docs.map(normalizeRow);
    }catch(err){
      const snap = await db.collection(EVENTS_COL).get();
      const rows = snap.docs.map(normalizeRow);
      rows.sort(compareRows);
      return rows;
    }
  }

  async function deleteEvent(id){
    const db = assertDb();
    return db.collection(EVENTS_COL).doc(String(id)).delete();
  }

  function normalizeFamily(doc){
    const raw = doc.data() || {};
    return {
      id: String(doc.id || ""),
      label: String(raw.label || raw.name || raw.title || doc.id || "Sin nombre"),
      order: Number(raw.order || 9999)
    };
  }

  async function listFamilies(){
    const db = assertDb();
    const col = db.collection(FAMILIES_COL);

    try{
      const snap = await col.orderBy("order", "asc").get();
      return snap.docs.map(normalizeFamily);
    }catch(err){
      try{
        const snap = await col.get();
        const rows = snap.docs.map(normalizeFamily);
        rows.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
        return rows;
      }catch(_){
        return [];
      }
    }
  }

  window.FormsDB = {
    addEvent,
    listEvents,
    deleteEvent,
    listFamilies
  };
})();