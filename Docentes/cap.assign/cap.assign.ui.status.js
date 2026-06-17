/* =========================================================
Nombre del archivo: cap.assign.ui.status.js
Ruta - Ubicación: /cap.assign/cap.assign.ui.status.js
Función o funciones:
- setStatus(text, type)
========================================================= */

import { msg } from "./cap.assign.utils.js";

export function setStatus(text, type){
  msg(text, type || "info");
}
