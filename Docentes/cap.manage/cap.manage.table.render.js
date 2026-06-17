/* =========================================================
Nombre del archivo: cap.manage.table.render.js
Ruta - Ubicación: /cap.manage/cap.manage.table.render.js
Función o funciones:
- renderCapTable(state): pinta tabla con filtros
- buildRowHTML(row): fila con acciones (edit/delete)

CORRECCIÓN (UI - Ordenamiento):
- Click en cabecera (Nombre/Periodo/Fechas/Horas/Detalles) ordena ASC/DESC.
- Estado de orden se guarda en state.S.__sort (propiedad dinámica).
- No toca otros archivos, ni rompe delegación de eventos de la tabla.
========================================================= */
import { $ } from "./cap.manage.dom.js";
import { cleanSpaces } from "./cap.manage.utils.js";

export function renderCapTable(state){
 const host = $("capTableHost");
 if (!host) return;

 // ✅ Estado de sort (dinámico; no requiere cambiar state.js)
 if (!state.S.__sort){
  state.S.__sort = { key: "createdAt", dir: "desc" }; // default visual similar a Firestore (desc)
 }

 const q = cleanSpaces(state.S.search).toLowerCase();

 let rows = (state.S.rows || []).filter(r => {
  if (!q) return true;

  const nom = cleanSpaces(r.nombre).toLowerCase();
  const per = periodoLabel(r).toLowerCase();

  // ✅ Búsqueda también por metadatos nuevos
  const meta = metaLabel(r).toLowerCase();

  return (nom.includes(q) || per.includes(q) || meta.includes(q));
 });

 // ✅ Ordena según cabecera seleccionada
 rows = sortRows(rows, state.S.__sort);

 host.innerHTML = `
 <table>
  <thead>
   <tr>
    ${thSort("Nombre", "nombre", state)}
    ${thSort("Periodo", "periodo", state)}
    ${thSort("Fechas", "fechas", state)}
    ${thSort("Horas", "horas", state)}
    ${thSort("Detalles", "detalles", state)}
    <th style="width:10%; text-align:right;">Acciones</th>
   </tr>
  </thead>
  <tbody>
   ${rows.length ? rows.map(r => buildRowHTML(state, r)).join("") : `
    <tr><td colspan="6" style="padding:14px; color:#475569;">Sin registros.</td></tr>
   `}
  </tbody>
 </table>
 `;

 // ✅ Listener de ordenamiento (una sola vez por render)
 // Comentario: usamos dataset guardado en los TH para no depender de IDs globales.
 const thead = host.querySelector("thead");
 if (thead && !thead.dataset.sortBound){
  thead.dataset.sortBound = "1";
  thead.addEventListener("click", (e) => {
   const th = e.target && e.target.closest ? e.target.closest("th[data-sort]") : null;
   if (!th) return;

   const key = th.dataset.sort;
   if (!key) return;

   // toggle dir si repite key, sino cambia key y pone asc
   const cur = state.S.__sort || { key: "createdAt", dir: "desc" };
   const same = cur.key === key;
   const nextDir = same ? (cur.dir === "asc" ? "desc" : "asc") : "asc";

   state.S.__sort = { key, dir: nextDir };
   renderCapTable(state); // re-render con nuevo orden (mínimo impacto)
  });
 }
}

function thSort(label, key, state){
 const s = state.S.__sort || {};
 const active = s.key === key;
 const arrow = active ? (s.dir === "asc" ? " ▲" : " ▼") : "";
 const style = [
  `width:${colWidth(key)};`,
  "cursor:pointer;",
  "user-select:none;",
  active ? "background: rgba(37,99,235,.14);" : ""
 ].join(" ");
 return `<th data-sort="${escapeAttr(key)}" style="${style}">${escapeHtml(label + arrow)}</th>`;
}

function colWidth(key){
 if (key === "nombre") return "30%";
 if (key === "periodo") return "16%";
 if (key === "fechas") return "16%";
 if (key === "horas") return "8%";
 if (key === "detalles") return "20%";
 return "auto";
}

function sortRows(rows, sort){
 const key = sort && sort.key ? sort.key : "createdAt";
 const dir = sort && sort.dir === "asc" ? 1 : -1;

 const get = (r) => sortValue(r, key);

 // Comentario: orden estable simple (si empatan, por nombre)
 return rows.slice().sort((a, b) => {
  const va = get(a);
  const vb = get(b);

  if (va < vb) return -1 * dir;
  if (va > vb) return  1 * dir;

  // tie-breaker por nombre (evita “saltos raros”)
  const na = cleanSpaces(a && a.nombre).toLowerCase();
  const nb = cleanSpaces(b && b.nombre).toLowerCase();
  if (na < nb) return -1;
  if (na > nb) return 1;
  return 0;
 });
}

function sortValue(r, key){
 if (!r) return "";

 if (key === "nombre"){
  return cleanSpaces(r.nombre).toLowerCase();
 }

 if (key === "periodo"){
  // Preferimos ordenar por (anioIni, mesIni) cuando exista
  const p = r.periodo || {};
  const yi = Number(p.anioIni);
  const mi = Number(String(p.mesIni || "").replace(/[^\d]/g, "")) || 0;
  if (Number.isFinite(yi) && yi > 0) return yi * 100 + mi;
  // fallback por label
  return periodoLabel(r).toLowerCase();
 }

 if (key === "fechas"){
  // Orden por fechaInicio; si no hay, usa fechaFin; si no hay, vacío
  const fi = isoToSortable(r.fechaInicio);
  const ff = isoToSortable(r.fechaFin);
  return fi || ff || "";
 }

 if (key === "horas"){
  const v = (r.horas ?? r.duracionHoras ?? r.duracion ?? r.horasTotales);
  const n = Number(v);
  return Number.isFinite(n) ? n : -1;
 }

 if (key === "detalles"){
  return metaLabel(r).toLowerCase();
 }

 if (key === "createdAt"){
  // Firestore Timestamp puede venir como {seconds,...}
  const c = r.createdAt;
  if (c && typeof c === "object" && typeof c.seconds === "number"){
   return c.seconds;
  }
  // fallback: vacío
  return 0;
 }

 return String(r[key] ?? "");
}

function isoToSortable(s){
 // "YYYY-MM-DD" => "YYYYMMDD" (string comparable) o "" si no sirve
 if (!s) return "";
 const str = String(s);
 const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if (!m) return "";
 return `${m[1]}${m[2]}${m[3]}`;
}

function buildRowHTML(state, row){
 const sel = (state.S.selectedId && state.S.selectedId === row.id);

 const periodo = periodoLabel(row);
 const fechas = fechasLabel(row);
 const horas = horasLabel(row);

 // ✅ Detalles visibles en su propia columna (Modalidad/Tipo/Ámbito/Imparte)
 const detalles = metaBadges(row);

 return `
 <tr data-id="${escapeAttr(row.id)}" style="${sel ? "background: rgba(37,99,235,.08);" : ""}">
  <td>
   <div style="font-weight:950;">${escapeHtml(row.nombre || "")}</div>
   <div style="font-size:12px; color:#475569;">ID: ${escapeHtml(row.id)}</div>
  </td>

  <td><span class="badge">${escapeHtml(periodo)}</span></td>
  <td><span class="badge">${escapeHtml(fechas)}</span></td>
  <td><span class="badge">${escapeHtml(horas)}</span></td>

  <td>
   ${detalles || `<span class="badge">—</span>`}
  </td>

  <td>
   <div class="actionbar">
    <button class="btn ghost" type="button" data-action="edit" data-id="${escapeAttr(row.id)}">Editar</button>
    <button class="btn ghost danger" type="button" data-action="del" data-id="${escapeAttr(row.id)}">Eliminar</button>
   </div>
  </td>
 </tr>
 `;
}

/* =========================================================
Labels (mapeo real Firestore)
========================================================= */
function periodoLabel(r){
 const p = r.periodo || {};
 const rawLabel = (p.periodoLabel || r.periodoLabel || "").toString().trim();

 const mesIniTxt = monthName(p.mesIni);
 const mesFinTxt = monthName(p.mesFin);

 const a = `${mesIniTxt || "??"} ${p.anioIni || "????"}`.trim();
 const b = `${mesFinTxt || "??"} ${p.anioFin || "????"}`.trim();

 if ((mesIniTxt && p.anioIni) || (mesFinTxt && p.anioFin)){
  return `${a} → ${b}`;
 }

 if (rawLabel){
  const m = rawLabel.match(/(\d{2})\/(\d{4})\s*[-–—]\s*(\d{2})\/(\d{4})/);
  if (m){
   const mi = monthName(m[1]) || m[1];
   const yi = m[2];
   const mf = monthName(m[3]) || m[3];
   const yf = m[4];
   return `${mi} ${yi} → ${mf} ${yf}`;
  }
  return rawLabel;
 }

 return `?? ???? → ?? ????`;
}

function fechasLabel(r){
 const ini = formatISODate(r.fechaInicio);
 const fin = formatISODate(r.fechaFin);
 if (!ini && !fin) return "—";
 return `${ini || "—"} → ${fin || "—"}`;
}

function horasLabel(r){
 const v = (r.horas ?? r.duracionHoras ?? r.duracion ?? r.horasTotales);
 if (v == null || v === "") return "—";
 return String(v);
}

/* =========================================================
✅ Metadatos (modalidad / tipo / ámbito / imparte)
========================================================= */
function metaLabel(r){
 const parts = [
  r.modalidad,
  r.tipoCapacitacion,
  r.tipoEvento,
  r.ambito,
  r.imparte
 ].map(x => cleanSpaces(x)).filter(Boolean);

 return parts.join(" ");
}

function metaBadges(r){
 const mod = cleanSpaces(r.modalidad);
 const tc = cleanSpaces(r.tipoCapacitacion);
 const te = cleanSpaces(r.tipoEvento);
 const am = cleanSpaces(r.ambito);
 const imp = cleanSpaces(r.imparte);

 const chips = [];
 if (mod) chips.push(chip(pretty(mod)));
 if (tc) chips.push(chip(pretty(tc)));
 if (te) chips.push(chip(pretty(te)));
 if (am) chips.push(chip(pretty(am)));
 if (imp) chips.push(chip(`Imparte: ${imp}`));

 if (!chips.length) return "";
 return `<div style="display:flex; flex-wrap:wrap; gap:6px;">${chips.join("")}</div>`;
}

function chip(txt){
 return `<span class="badge" style="font-weight:800; opacity:.95;">${escapeHtml(txt)}</span>`;
}

function pretty(s){
 const t = String(s || "").toLowerCase();
 if (t === "hibrida") return "Híbrida";
 if (t === "semipresencial") return "Semipresencial";
 if (t === "presencial") return "Presencial";
 if (t === "virtual") return "Virtual";
 if (t === "generica") return "Genérica";
 if (t === "especifica") return "Específica";
 if (t === "nacional") return "Nacional";
 if (t === "internacional") return "Internacional";
 return t ? (t.charAt(0).toUpperCase() + t.slice(1)) : "";
}

/* =========================================================
Helpers (mes en texto + fecha dd/mm/aaaa)
========================================================= */
function monthName(m){
 const n = parseInt(String(m || "").trim(), 10);
 if (!n || n < 1 || n > 12) return "";
 const meses = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
 ];
 return meses[n - 1];
}

function formatISODate(s){
 if (!s) return "";
 const str = String(s);
 const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
 if (!m) return str;
 const yyyy = m[1];
 const mm = m[2];
 const dd = m[3];
 const mesTxt = monthName(mm) || mm;
 return `${dd} ${mesTxt} ${yyyy}`;
}

/* =========================================================
Escape
========================================================= */
function escapeHtml(s){
 return String(s || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
.replace(/>/g, "&gt;")
// ✅ Escapa correctamente el símbolo ">" (antes lo convertía erróneamente a "&lt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#39;");
}
function escapeAttr(s){ return escapeHtml(s); }
