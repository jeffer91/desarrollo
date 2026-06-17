/* =========================================================
Nombre del archivo: regman.confirm.ui.js
Ruta - Ubicación: /registro.manage/regman.confirm.ui.js
Función o funciones:
- confirmDanger(message): retorna true/false
========================================================= */

export function confirmDanger(message){
  return window.confirm(message || "¿Confirmas la acción?");
}
