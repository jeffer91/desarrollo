/* =========================================================
Nombre del archivo: cap.manage.utils.js
Ruta - Ubicación: /cap.manage/cap.manage.utils.js
Función o funciones:
- MONTHS: catálogo meses
- cleanSpaces(): normaliza texto
- clampYear(): controla rango año
- msg(): mensajes de estado
- fillMonthsSelect(): llena select de meses
- setFormModeTitle(): cambia título y botón según modo
========================================================= */

import { $ } from "./cap.manage.dom.js";

export const MONTHS = [
  { v:"01", t:"Enero" }, { v:"02", t:"Febrero" }, { v:"03", t:"Marzo" },
  { v:"04", t:"Abril" }, { v:"05", t:"Mayo" }, { v:"06", t:"Junio" },
  { v:"07", t:"Julio" }, { v:"08", t:"Agosto" }, { v:"09", t:"Septiembre" },
  { v:"10", t:"Octubre" }, { v:"11", t:"Noviembre" }, { v:"12", t:"Diciembre" }
];

export function cleanSpaces(s){
  return String(s || "").replace(/\s+/g, " ").trim();
}

export function clampYear(raw){
  const n = Number(String(raw || "").replace(/[^\d]/g, ""));
  const y = Number.isFinite(n) ? n : new Date().getFullYear();
  // rango razonable para tu uso institucional
  return Math.min(2100, Math.max(2000, y));
}

export function msg(text, type){
  const el = $("capMsg");
  if (!el) return;
  el.textContent = text || "";
  el.dataset.type = type || "info";
}

export function fillMonthsSelect(selectId, months, defaultValue){
  const sel = $(selectId);
  if (!sel) return;
  sel.innerHTML = "";
  for (const m of (months || [])){
    const o = document.createElement("option");
    o.value = m.v;
    o.textContent = m.t;
    sel.appendChild(o);
  }
  if (defaultValue) sel.value = defaultValue;
}

export function setFormModeTitle(isEdit){
  const t = $("capFormTitle");
  const b = $("capBtnSave");
  if (t) t.textContent = isEdit ? "Editar capacitación" : "Nueva capacitación";
  if (b) b.textContent = isEdit ? "Guardar cambios" : "Crear capacitación";
}
