/* =========================================================
Nombre del archivo: prioridad.modal.handlers.js
Ruta: /prioridad/prioridad.modal.handlers.js
Función:
- Guardar modal, regenerar alertas, agregar avance
- Ajustado:
  - priorityLevel (alta/media/baja)
  - allowElevated (true/false)
  - status "subido" solo si allowElevated=true
- Anti-crash: Toast/Modal/Render opcionales
- ✅ NUEVO: Autosave (debounce) al cambiar campos del modal (sin afectar "Avance")
========================================================= */

(function(){
  const DOM = window.PrioridadDOM || {};
  const $ = DOM.$ || ((id)=>document.getElementById(id));

  const D = window.PrioridadDate;
  const Gen = window.PrioridadAlertsGen;

  const Read = window.PrioridadDBRead;
  const Patch = window.PrioridadDBWritePatch;
  const WAlerts = window.PrioridadDBWriteAlerts;
  const WProg = window.PrioridadDBWriteProgress;

  const S = window.PrioridadState;
  const F = window.PrioridadFilters;
  const BR = window.PrioridadBoardRender;

  function safeToast(title, body){
    const Toast = window.PrioridadToast;
    if (Toast && typeof Toast.toast === "function"){
      Toast.toast(title, body);
      return;
    }
    console.warn("[Toast fallback]", title, body);
    const msg = document.getElementById("msg");
    if (msg) msg.textContent = `${title}: ${body}`;
  }

  function safeReopenModalWithItem(item){
    const Modal = window.PrioridadModalCore;
    const ModalRender = window.PrioridadModalRender;

    if (!Modal || typeof Modal.open !== "function") return;
    if (!ModalRender || typeof ModalRender.build !== "function") return;

    Modal.open(ModalRender.build(item));
  }

  function normalizePriorityLevel(v){
    const s = String(v || "").toLowerCase().trim();
    if (s === "alta" || s === "media" || s === "baja") return s;
    return "media";
  }

  function buildPatchFromModal(){
    const kind = $("mKind")?.value || "trabajo";

    const priorityLevel = normalizePriorityLevel($("mPriorityLevel")?.value || "media");

    const allowElevated = ($("mAllowElevated")?.value === "true");

    let status = $("mStatus")?.value || "pendiente";
    // ✅ Regla: si eligen "subido" pero allowElevated es false, corregimos
    if (status === "subido" && allowElevated !== true){
      status = "en_progreso";
    }

    const needsAlerts = ($("mNeedsAlerts")?.value === "true");

    const startAt = $("mStartAt")?.value ? new Date($("mStartAt").value).toISOString() : null;
    const deadline = $("mDeadline")?.value ? new Date($("mDeadline").value).toISOString() : null;

    // Compat legacy priority numérico para no romper lecturas antiguas
    const legacyPriority = (priorityLevel === "alta") ? 5 : (priorityLevel === "baja" ? 1 : 3);

    return { kind, priorityLevel, priority: legacyPriority, allowElevated, status, needsAlerts, startAt, deadline };
  }

  function updateCacheRow(id, patch){
    try{
      const next = (S.getCache() || []).map(r =>
        (String(r.id)===String(id)) ? ({ ...r, ...patch }) : r
      );
      S.setCache(next);

      // ✅ Re-render board
      const filtered = F.applyFilters(S.getCache());
      if (BR && typeof BR.renderBoard === "function") BR.renderBoard(filtered);
    }catch(err){
      console.error("[ModalHandlers] updateCacheRow error:", err);
    }
  }

  async function saveModal(id){
    try{
      const patch = buildPatchFromModal();
      await Patch.updateEventPatch(id, patch);

      updateCacheRow(id, patch);

      const fresh = await Read.getEvent(id);
      if (fresh) safeReopenModalWithItem(fresh);

      safeToast("Guardado", "Cambios guardados correctamente.");
    }catch(err){
      console.error(err);
      safeToast("Error", "No se pudo guardar.");
    }
  }

  async function regenAlerts(id){
    try{
      const patch = buildPatchFromModal();

      if (patch.needsAlerts !== true){
        await WAlerts.setAlerts(id, []);
        updateCacheRow(id, { alerts: [], needsAlerts:false });
      }else{
        if (!patch.startAt || !patch.deadline){
          safeToast("Falta info", "Define Inicio y Fecha/Hora del evento.");
          return;
        }

        const isoList = Gen.generate3(patch.startAt, patch.deadline);
        const alerts = isoList.map(at => ({ at, channel:"app" }));

        await Patch.updateEventPatch(id, patch);
        await WAlerts.setAlerts(id, alerts);

        updateCacheRow(id, { ...patch, alerts });
      }

      const fresh = await Read.getEvent(id);
      if (fresh) safeReopenModalWithItem(fresh);

      safeToast("Alertas", "Alertas regeneradas (laborables).");
    }catch(err){
      console.error(err);
      safeToast("Error", "No se pudieron regenerar alertas.");
    }
  }

  async function addProgress(id){
    const text = String($("mProgText")?.value || "").trim();
    if (!text){
      safeToast("Avance", "Escribe un avance.");
      return;
    }

    try{
      const item = { at: D.nowISO(), text };
      await WProg.appendProgress(id, item);

      const fresh = await Read.getEvent(id);
      if (fresh) safeReopenModalWithItem(fresh);

      const inp = $("mProgText");
      if (inp) inp.value = "";

      safeToast("Avance", "Avance agregado.");
    }catch(err){
      console.error(err);
      safeToast("Error", "No se pudo agregar el avance.");
    }
  }

  function wire(){
    const host = $("modalHost");
    if (!host){
      console.warn("No existe #modalHost");
      return;
    }

    if (host.dataset.wired === "1") return;
    host.dataset.wired = "1";

    // ✅ Autosave (debounce): guarda cambios al editar inputs/select del modal.
    // - Evita spam a Firestore
    // - Mantiene "Guardar" manual intacto
    // - No se dispara para acciones (botones) ni para el textarea de avance
    let autoT = null;

    const getModalId = ()=>(
      // Preferir state si existe (más estable)
      (S && typeof S.getSelectedId === "function" ? S.getSelectedId() : "") ||
      // Fallback: ID desde el botón Guardar del modal
      (host.querySelector('[data-action="saveModal"]')?.dataset?.id || "")
    );

    const scheduleAutoSave = ()=>{
      const id = getModalId();
      if (!id) return;

      clearTimeout(autoT);
      autoT = setTimeout(()=> saveModal(id), 650);
    };

    host.addEventListener("click", (e)=>{
      const Modal = window.PrioridadModalCore;

      const closeBtn = e.target?.closest?.('[data-action="closeModal"]');
      if (closeBtn){
        if (Modal && typeof Modal.close === "function") Modal.close();
        return;
      }

      const saveBtn = e.target?.closest?.('[data-action="saveModal"]');
      if (saveBtn){ saveModal(saveBtn.dataset.id); return; }

      const regenBtn = e.target?.closest?.('[data-action="regenAlerts"]');
      if (regenBtn){ regenAlerts(regenBtn.dataset.id); return; }

      const progBtn = e.target?.closest?.('[data-action="addProgress"]');
      if (progBtn){ addProgress(progBtn.dataset.id); return; }
    });

    // ✅ Autosave en cambios de campos del modal
    host.addEventListener("input", (e)=>{
      // No autosave al escribir avances (se guarda con su botón)
      if (e.target?.id === "mProgText") return;

      // No autosave por eventos internos de botones
      if (e.target?.closest?.('button,[data-action]')) return;

      scheduleAutoSave();
    });

    host.addEventListener("change", (e)=>{
      if (e.target?.id === "mProgText") return;
      if (e.target?.closest?.('button,[data-action]')) return;

      scheduleAutoSave();
    });

    console.log("✅ PrioridadModalHandlers.wire() OK");
  }

  window.PrioridadModalHandlers = { wire };
})();
