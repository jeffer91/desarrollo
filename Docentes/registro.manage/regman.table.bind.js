/* =========================================================
Nombre del archivo: regman.table.bind.js
Ruta - Ubicación: /registro.manage/regman.table.bind.js
Función:
- Bind tabla:
  - click fila => onPick
  - edición inline => onInlineSave (blur/change)
  - click cabecera => setSort + render
========================================================= */
import { DOM } from "./regman.dom.js";

function s(x){ return (x === null || x === undefined) ? "" : String(x); }
function clean(x){ return s(x).replace(/\s+/g, " ").trim(); }

export function bindTable({ state, renderer, onPick, onInlineSave, careersIndex }){
  const host = DOM.tableHost?.();
  if (!host) return;

  // Click en cabecera (sort)
  host.addEventListener("click", (ev) => {
    const t = ev.target;
    if (!t) return;

    const btn = t.closest && t.closest("[data-sort]");
    if (btn){
      const key = btn.getAttribute("data-sort");
      const next = btn.getAttribute("data-next"); // "asc" por defecto
      const currentKey = s(state.S.sortKey || "");
      const currentDir = s(state.S.sortDir || "asc");

      let dir = "asc";
      if (currentKey === key){
        dir = currentDir === "asc" ? "desc" : "asc";
      }else{
        dir = (next === "desc") ? "desc" : "asc";
      }

      state.setSort(key, dir);
      renderer.render();
      return;
    }

    // IMPORTANTE: si el click fue sobre un control inline (select/input/etc.),
    // no debemos hacer onPick + render(), porque el re-render cierra el dropdown automáticamente.
    const interactive = t.closest && t.closest("select, input, textarea, button, label");
    if (interactive) return;

    const tr = t.closest && t.closest("tr[data-ced]");
    if (!tr) return;
    const ced = tr.getAttribute("data-ced");
    if (!ced) return;
    if (typeof onPick === "function") onPick(String(ced));
    renderer.render();
  });

  // inputs: guardar al salir
  host.addEventListener("blur", (ev) => {
    const el = ev.target;
    if (!el || !el.getAttribute) return;
    const ced = el.getAttribute("data-ced");
    const field = el.getAttribute("data-field");
    if (!ced || !field) return;

    const row = (state.S.docentes || []).find(x => String(x.cedula) === String(ced));
    if (!row) return;

    const value = (el.value ?? "").toString();
    const updated = { ...row, [field]: value };

    // sincronizar carreraNombre
    if (field === "carreraId"){
      const cid = clean(updated.carreraId);
      updated.carreraNombre = (careersIndex && cid) ? (careersIndex[cid] || "") : "";
    }

    if (typeof onInlineSave === "function") onInlineSave(updated);
  }, true);

  host.addEventListener("change", (ev) => {
    const el = ev.target;
    if (!el || !el.getAttribute) return;
    const tag = (el.tagName || "").toLowerCase();
    if (tag !== "select") return;

    const ced = el.getAttribute("data-ced");
    const field = el.getAttribute("data-field");
    if (!ced || !field) return;

    const row = (state.S.docentes || []).find(x => String(x.cedula) === String(ced));
    if (!row) return;

    const value = (el.value ?? "").toString();
    const updated = { ...row, [field]: value };

    if (field === "carreraId"){
      const cid = clean(updated.carreraId);
      updated.carreraNombre = (careersIndex && cid) ? (careersIndex[cid] || "") : "";
    }

    if (typeof onInlineSave === "function") onInlineSave(updated);
  });
}
