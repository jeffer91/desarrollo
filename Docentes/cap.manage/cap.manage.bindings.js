/* =========================================================
Nombre del archivo: cap.manage.bindings.js
Ruta - Ubicación: /cap.manage/cap.manage.bindings.js
Función o funciones:
- bindManageUI({state}): conecta eventos UI
- Delegación de eventos en tabla: edit/del + select fila
========================================================= */

import { $ } from "./cap.manage.dom.js";
import { clampYear } from "./cap.manage.utils.js";

import {
  onSaveCap,
  onClearForm,
  onSearchChange,
  onTableClick
} from "./cap.manage.usecases.js";

export function bindManageUI({ state }){
  // Year steppers
  bindYearStepper("capYearIni", "capYearIniDec", "capYearIniInc");
  bindYearStepper("capYearFin", "capYearFinDec", "capYearFinInc");

  // Botones
  const btnSave = $("capBtnSave");
  const btnClear = $("capBtnClear");
  if (btnSave) btnSave.addEventListener("click", () => onSaveCap({ state }));
  if (btnClear) btnClear.addEventListener("click", () => onClearForm({ state }));

  // Search
  const search = $("capSearch");
  if (search){
    search.addEventListener("input", (e) => onSearchChange({ state, value: e.target.value }));
  }

  // Tabla (delegación)
  const host = $("capTableHost");
  if (host){
    host.addEventListener("click", (e) => onTableClick({ state, event: e }));
  }
}

function bindYearStepper(inputId, decId, incId){
  const inp = $(inputId);
  const dec = $(decId);
  const inc = $(incId);
  if (!inp || !dec || !inc) return;

  const readY = () => clampYear(inp.value);

  const setY = (y) => { inp.value = String(clampYear(y)); };

  dec.addEventListener("click", () => setY(readY() - 1));
  inc.addEventListener("click", () => setY(readY() + 1));

  inp.addEventListener("blur", () => setY(readY()));
  inp.addEventListener("input", () => {
    // deja escribir, pero si mete letras, las limpia al blur
  });
}
