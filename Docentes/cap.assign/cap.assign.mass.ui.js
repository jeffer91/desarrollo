/* =========================================================
Nombre del archivo: cap.assign.mass.ui.js
Ruta - Ubicación: /cap.assign/cap.assign.mass.ui.js
Función o funciones:
- openMassModal()
- closeMassModal()
- fillMassPeriodSelect(state)
- fillMassCapSelect(state)
- setMassResult(text, type)
========================================================= */
function $(id){
  return document.getElementById(id);
}

export function openMassModal(){
  const m = $("massModal");
  if (!m) return;
  m.dataset.open = "1";
  m.setAttribute("aria-hidden", "false");
}

export function closeMassModal(){
  const m = $("massModal");
  if (!m) return;
  m.dataset.open = "0";
  m.setAttribute("aria-hidden", "true");
}

export function fillMassPeriodSelect(state){
  const sel = $("massPeriodSelect");
  if (!sel) return;

  const periodos = (state && state.S && Array.isArray(state.S.periodos)) ? state.S.periodos : [];
  sel.innerHTML =
    `<option value="">Todos</option>` +
    periodos.map((p) => `<option value="${escapeAttr(p.id)}">${escapeHtml(p.label || p.id)}</option>`).join("");

  sel.value = (state && state.S && state.S.periodoId) ? state.S.periodoId : "";
}

export function fillMassCapSelect(state){
  const sel = $("massCapSelect");
  if (!sel) return;

  const caps = (state && state.S && Array.isArray(state.S.capacitaciones)) ? state.S.capacitaciones : [];
  const showPeriod = !(state && state.S && state.S.periodoId);

  sel.innerHTML =
    `<option value="">Seleccionar…</option>` +
    caps.map((c) => `<option value="${escapeAttr(c.id)}">${escapeHtml(buildCapLabel(c, showPeriod))}</option>`).join("");

  sel.value = (state && state.S && state.S.capSelectedId) ? state.S.capSelectedId : "";
}

export function setMassResult(text, type){
  const el = $("massResult");
  if (!el) return;
  el.textContent = text || "";
  el.dataset.type = type || "info";
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