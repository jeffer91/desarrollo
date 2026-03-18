/* =========================================================
Nombre del archivo: prioridad.db.families.read.js
Ruta: /prioridad/prioridad.db.families.read.js
Función:
- Leer familias desde Firestore
- Exponer: window.PrioridadDBFamiliesRead
========================================================= */
(function(){
  const Core = window.PrioridadDBCore;

  function normalizeDoc(doc){
    const data = doc.data() || {};
    return {
      id: doc.id,
      label: String(data.label || "").trim(),
      createdAt: data.createdAt || null,
      updatedAt: data.updatedAt || null,
      order: Number.isFinite(Number(data.order)) ? Number(data.order) : 0
    };
  }

  async function listFamilies(){
    const db = Core.assertDb();
    const col = Core.COL_FAMILIES || "eventFamilies";

    const snap = await db.collection(col).get();
    const out = [];
    snap.forEach(doc => out.push(normalizeDoc(doc)));

    // Orden estable: order, label
    out.sort((a,b)=>{
      const ao = Number(a.order || 0);
      const bo = Number(b.order || 0);
      if (ao !== bo) return ao - bo;
      const al = String(a.label || "").toLowerCase();
      const bl = String(b.label || "").toLowerCase();
      if (al < bl) return -1;
      if (al > bl) return 1;
      return 0;
    });

    return out;
  }

  async function getFamily(id){
    const key = String(id || "");
    if (!key) return null;

    const db = Core.assertDb();
    const col = Core.COL_FAMILIES || "eventFamilies";

    const doc = await db.collection(col).doc(key).get();
    if (!doc.exists) return null;
    return normalizeDoc(doc);
  }

  window.PrioridadDBFamiliesRead = {
    listFamilies,
    getFamily
  };
})();