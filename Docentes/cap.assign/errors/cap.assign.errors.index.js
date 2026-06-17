/* =========================================================
Nombre del archivo: cap.assign.errors.index.js
Ruta - Ubicación: /cap.assign/errors/cap.assign.errors.index.js
Función:
- API pública del módulo Errores (panel + editor)
========================================================= */

import { ensureErrorsUIInternal, openErrorsUI, closeErrorsUI } from "./cap.assign.errors.ui.js";
import { runErrorsAudit } from "./cap.assign.errors.audit.js";
import { renderErrorsReport } from "./cap.assign.errors.render.js";

export function ensureErrorsUI(){
  ensureErrorsUIInternal();
}

export function openErrorsPanel({ state, _rerun = false }){
  ensureErrorsUIInternal();

  // guarda state para acciones internas (rerun, etc.)
  window.__CAP_ASSIGN_ERRORS_STATE__ = state || null;

  openErrorsUI();

  const report = runErrorsAudit({ state });
  window.__CAP_ASSIGN_ERRORS_LAST__ = report;

  // si no es rerun, reset filtro a "all"
  const filter = document.getElementById("errorsFilter");
  if (filter && !_rerun) filter.value = "all";

  renderErrorsReport(report, filter ? filter.value : "all");
}

export function closeErrorsPanel(){
  closeErrorsUI();
}
