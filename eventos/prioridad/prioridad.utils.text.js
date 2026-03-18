/* =========================================================
Nombre del archivo: prioridad.utils.text.js
Ruta: /prioridad/prioridad.utils.text.js
Función:
- escape HTML + safe string
========================================================= */
(function(){
  function s(x){ return (x===null || x===undefined) ? "" : String(x); }
  function esc(x){
    return s(x)
      .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
      .replaceAll('"',"&quot;").replaceAll("'","&#039;");
  }
  window.PrioridadText = { s, esc };
})();
