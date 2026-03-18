/* =========================================================
Nombre del archivo: prioridad.db.families.write.js
Ruta: /prioridad/prioridad.db.families.write.js
Función:
- Crear y actualizar familias en Firestore
- Exponer: window.PrioridadDBFamiliesWrite
========================================================= */
(function(){
  const Core = window.PrioridadDBCore;

  function serverTimestampSafe(){
    try{
      const F = window.firebase && window.firebase.firestore && window.firebase.firestore.FieldValue;
      if (F && typeof F.serverTimestamp === "function") return F.serverTimestamp();
    }catch(_){}
    return new Date().toISOString();
  }

  function normalizeLabel(label){
    return String(label || "").trim().replace(/\s+/g, " ");
  }

  async function createFamily(label){
    const lbl = normalizeLabel(label);
    if (!lbl) throw new Error("Etiqueta de familia vacía.");

    const db = Core.assertDb();
    const col = Core.COL_FAMILIES || "eventFamilies";

    const payload = {
      label: lbl,
      createdAt: serverTimestampSafe(),
      updatedAt: serverTimestampSafe(),
      order: 0
    };

    const ref = await db.collection(col).add(payload);
    return { id: ref.id, ...payload, label: lbl };
  }

  async function updateFamily(id, patch){
    const key = String(id || "");
    if (!key) throw new Error("ID de familia vacío.");

    const db = Core.assertDb();
    const col = Core.COL_FAMILIES || "eventFamilies";

    const safePatch = Object.assign({}, patch || {});
    if (typeof safePatch.label !== "undefined") safePatch.label = normalizeLabel(safePatch.label);
    safePatch.updatedAt = serverTimestampSafe();

    await db.collection(col).doc(key).set(safePatch, { merge: true });
    return true;
  }

  async function deleteFamily(id){
    const key = String(id || "");
    if (!key) throw new Error("ID de familia vacío.");

    const db = Core.assertDb();
    const col = Core.COL_FAMILIES || "eventFamilies";

    await db.collection(col).doc(key).delete();
    return true;
  }

  window.PrioridadDBFamiliesWrite = {
    createFamily,
    updateFamily,
    deleteFamily
  };
})();