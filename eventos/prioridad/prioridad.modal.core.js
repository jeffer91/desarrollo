/* =========================================================
Nombre del archivo: prioridad.modal.core.js
Ruta: /prioridad/prioridad.modal.core.js
Función:
- open/close modal
========================================================= */
(function(){
  const { $ } = window.PrioridadDOM;

  let escBound = false;
  let onEscRef = null;

  function close(){
    const host = $("modalHost");
    if (!host) return;
    host.innerHTML = "";

    // limpiar ESC listener (solo uno)
    if (escBound && onEscRef){
      document.removeEventListener("keydown", onEscRef);
      escBound = false;
      onEscRef = null;
    }
  }

  function open(html){
    const host = $("modalHost");
    if (!host) return;

  host.innerHTML = `
    <div class="modalBack" data-action="closeOverlay">
      <div class="modal" role="dialog" aria-modal="true" aria-label="Editar evento">
        ${html}
      </div>
    </div>
  `;
  // FIX: usamos .modalBack (la clase real que tiene position:fixed + center) para que el popup no quede “abajo”.


    // cerrar por overlay (clic fuera del modal)
    const overlay = host.querySelector(".modalBack"); // FIX: misma clase que se renderiza y la que tiene el CSS correcto

    if (overlay){
      overlay.addEventListener("click", (e)=>{
        if (e.target === overlay) close();
      }, { once:true });
    }

    // ESC: un solo listener activo
    if (!escBound){
      onEscRef = (e)=>{
        if (e.key === "Escape") close();
      };
      document.addEventListener("keydown", onEscRef);
      escBound = true;
    }
  }

  window.PrioridadModalCore = { open, close };
})();
