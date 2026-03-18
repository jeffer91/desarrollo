/* =========================================================
Nombre del archivo: menu.boot.js
Ubicación: /menu/menu.boot.js
Función o funciones:
- Boot del módulo menú
- Renderiza el menú superior
- Conecta handlers
- Refresca render en pageshow
- No rompe si el HTML no tiene #menuHost
========================================================= */
(function(){
  "use strict";

  function init(){
    const M = window.MenuRender;
    if (!M) return;

    try{
      if (typeof M.render === "function") M.render();
      if (typeof M.wire === "function") M.wire();
    }catch(err){
      console.error("[menu.boot] init error:", err);
    }
  }

  if (document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", init);
  }else{
    init();
  }

  window.addEventListener("pageshow", init);
})();