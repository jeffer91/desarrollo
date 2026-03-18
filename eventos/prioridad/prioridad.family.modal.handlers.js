/* =========================================================
Nombre del archivo: prioridad.family.modal.handlers.js
Ruta: /prioridad/prioridad.family.modal.handlers.js
Función:
- Abrir modal de crear familia
- Guardar familia en Firestore
- Recargar familias a State
- Re-render tablero
- Exponer: window.PrioridadFamilyModalHandlers
========================================================= */
(function(){
  const S = window.PrioridadState;
  const Toast = window.PrioridadToast;
  const Modal = window.PrioridadModalCore;
  const Render = window.PrioridadFamilyModalRender;

  const W = window.PrioridadDBFamiliesWrite;
  const R = window.PrioridadDBFamiliesRead;

  function toast(title, body){
    if (Toast && typeof Toast.toast === "function") return Toast.toast(title, body);
    const msg = document.getElementById("msg");
    if (msg) msg.textContent = `${title}: ${body}`;
  }

  function closeModalSafe(){
    try{
      if (Modal && typeof Modal.close === "function") return Modal.close();
      if (Modal && typeof Modal.hide === "function") return Modal.hide();
    }catch(_){}
    const host = document.getElementById("modalHost");
    if (host) host.innerHTML = "";
  }

  function openCreate(){
    if (!Modal || typeof Modal.open !== "function") return toast("Error", "ModalCore no disponible.");
    if (!Render || typeof Render.buildCreate !== "function") return toast("Error", "Render de familia no disponible.");
    Modal.open(Render.buildCreate());
    setTimeout(()=>{
      const inp = document.getElementById("familyLabel");
      if (inp) inp.focus();
    }, 0);
  }

  async function refreshFamilies(){
    try{
      if (!R || typeof R.listFamilies !== "function") return;
      const fams = await R.listFamilies();
      if (S && typeof S.setFamilies === "function") S.setFamilies(fams);
    }catch(err){
      console.error(err);
    }
  }

  async function saveFamily(){
    const inp = document.getElementById("familyLabel");
    const label = String(inp?.value || "").trim();

    if (!label) return toast("Aviso", "Escribe un nombre para la familia.");

    if (!W || typeof W.createFamily !== "function"){
      return toast("Error", "Writer de familias no disponible.");
    }

    try{
      toast("Guardando", "Creando familia...");
      await W.createFamily(label);

      await refreshFamilies();

      // Re-render
      const BH = window.PrioridadBoardHandlers;
      if (BH && typeof BH.rerender === "function") BH.rerender();

      closeModalSafe();
      toast("Familia", "Creada correctamente.");
    }catch(err){
      console.error(err);
      toast("Error", "No se pudo crear la familia.");
    }
  }

  function onClick(e){
    const openBtn = e.target?.closest?.("#btnNewFamily");
    if (openBtn){
      openCreate();
      return;
    }

    const closeBtn = e.target?.closest?.('[data-action="familyClose"]');
    if (closeBtn){
      closeModalSafe();
      return;
    }

    const saveBtn = e.target?.closest?.('[data-action="familySave"]');
    if (saveBtn){
      saveFamily();
      return;
    }
  }

  function onKeydown(e){
    // Enter para guardar si está el input activo
    if (e.key !== "Enter") return;
    const inp = document.getElementById("familyLabel");
    if (!inp) return;
    if (document.activeElement === inp){
      e.preventDefault();
      saveFamily();
    }
  }

  function wire(){
    if (document.body.dataset.familyWired === "1") return;
    document.body.dataset.familyWired = "1";

    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeydown);

    console.log("✅ PrioridadFamilyModalHandlers.wire() OK");
  }

  window.PrioridadFamilyModalHandlers = { wire, openCreate, refreshFamilies };
})();