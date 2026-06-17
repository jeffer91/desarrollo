/* =========================================================
Nombre del archivo: regman.table.render.js
Ruta - Ubicación: /registro.manage/regman.table.render.js
Función:
- Render tabla (aplica filtros + búsqueda + ordenamiento)
========================================================= */
import { DOM } from "./regman.dom.js";
import { buildRegmanTableHTML } from "./regman.table.build.js";

function s(x){ return (x === null || x === undefined) ? "" : String(x); }
function norm(x){ return s(x).toLowerCase().trim(); }

function getFieldValue(row, key){
  const v = row ? row[key] : "";
  return s(v);
}

function compare(a, b, dir){
  const A = norm(a);
  const B = norm(b);
  const r = A.localeCompare(B, "es");
  return dir === "desc" ? -r : r;
}

export function createTableRenderer({ state }){
  function applyFilters(rows){
    const q = norm(state.S.search || "");
    const sx = s(state.S.filterSexo || "").trim();
    const cid = s(state.S.filterCarreraId || "").trim();

    return (rows || []).filter(d => {
      if (sx && s(d?.sexo).trim() !== sx) return false;
      if (cid && s(d?.carreraId).trim() !== cid) return false;

      if (!q) return true;
      const bag = [
        d?.cedula, d?.nombres, d?.apellidos,
        d?.carreraNombre, d?.celular, d?.titulo
      ].map(x => norm(x)).join(" ");
      return bag.includes(q);
    });
  }

  function applySort(rows){
    const key = s(state.S.sortKey || "").trim();
    const dir = s(state.S.sortDir || "asc").trim() || "asc";
    if (!key) return rows;

    const out = [...rows];
    out.sort((ra, rb) => compare(getFieldValue(ra, key), getFieldValue(rb, key), dir));
    return out;
  }

  function render(){
    const host = DOM.tableHost?.();
    if (!host) return;

    const base = Array.isArray(state.S.docentes) ? state.S.docentes : [];
    const filtered = applyFilters(base);
    const sorted = applySort(filtered);

    host.innerHTML = buildRegmanTableHTML({
      rows: sorted,
      careersIndex: state.S.careersIndex || null,
      selectedCedula: state.S.selectedCedula || "",
      sortKey: state.S.sortKey || "",
      sortDir: state.S.sortDir || "asc"
    });
  }

  return { render };
}
