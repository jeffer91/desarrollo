/* =========================================================
Nombre del archivo: ctr.flt.js
Ruta - Ubicación: /control/ctr.docs/backend/ctr.flt.js
Función o funciones:
- renderPeriodos(selectEl, selectedLabel)
- renderCaps(selectEl, caps[], selectedCapId)
- bindFilters({ selPeriodo, selCap, onPeriodoChange, onCapChange })
========================================================= */
import { escapeHtml } from "./ctr.util.js";

export function renderPeriodos(sel, selectedLabel){
  if (!sel) return;

  const cfg = window.CTR && window.CTR.Config ? window.CTR.Config : null;
  const periodos = cfg && typeof cfg.getPeriodos === "function" ? cfg.getPeriodos() : [];

  const html = [];
  html.push(`<option value="todos">Todos</option>`);
  periodos.forEach((p) => {
    html.push(`<option value="${escapeHtml(p.label)}">${escapeHtml(p.label)}</option>`);
  });

  sel.innerHTML = html.join("");
  sel.value = selectedLabel || "todos";
}

export function renderCaps(sel, caps, selectedCapId){
  if (!sel) return;

  const list = Array.isArray(caps) ? caps : [];
  const html = [];
  html.push(`<option value="">Seleccione…</option>`);

  list.forEach((c) => {
    html.push(`<option value="${escapeHtml(c.id)}">${escapeHtml(c.nombre || c.id)}</option>`);
  });

  sel.innerHTML = html.join("");
  sel.value = selectedCapId || "";
}

export function bindFilters(opts){
  const selPeriodo = opts && opts.selPeriodo;
  const selCap = opts && opts.selCap;

  const onPeriodoChange = opts && opts.onPeriodoChange;
  const onCapChange = opts && opts.onCapChange;

  if (selPeriodo){
    selPeriodo.addEventListener("change", async () => {
      if (typeof onPeriodoChange === "function"){
        await onPeriodoChange(selPeriodo.value || "todos");
      }
    });
  }

  if (selCap){
    selCap.addEventListener("change", async () => {
      if (typeof onCapChange === "function"){
        await onCapChange(selCap.value || "");
      }
    });
  }
}