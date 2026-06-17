/* =========================================================
Nombre del archivo: cap.manage.dom.js
Ruta - Ubicación: /cap.manage/cap.manage.dom.js
Función o funciones:
- Helper DOM $()
- Helpers de lectura segura
========================================================= */

export function $(id){
  return document.getElementById(id);
}

export function val(id){
  const el = $(id);
  return el ? el.value : "";
}
