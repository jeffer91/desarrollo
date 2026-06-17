/* =========================================================
Nombre del archivo: cap.assign.float.save.js
Ruta - Ubicación: /cap.assign/cap.assign.float.save.js
Función o funciones:
- setFloatSaveCount(n)
- setFloatSaveEnabled(enabled)
========================================================= */

import { $ } from "./cap.assign.dom.js";

export function setFloatSaveCount(n){
  const btn = $("floatSave");
  if (!btn) return;
  btn.textContent = `Guardar (${Number(n || 0)})`;
}

export function setFloatSaveEnabled(enabled){
  const btn = $("floatSave");
  if (!btn) return;
  btn.dataset.disabled = enabled ? "0" : "1";
  btn.disabled = !enabled;
}
