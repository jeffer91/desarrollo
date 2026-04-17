/* =========================================================
Nombre del archivo: cap.assign.utils.js
Ruta - Ubicación: /cap.assign/cap.assign.utils.js
Función o funciones:
- cleanSpaces(): normaliza texto
- msg(): mensajes de estado
========================================================= */

import { $ } from "./cap.assign.dom.js";

export function cleanSpaces(s){
  return String(s || "").replace(/\s+/g, " ").trim();
}

export function msg(text, type){
  const el = $("capMsg");
  if (!el) return;
  el.textContent = text || "";
  el.dataset.type = type || "info";
}
