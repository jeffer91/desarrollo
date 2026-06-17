/* =========================================================
Nombre del archivo: cap.assign.doc.view.ui.js
Ruta - Ubicación: /cap.assign/cap.assign.doc.view.ui.js
Función:
- bindDocViewModal(): wiring close + backdrop
- openDocViewModal(html)
- closeDocViewModal()
========================================================= */

function $(id){
  return document.getElementById(id);
}

export function openDocViewModal(html){
  const modal = $("docViewModal");
  const body = $("docViewBody");
  if (!modal || !body) return;

  body.innerHTML = html || "";
  modal.dataset.open = "1";
  modal.setAttribute("aria-hidden", "false");
}

export function closeDocViewModal(){
  const modal = $("docViewModal");
  const body = $("docViewBody");
  if (!modal) return;

  modal.dataset.open = "0";
  modal.setAttribute("aria-hidden", "true");
  if (body) body.innerHTML = "";
}

export function bindDocViewModal(){
  const modal = $("docViewModal");
  const btnClose = $("docViewClose");

  if (btnClose){
    btnClose.addEventListener("click", () => closeDocViewModal());
  }

  if (modal){
    modal.addEventListener("click", (e) => {
      const t = e && e.target ? e.target : null;
      if (!t) return;
      if (t.dataset && t.dataset.close === "1"){
        closeDocViewModal();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e && e.key === "Escape"){
      const m = $("docViewModal");
      if (m && m.dataset.open === "1") closeDocViewModal();
    }
  });
}
