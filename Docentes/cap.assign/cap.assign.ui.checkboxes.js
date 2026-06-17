/* =========================================================
Nombre del archivo: cap.assign.ui.checkboxes.js
Ruta - Ubicación: /cap.assign/cap.assign.ui.checkboxes.js
Función o funciones:
- syncCheckboxesUI(state, visibleRows)
========================================================= */

import { $ } from "./cap.assign.dom.js";

export function syncCheckboxesUI(state, visibleRows){
  const host = $("docTableHost");
  if (!host) return;

  // marca solo los visibles
  (visibleRows || []).forEach(r => {
    const input = host.querySelector(`input[type="checkbox"][data-sel="${cssEscape(r.id)}"]`);
    if (input) input.checked = state.S.selectedDocIds.has(r.id);
  });
}

// fallback simple para ids con caracteres raros
function cssEscape(s){
  return String(s || "").replace(/"/g, '\\"');
}
