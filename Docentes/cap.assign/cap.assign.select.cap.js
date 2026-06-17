/* =========================================================
Nombre del archivo: cap.assign.select.cap.js
Ruta - Ubicación: /cap.assign/cap.assign.select.cap.js
Función o funciones:
- renderPeriodSelect(state)
- renderCapSelect(state)
========================================================= */
import { $ } from "./cap.assign.dom.js";

export function renderPeriodSelect(state){
  const sel = $("periodSelect");
  if (!sel) return;

  const periodos = (state && state.S && Array.isArray(state.S.periodos)) ? state.S.periodos : [];
  sel.innerHTML =
    `<option value="">Todos</option>` +
    periodos.map((p) => `<option value="${escapeAttr(p.id)}">${escapeHtml(p.label || p.id)}</option>`).join("");

  sel.value = (state && state.S && state.S.periodoId) ? state.S.periodoId : "";
}

export function renderCapSelect(state){
  const sel = $("capSelect");
  if (!sel) return;

  const caps = (state && state.S && Array.isArray(state.S.capacitaciones)) ? state.S.capacitaciones : [];
  const showPeriod = !(state && state.S && state.S.periodoId);

  sel.innerHTML =
    `<option value="">Seleccionar…</option>` +
    caps.map((c) => {
      const label = buildCapLabel(c, showPeriod);
      return `<option value="${escapeAttr(c.id)}">${escapeHtml(label)}</option>`;
    }).join("");

  sel.value = (state && state.S && state.S.capSelectedId) ? state.S.capSelectedId : "";
}

function buildCapLabel(cap, showPeriod){
  const nombre = String((cap && cap.nombre) || (cap && cap.id) || "").trim();
  const periodo = String((cap && cap.periodoLabel) || "").trim();

  if (showPeriod && periodo){
    return `${nombre} · ${periodo}`;
  }

  return nombre;
}

function escapeHtml(s){
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(s){
  return escapeHtml(s);
}