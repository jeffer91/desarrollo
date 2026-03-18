/* =========================================================
Nombre del archivo: prioridad.utils.dom.js
Ruta: /prioridad/prioridad.utils.dom.js
Función:
- Helpers DOM mínimos
========================================================= */
(function(){
  function $(id){ return document.getElementById(id); }
  function qs(sel, root=document){ return root.querySelector(sel); }
  function qsa(sel, root=document){ return Array.from(root.querySelectorAll(sel)); }
  function on(el, ev, fn){ if (el) el.addEventListener(ev, fn); }
  window.PrioridadDOM = { $, qs, qsa, on };
})();
