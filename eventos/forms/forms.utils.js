/* =========================================================
Nombre del archivo: forms.utils.js
Ruta: /forms.utils.js
Función o funciones:
- Helpers: escape HTML, ids, fechas
========================================================= */
(function(){
  function esc(x){
    return String(x ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function uid(prefix = "id"){
    return prefix + "_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
  }

  function nowISO(){
    return new Date().toISOString();
  }

  window.FormsUtils = {
    esc,
    uid,
    nowISO
  };
})();