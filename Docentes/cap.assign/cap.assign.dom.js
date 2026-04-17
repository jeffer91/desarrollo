/* =========================================================
Nombre del archivo: cap.assign.dom.js
Ruta - Ubicación: /cap.assign/cap.assign.dom.js
Función o funciones:
- Helper DOM $()
- val(): lectura segura de value
========================================================= */

export function $(id){
  return document.getElementById(id);
}

export function val(id){
  const el = $(id);
  return el ? el.value : "";
}
