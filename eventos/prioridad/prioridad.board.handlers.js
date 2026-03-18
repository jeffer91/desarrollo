/* =========================================================
Nombre del archivo: prioridad.board.handlers.js
Ruta: /prioridad/prioridad.board.handlers.js
Función:
- Handlers tablero Kanban
- Drag and drop
- Modal Ver
- Patch status
- Prioridad por tarjeta
- Delete evento
- Selección múltiple
- ✅ NUEVO: asignar y quitar familia
- ✅ NUEVO: drop sobre familia para asignar
- ✅ NUEVO: colapsar familia
========================================================= */
(function(){
  const S = window.PrioridadState;
  const F = window.PrioridadFilters;
  const BR = window.PrioridadBoardRender;
  const Read = window.PrioridadDBRead;
  const Patch = window.PrioridadDBWritePatch;
  const WPrio = window.PrioridadDBWritePriority;

  function safeToast(title, body){
    const Toast = window.PrioridadToast;
    if (Toast && typeof Toast.toast === "function") return Toast.toast(title, body);
    const msg = document.getElementById("msg");
    if (msg) msg.textContent = `${title}: ${body}`;
    console.warn("[Toast fallback]", title, body);
  }

  function rerender(){
    try{
      const rows = F.applyFilters(S.getCache());
      BR.renderBoard(rows);
    }catch(err){
      console.error("board.rerender:", err);
    }
  }

  function updateCacheRow(id, patch){
    const next = (S.getCache() || []).map(r =>
      (String(r.id) === String(id)) ? ({ ...r, ...patch }) : r
    );
    S.setCache(next);
  }

  function removeCacheRow(id){
    const next = (S.getCache() || []).filter(r => String(r.id) !== String(id));
    S.setCache(next);
  }

  function canMoveToStatus(item, targetStatus){
    const t = String(targetStatus || "");
    if (t !== BR.STATUS.UP) return true;
    return item?.allowElevated === true;
  }

  async function openModalById(id){
    try{
      const item = await Read.getEvent(id);
      if (!item) return safeToast("Aviso", "No se encontró el evento.");

      const Modal = window.PrioridadModalCore;
      const Render = window.PrioridadModalRender;
      if (!Modal || typeof Modal.open !== "function") return safeToast("Error", "ModalCore no disponible.");
      if (!Render || typeof Render.build !== "function") return safeToast("Error", "ModalRender no disponible.");

      if (S && typeof S.setSelectedId === "function") S.setSelectedId(id);
      Modal.open(Render.build(item));
    }catch(err){
      console.error(err);
      safeToast("Error", "No se pudo abrir el evento.");
    }
  }

  async function deleteEventById(id){
    if (!id) return;

    const ok = window.confirm("¿Eliminar este evento? Esta acción no se puede deshacer.");
    if (!ok) return;

    try{
      const Core = window.PrioridadDBCore || {};
      const db = (Core.assertDb && typeof Core.assertDb === "function") ? Core.assertDb() : window.db;
      const COL = Core.COL || "events";

      if (!db || !db.collection) throw new Error("Firestore no inicializado.");

      await db.collection(COL).doc(String(id)).delete();

      removeCacheRow(id);
      rerender();
      safeToast("Eliminado", "Evento eliminado correctamente.");
    }catch(err){
      console.error(err);
      safeToast("Error", "No se pudo eliminar el evento.");
    }
  }

  // =========================
  // Selección múltiple helpers
  // =========================
  function getVisibleIds(){
    try{
      const visible = F.applyFilters(S.getCache());
      return (visible || []).map(x => String(x.id || "")).filter(Boolean);
    }catch(_){
      return (S.getCache() || []).map(x => String(x.id || "")).filter(Boolean);
    }
  }

  function onSelectionChange(e){
    const box = e.target?.closest?.('input[data-action="select"]');
    if (!box) return;

    const id = String(box.dataset.id || "");
    if (!id) return safeToast("Error", "No se pudo obtener el ID.");

    if (!S || typeof S.toggleSelectedId !== "function"){
      safeToast("Aviso", "Selección múltiple no disponible en State.");
      return;
    }

    S.toggleSelectedId(id);
    rerender();
  }

  function onSelectAllChange(e){
    const all = e.target?.closest?.('input[data-action="selectAll"]');
    if (!all) return;

    if (!S || typeof S.setSelectedIds !== "function" || typeof S.clearSelectedIds !== "function") return;

    if (all.checked) S.setSelectedIds(getVisibleIds());
    else S.clearSelectedIds();

    rerender();
  }

  async function deleteSelected(){
    if (!S || typeof S.getSelectedIds !== "function" || typeof S.clearSelectedIds !== "function"){
      return safeToast("Error", "State no soporta selección múltiple.");
    }

    const ids = (S.getSelectedIds() || []).map(x => String(x || "")).filter(Boolean);
    if (ids.length === 0) return;

    const ok = window.confirm(`¿Eliminar ${ids.length} evento(s) seleccionados? Esta acción no se puede deshacer.`);
    if (!ok) return;

    try{
      const Core = window.PrioridadDBCore || {};
      const db = (Core.assertDb && typeof Core.assertDb === "function") ? Core.assertDb() : window.db;
      const COL = Core.COL || "events";

      if (!db || !db.collection) throw new Error("Firestore no inicializado.");

      safeToast("Eliminando", `Eliminando ${ids.length} evento(s)...`);
      const msg = document.getElementById("msg");
      let i = 0;

      for (const id of ids){
        await db.collection(COL).doc(String(id)).delete();
        removeCacheRow(id);

        i++;
        if (msg) msg.textContent = `Eliminando... ${i}/${ids.length}`;
        rerender();
      }

      S.clearSelectedIds();
      rerender();
      safeToast("Eliminado", `Eventos eliminados correctamente (${ids.length}).`);
      if (msg) msg.textContent = "";
    }catch(err){
      console.error(err);
      safeToast("Error", "No se pudieron eliminar los eventos seleccionados.");
    }
  }

  // =========================
  // ✅ Familias: asignar y quitar
  // =========================
  function getPickedFamilyId(){
    const host = document.getElementById("boardHost");
    if (!host) return "";
    const sel = host.querySelector('select[data-action="familyPick"]');
    return String(sel?.value || "").trim();
  }

  async function assignFamilyToSelected(){
    const familyId = getPickedFamilyId();
    if (!familyId) return safeToast("Aviso", "Elige una familia.");

    if (!S || typeof S.getSelectedIds !== "function") return safeToast("Error", "Selección múltiple no disponible.");

    const ids = (S.getSelectedIds() || []).map(x => String(x || "")).filter(Boolean);
    if (!ids.length) return;

    try{
      safeToast("Familia", `Asignando ${ids.length} evento(s)...`);
      const msg = document.getElementById("msg");
      let i = 0;

      for (const id of ids){
        await Patch.updateEventPatch(id, { familyId });
        updateCacheRow(id, { familyId });
        i++;
        if (msg) msg.textContent = `Asignando... ${i}/${ids.length}`;
      }

      rerender();
      safeToast("Familia", "Asignación completada.");
      if (msg) msg.textContent = "";
    }catch(err){
      console.error(err);
      safeToast("Error", "No se pudo asignar la familia.");
    }
  }

  async function removeFamilyFromSelected(){
    if (!S || typeof S.getSelectedIds !== "function") return safeToast("Error", "Selección múltiple no disponible.");

    const ids = (S.getSelectedIds() || []).map(x => String(x || "")).filter(Boolean);
    if (!ids.length) return;

    try{
      safeToast("Familia", `Quitando familia a ${ids.length} evento(s)...`);
      const msg = document.getElementById("msg");
      let i = 0;

      for (const id of ids){
        await Patch.updateEventPatch(id, { familyId: "" });
        updateCacheRow(id, { familyId: "" });
        i++;
        if (msg) msg.textContent = `Quitando... ${i}/${ids.length}`;
      }

      rerender();
      safeToast("Familia", "Familia quitada.");
      if (msg) msg.textContent = "";
    }catch(err){
      console.error(err);
      safeToast("Error", "No se pudo quitar la familia.");
    }
  }

  async function assignFamilyToSingle(id, familyId){
    const eid = String(id || "");
    const fid = String(familyId || "");
    if (!eid || !fid) return;

    try{
      await Patch.updateEventPatch(eid, { familyId: fid });
      updateCacheRow(eid, { familyId: fid });
      rerender();
      safeToast("Familia", "Evento asignado a familia.");
    }catch(err){
      console.error(err);
      safeToast("Error", "No se pudo asignar el evento a la familia.");
    }
  }

  function toggleFamilyUi(id){
    if (!S || typeof S.toggleFamilyCollapsed !== "function") return;
    S.toggleFamilyCollapsed(id);
    rerender();
  }

  // =========================
  // Drag state
  // =========================
  let dragId = "";
  let dragAllowUp = false;

  function onDragStart(e){
    if (e.target && (e.target.closest?.('select[data-action="setPriority"]'))) return;
    if (e.target && (e.target.closest?.('button[data-action="delete"]'))) return;
    if (e.target && (e.target.closest?.('input[data-action="select"], input[data-action="selectAll"]'))) return;

    const card = e.target?.closest?.('[data-card="1"]');
    if (!card) return;

    if (card.classList.contains("locked")){
      e.preventDefault();
      return;
    }

    dragId = String(card.dataset.id || "");
    dragAllowUp = card.dataset.allowUp === "1";

    try{
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", dragId);
    }catch(_){}
  }

  function onDragEnd(){
    dragId = "";
    dragAllowUp = false;
    document.querySelectorAll(".dropzone.over").forEach(z => z.classList.remove("over"));
    document.querySelectorAll(".familyBlock.over").forEach(z => z.classList.remove("over"));
  }

  function onDragOver(e){
    const fam = e.target?.closest?.('[data-family-drop="1"]');
    if (fam){
      e.preventDefault();
      fam.classList.add("over");
      return;
    }

    const dz = e.target?.closest?.("[data-dropzone]");
    if (!dz) return;
    e.preventDefault();
    dz.classList.add("over");
  }

  function onDragLeave(e){
    const fam = e.target?.closest?.('[data-family-drop="1"]');
    if (fam){
      fam.classList.remove("over");
      return;
    }

    const dz = e.target?.closest?.("[data-dropzone]");
    if (!dz) return;
    dz.classList.remove("over");
  }

  async function onDrop(e){
    // ✅ Drop sobre familia para asignar
    const fam = e.target?.closest?.('[data-family-drop="1"]');
    if (fam){
      e.preventDefault();
      fam.classList.remove("over");

      const fid = String(fam.dataset.familyId || "");
      const id = dragId || (()=>{ try{ return e.dataTransfer.getData("text/plain"); }catch(_){ return ""; } })();
      if (!id || !fid) return;

      await assignFamilyToSingle(id, fid);
      return;
    }

    // Drop normal por columna
    const dz = e.target?.closest?.("[data-dropzone]");
    if (!dz) return;

    e.preventDefault();
    dz.classList.remove("over");

    const targetStatus = String(dz.dataset.dropzone || "");
    const id = dragId || (()=>{ try{ return e.dataTransfer.getData("text/plain"); }catch(_){ return ""; } })();
    if (!id) return;

    const cache = S.getCache() || [];
    const item = cache.find(x => String(x.id) === String(id));
    if (!item) return safeToast("Error", "No se pudo leer el evento desde cache.");

    if (String(BR.normalizeStatus(item)) === String(targetStatus)) return;

    if (targetStatus === BR.STATUS.UP && !canMoveToStatus(item, targetStatus)){
      safeToast("Bloqueado", "Este evento no puede pasar al estado Subido.");
      return;
    }

    try{
      await Patch.updateEventPatch(id, { status: targetStatus });
      updateCacheRow(id, { status: targetStatus });
      rerender();
      safeToast("Estado actualizado", `Evento movido a: ${targetStatus}.`);
    }catch(err){
      console.error(err);
      safeToast("Error", "No se pudo actualizar el estado.");
    }
  }

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

  async function onPriorityChange(e){
    const sel = e.target?.closest?.('select[data-action="setPriority"]');
    if (!sel) return;

    const id = String(sel.dataset.id || "");
    if (!id) return safeToast("Error", "No se pudo obtener el ID.");

    const level = normalizeLevel(sel.value);

    try{
      if (WPrio && typeof WPrio.updateEventPriorityLevel === "function"){
        await WPrio.updateEventPriorityLevel(id, level);
      }else{
        await Patch.updateEventPatch(id, {
          priorityLevel: level,
          priority: levelToLegacyNumber(level)
        });
      }

      updateCacheRow(id, {
        priorityLevel: level,
        priority: levelToLegacyNumber(level)
      });

      rerender();
      safeToast("Prioridad", `Actualizada a: ${level}.`);
    }catch(err){
      console.error(err);
      safeToast("Error", "No se pudo actualizar la prioridad.");
      try{
        const cache = S.getCache() || [];
        const item = cache.find(x => String(x.id) === String(id));
        if (item){
          const real = BR.normalizePriorityLevel(item);
          sel.value = real;
        }
      }catch(_){}
    }
  }

  function onClick(e){
    const clearBtn = e.target?.closest?.('button[data-action="clearSelection"]');
    if (clearBtn){
      if (S && typeof S.clearSelectedIds === "function"){
        S.clearSelectedIds();
        rerender();
      }else{
        safeToast("Aviso", "Selección múltiple no disponible en State.");
      }
      return;
    }

    const delSel = e.target?.closest?.('button[data-action="deleteSelected"]');
    if (delSel){
      deleteSelected();
      return;
    }

    const assign = e.target?.closest?.('button[data-action="assignFamily"]');
    if (assign){
      assignFamilyToSelected();
      return;
    }

    const rem = e.target?.closest?.('button[data-action="removeFamily"]');
    if (rem){
      removeFamilyFromSelected();
      return;
    }

    const togFam = e.target?.closest?.('button[data-action="toggleFamily"]');
    if (togFam){
      const id = String(togFam.dataset.id || "");
      if (id) toggleFamilyUi(id);
      return;
    }

    const del = e.target?.closest?.('button[data-action="delete"]');
    if (del){
      const id = del.dataset.id || "";
      if (!id) return safeToast("Error", "No se pudo obtener el ID.");
      deleteEventById(id);
      return;
    }

    const btn = e.target?.closest?.('button[data-action="edit"]');
    if (btn){
      const id = btn.dataset.id || "";
      if (!id) return safeToast("Error", "No se pudo obtener el ID.");
      openModalById(id);
      return;
    }
  }

  function wire(){
    const host = document.getElementById("boardHost");
    if (!host){
      console.warn("No existe #boardHost");
      return;
    }

    if (host.dataset.wired === "1") return;
    host.dataset.wired = "1";

    host.addEventListener("click", onClick);

    host.addEventListener("change", onSelectionChange);
    host.addEventListener("change", onSelectAllChange);
    host.addEventListener("change", onPriorityChange);

    host.addEventListener("dragstart", onDragStart);
    host.addEventListener("dragend", onDragEnd);

    host.addEventListener("dragover", onDragOver);
    host.addEventListener("dragleave", onDragLeave);
    host.addEventListener("drop", onDrop);

    console.log("✅ PrioridadBoardHandlers.wire() OK");
  }

  window.PrioridadBoardHandlers = { wire, rerender };
})();