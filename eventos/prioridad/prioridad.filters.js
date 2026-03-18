/* =========================================================
Nombre del archivo: prioridad.filters.js
Ruta: /prioridad/prioridad.filters.js
Función:
- Leer filtros UI + aplicar filtros sobre cache
- Prioridad 3 niveles (alta/media/baja) con compat legacy priority(1-5)
========================================================= */

(function(){
  const { $ } = window.PrioridadDOM;

  function readFilters(){
    return {
      q: String($("q")?.value || "").toLowerCase().trim(),
      kind: $("fKind")?.value || "",
      prio: String($("fPrio")?.value || "").toLowerCase().trim(), // alta|media|baja
      alerts: $("fAlerts")?.value || ""
    };
  }

  function normalizePriorityLevel(r){
    const pl = String(r?.priorityLevel || "").toLowerCase().trim();
    if (pl === "alta" || pl === "media" || pl === "baja") return pl;

    const p = Number(r?.priority ?? 3);
    if (p >= 4) return "alta";
    if (p === 3) return "media";
    return "baja";
  }

  function applyFilters(rows){
    const f = readFilters();

    return (rows || []).filter(r => {
      const title = String(r.title || "").toLowerCase();

      if (f.q && !title.includes(f.q)) return false;

      if (f.kind && String(r.kind || "") !== f.kind) return false;

      if (f.prio){
        const pl = normalizePriorityLevel(r);
        if (pl !== f.prio) return false;
      }

      if (f.alerts === "yes" && r.needsAlerts !== true) return false;
      if (f.alerts === "no" && r.needsAlerts === true) return false;

      return true;
    });
  }

  window.PrioridadFilters = { readFilters, applyFilters };
})();
