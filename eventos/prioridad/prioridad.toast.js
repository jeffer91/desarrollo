/* =========================================================
Nombre del archivo: prioridad.toast.js
Ruta: /prioridad/prioridad.toast.js
Función:
- Toast simple y seguro (no revienta aunque falte host)
========================================================= */
(function(){
  function esc(s){
    return (s === null || s === undefined) ? "" : String(s)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;");
  }

  function toast(title, body){
    try{
      const host = document.getElementById("toastHost");
      if (!host){
        console.warn("[Toast]", title, body);
        return;
      }

      const div = document.createElement("div");
      div.className = "toast";
      div.innerHTML = `
        <div class="h">${esc(title)}</div>
        <div class="p">${esc(body)}</div>
      `;
      host.appendChild(div);

      setTimeout(() => {
        div.style.opacity = "0";
        div.style.transition = "opacity .25s ease";
        setTimeout(() => div.remove(), 260);
      }, 4200);
    }catch(err){
      console.warn("[Toast] fallo:", err);
    }
  }

  window.PrioridadToast = { toast };
})();
