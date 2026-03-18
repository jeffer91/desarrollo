/* =========================================================
Nombre del archivo: prioridad.app.js
Ruta: /prioridad/prioridad.app.js
Función:
- Boot mínimo:
  - wire board handlers
  - wire modal handlers
  - wire family modal handlers
  - cargar eventos y familias
  - render tablero
========================================================= */
(function(){
  const S = window.PrioridadState;
  const F = window.PrioridadFilters;

  const ReadEvents = window.PrioridadDBRead;
  const ReadFamilies = window.PrioridadDBFamiliesRead;

  const BR = window.PrioridadBoardRender;
  const BH = window.PrioridadBoardHandlers;

  const MH = window.PrioridadModalHandlers;
  const FH = window.PrioridadFamilyModalHandlers;

  async function loadAndRender(){
    try{
      const pEvents = (ReadEvents && typeof ReadEvents.listEvents === "function")
        ? ReadEvents.listEvents()
        : Promise.resolve([]);

      const pFamilies = (ReadFamilies && typeof ReadFamilies.listFamilies === "function")
        ? ReadFamilies.listFamilies()
        : Promise.resolve([]);

      const res = await Promise.all([pEvents, pFamilies]);
      const rows = res[0] || [];
      const fams = res[1] || [];

      // Cache
      if (S && typeof S.setCache === "function") S.setCache(rows);
      if (S && typeof S.setFamilies === "function") S.setFamilies(fams);

      // Render filtrado
      const filtered = F.applyFilters(rows);
      BR.renderBoard(filtered);

      console.log("✅ Board render OK. Events:", rows.length, "Families:", fams.length);
    }catch(err){
      console.error("loadAndRender:", err);
      const msg = document.getElementById("msg");
      if (msg) msg.textContent = "No se pudo cargar eventos.";
    }
  }

  function wireFilters(){
    const q = document.getElementById("q");
    const fKind = document.getElementById("fKind");
    const fPrio = document.getElementById("fPrio");
    const fAlerts = document.getElementById("fAlerts");
    const btnReload = document.getElementById("btnReload");

    const rerender = ()=>{
      const rows = S.getCache();
      const filtered = F.applyFilters(rows);
      BR.renderBoard(filtered);
    };

    if (q) q.addEventListener("input", rerender);
    if (fKind) fKind.addEventListener("change", rerender);
    if (fPrio) fPrio.addEventListener("change", rerender);
    if (fAlerts) fAlerts.addEventListener("change", rerender);

    if (btnReload) btnReload.addEventListener("click", loadAndRender);
  }

  function init(){
    if (BH && typeof BH.wire === "function") BH.wire();
    else console.warn("PrioridadBoardHandlers no existe");

    if (MH && typeof MH.wire === "function") MH.wire();
    else console.warn("PrioridadModalHandlers no existe");

    // ✅ NUEVO
    if (FH && typeof FH.wire === "function") FH.wire();
    else console.warn("PrioridadFamilyModalHandlers no existe");

    wireFilters();
    loadAndRender();
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  }else{
    init();
  }
})();