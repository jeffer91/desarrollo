/* =========================================================
Nombre del archivo: prioridad.db.write.priority.js
Ruta: /prioridad/prioridad.db.write.priority.js
Función:
- updateEventPriorityLevel(id, level)
- Guarda prioridad en 3 niveles: alta | media | baja
- Compat: también setea "priority" numérico aproximado (5/3/1) para no romper reportes legacy
========================================================= */

(function(){
  const { COL, assertDb } = window.PrioridadDBCore;

  function normalizeLevel(level){
    const v = String(level || "").toLowerCase().trim();
    if (v === "alta" || v === "media" || v === "baja") return v;
    return "media";
  }

  function levelToLegacyNumber(level){
    if (level === "alta") return 5;
    if (level === "baja") return 1;
    return 3;
  }

  async function updateEventPriorityLevel(id, level){
    const db = assertDb();
    const lvl = normalizeLevel(level);
    const legacy = levelToLegacyNumber(lvl);

    return db.collection(COL).doc(String(id)).set(
      { priorityLevel: lvl, priority: legacy },
      { merge: true }
    );
  }

  // ✅ Mantener nombre anterior si algo lo llama:
  async function updateEventPriority(id, priority){
    // Si te llaman con número, lo mapeo a 3 niveles.
    const p = Number(priority ?? 3);
    const lvl = (p >= 4) ? "alta" : (p === 3 ? "media" : "baja");
    return updateEventPriorityLevel(id, lvl);
  }

  window.PrioridadDBWritePriority = { updateEventPriorityLevel, updateEventPriority };
})();
