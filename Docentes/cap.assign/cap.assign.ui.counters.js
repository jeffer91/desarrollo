/* =========================================================
Nombre del archivo: cap.assign.ui.counters.js
Ruta - Ubicación: /cap.assign/cap.assign.ui.counters.js
Función o funciones:
- renderCounters(state, visibleRows)
========================================================= */

import { $ } from "./cap.assign.dom.js";
import { pendCount } from "./cap.assign.pending.js";

export function renderCounters(state, visibleRows){
  const total = (state.S.docentes || []).length;

  const capId = state.S.capSelectedId;
  let inCount = 0;
  let outCount = 0;

  (state.S.docentes || []).forEach(d => {
    if (!capId) return;
    const caps = d.capacitaciones || [];
    if (caps.includes(capId)) inCount++;
    else outCount++;
  });

  const selCount = state.S.selectedDocIds.size;
  const pCount = pendCount(state);

  const chipTotal = $("chipTotal");
  const chipIn = $("chipIn");
  const chipOut = $("chipOut");
  const chipSel = $("chipSel");
  const chipPend = $("chipPend");

  if (chipTotal) chipTotal.textContent = `Total: ${total}`;
  if (chipIn) chipIn.textContent = `EN: ${capId ? inCount : 0}`;
  if (chipOut) chipOut.textContent = `FUERA: ${capId ? outCount : 0}`;
  if (chipSel) chipSel.textContent = `Seleccionados: ${selCount}`;
  if (chipPend) chipPend.textContent = `Pendientes: ${pCount}`;
}
