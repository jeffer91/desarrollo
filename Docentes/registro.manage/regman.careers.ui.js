/* =========================================================
Nombre del archivo: regman.careers.ui.js
Ruta - Ubicación: /registro.manage/regman.careers.ui.js
Función o funciones:
- fillCarreraSelect({ state, carreras }): llena select y guarda carreras en state
- buildCareersIndex(carreras): { [id]: nombre }
========================================================= */

import { DOM } from "./regman.dom.js";

export function buildCareersIndex(carreras){
  const idx = Object.create(null);
  for (const c of (carreras || [])){
    idx[c.id] = c.nombre || "";
  }
  return idx;
}

export function fillCarreraSelect({ state, carreras }){
  state.setCarreras(carreras || []);

  const sel = DOM.carrera();
  if (!sel) return;

  sel.innerHTML = "";

  const o0 = document.createElement("option");
  o0.value = "";
  o0.textContent = "Selecciona carrera…";
  sel.appendChild(o0);

  for (const c of (carreras || [])){
    const o = document.createElement("option");
    o.value = c.id;
    o.textContent = c.nombre;
    sel.appendChild(o);
  }
}
