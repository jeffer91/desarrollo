/* =========================================================
Nombre del archivo: prioridad.table.handlers.js
Ruta: /prioridad/prioridad.table.handlers.js
Función:
- Handlers tabla:
  - Cambiar prioridad (select)
  - Abrir modal (Editar)
- ✅ Anti-crash: no depende de Toast/ModalRender al cargar
- ✅ Debug: logs claros
========================================================= */
(function(){
  const DOM = window.PrioridadDOM || {};
  const $ = DOM.$ || ((id)=>document.getElementById(id));

  const S = window.PrioridadState;
  const F = window.PrioridadFilters;
  const R = window.PrioridadTableRender;
  const Read = window.PrioridadDBRead;
  const WPr = window.PrioridadDBWritePriority;

  function safeToast(title, body){
    // FIX: evita crash si PrioridadToast no cargó
    const Toast = window.PrioridadToast;
    if (Toast && typeof Toast.toast === "function"){
      Toast.toast(title, body);
      return;
    }
    console.warn("[Toast fallback]", title, body);
    const msg = document.getElementById("msg");
    if (msg) msg.textContent = `${title}: ${body}`;
  }

  function rerender(){
    try{
      const rows = F.applyFilters(S.getCache());
      R.renderTable(rows);
    }catch(err){
      console.error("rerender error:", err);
    }
  }

  async function onTableChange(e){
    const sel = e.target?.closest?.('select[data-action="prio"]');
    if (!sel) return;

    const id = sel.dataset.id;
    const val = sel.value;

    try{
      await WPr.updateEventPriority(id, val);

      // cache local sin recargar todo
      const cache = S.getCache().map(r =>
        (String(r.id)===String(id)) ? ({ ...r, priority: Number(val) }) : r
      );
      S.setCache(cache);

      rerender();
      safeToast("Prioridad actualizada", `Evento actualizado a ${val}.`);
    }catch(err){
      console.error(err);
      safeToast("Error", "No se pudo actualizar prioridad.");
    }
  }

  async function onTableClick(e){
    const btn = e.target?.closest?.('button[data-action="edit"]');
    if (!btn) return;

    // FIX: si el botón no trae data-id, toma el id desde la fila (data-row-id)
    const id = btn.dataset.id || btn.closest("tr")?.dataset.rowId || "";
    console.log("[Editar click] id =", id);

    if (!id){
      safeToast("Error", "No se pudo obtener el ID del evento (data-id/data-row-id).");
      return;
    }

    try{
      const item = await Read.getEvent(id);
      if (!item){
        safeToast("Aviso", "No se encontró el evento.");
        return;
      }

      const Modal = window.PrioridadModalCore;
      const ModalRender = window.PrioridadModalRender;

      console.log("[Modal check]", {
        ModalCore: !!Modal,
        ModalOpenFn: !!(Modal && typeof Modal.open === "function"),
        ModalRender: !!ModalRender,
        ModalBuildFn: !!(ModalRender && typeof ModalRender.build === "function")
      });

      if (!Modal || typeof Modal.open !== "function"){
        safeToast("Error", "ModalCore no cargado (PrioridadModalCore). Revisa scripts/orden de carga.");
        return;
      }

      if (!ModalRender || typeof ModalRender.build !== "function"){
        safeToast(
          "Error",
          "ModalRender no cargado (PrioridadModalRender.build). Revisa consola por errores al cargar prioridad.modal.render.js o sus dependencias."
        );
        return;
      }

      if (S && typeof S.setSelectedId === "function"){
        S.setSelectedId(id);
      }

      const html = ModalRender.build(item);
      Modal.open(html);
    }catch(err){
      console.error(err);
      safeToast("Error", "No se pudo abrir el evento.");
    }
  }

  function wire(){
    const host = $("tableHost");
    if (!host){
      console.warn("No existe #tableHost");
      return;
    }

    // Evita doble-wire
    if (host.dataset.wired === "1") return;
    host.dataset.wired = "1";

    host.addEventListener("change", onTableChange);
    host.addEventListener("click", onTableClick);

    console.log("✅ PrioridadTableHandlers.wire() OK");
  }

  window.PrioridadTableHandlers = { wire, rerender };
})();
