/* =========================================================
Nombre del archivo: cap.assign.export.js
Ruta - Ubicación: /cap.assign/cap.assign.export.js
Función o funciones:
- exportCapAssignCsv({ state })
- Construye filas exportables según el contexto actual de filtros
- Descarga archivo CSV con docente, cédula, carrera y capacitación/capacitaciones
Reglas:
- Si la capacitación fue elegida explícitamente, exporta solo esa capacitación
- Si no hubo selección explícita pero sí período, exporta las capacitaciones del período
- Si no hay período ni capacitación explícita, exporta todas las asignaciones
========================================================= */
import { cleanSpaces } from "./cap.assign.utils.js";

export function exportCapAssignCsv({ state }){
 const payload = buildExportPayload({ state });

 if (!payload.rows.length){
  return {
   ok: false,
   count: 0,
   scope: payload.scope,
   filename: ""
  };
 }

 const csv = buildCsvText(payload.rows);
 const filename = buildFileName(payload);

 downloadTextFile({
  filename,
  text: csv,
  mimeType: "text/csv;charset=utf-8;"
 });

 return {
  ok: true,
  count: payload.rows.length,
  scope: payload.scope,
  filename
 };
}

function buildExportPayload({ state }){
 const S = state && state.S ? state.S : {};
 const docentes = Array.isArray(S.docentes) ? S.docentes : [];
 const capsCatalog = Array.isArray(S.capacitacionesAll) ? S.capacitacionesAll : [];
 const carreras = Array.isArray(S.carreras) ? S.carreras : [];
 const periodos = Array.isArray(S.periodos) ? S.periodos : [];

 const capMap = new Map(
  capsCatalog.map((c) => [String(c.id), c])
 );

 const carreraMap = new Map(
  carreras.map((c) => [String(c.id), String(c.nombre || c.id || "").trim()])
 );

 const periodoMap = new Map(
  periodos.map((p) => [String(p.id), String(p.label || p.id || "").trim()])
 );

 const scope = resolveExportScope(S);

 let selectedCaps = [];
 let periodLabel = "";
 let capLabel = "";

 if (scope === "cap"){
  const selected = capMap.get(String(S.capSelectedId || ""));
  if (selected){
   selectedCaps = [selected];
   capLabel = String(selected.nombre || selected.id || "").trim();
   periodLabel = String(selected.periodoLabel || "").trim();
  }
 }

 if (scope === "period"){
  const periodoId = String(S.periodoId || "").trim();
  selectedCaps = capsCatalog.filter((c) => String(c.periodoKey || "") === periodoId);
  periodLabel = periodoMap.get(periodoId) || String(S.periodoId || "").trim();
 }

 if (scope === "all"){
  selectedCaps = capsCatalog.slice();
 }

 const selectedCapIds = new Set(
  selectedCaps.map((c) => String(c.id))
 );

 const rows = filterBaseDocentes({ docentes, state: S }).map((d) => {
  const docCapIds = normalizeCapIds(d && d.capacitaciones);
  const matchedCaps = selectedCaps.filter((c) => selectedCapIds.has(String(c.id)) && docCapIds.has(String(c.id)));

  if (!matchedCaps.length){
   return null;
  }

  const carreraTxt =
   String(d.carreraNombre || "").trim() ||
   carreraMap.get(String(d.carreraId || "")) ||
   String(d.carreraId || "").trim();

  return {
   docente: String(d.nombre || "").trim(),
   cedula: String(d.cedula || d.id || "").trim(),
   carrera: carreraTxt,
   capacitaciones: buildCapacitacionesLabel({
    caps: matchedCaps,
    includePeriod: scope === "all"
   })
  };
 }).filter(Boolean);

 // Comentario técnico: orden alfabético estable para que el CSV salga consistente.
 rows.sort((a, b) => {
  const byName = String(a.docente || "").localeCompare(String(b.docente || ""), "es", { sensitivity: "base" });
  if (byName !== 0) return byName;
  return String(a.cedula || "").localeCompare(String(b.cedula || ""), "es", { sensitivity: "base" });
 });

 return {
  scope,
  rows,
  periodLabel,
  capLabel
 };
}

function resolveExportScope(S){
 const hasExplicitCap = !!(S && S.capTouched && String(S.capSelectedId || "").trim());
 const hasPeriodo = !!String((S && S.periodoId) || "").trim();

 // Comentario técnico: si la capacitación no fue elegida explícitamente,
 // no debe ganar sobre el período porque puede ser una auto-selección del catálogo.
 if (hasExplicitCap) return "cap";
 if (hasPeriodo) return "period";
 return "all";
}

function filterBaseDocentes({ docentes, state }){
 const q = cleanSpaces(state && state.search).toLowerCase();
 const carreraId = String((state && state.carreraId) || "").trim();

 return (Array.isArray(docentes) ? docentes : []).filter((d) => {
  if (carreraId && String(d && d.carreraId || "") !== carreraId){
   return false;
  }

  if (q){
   const nom = cleanSpaces(d && d.nombre).toLowerCase();
   const ced = cleanSpaces(d && (d.cedula || d.id)).toLowerCase();
   if (!nom.includes(q) && !ced.includes(q)){
    return false;
   }
  }

  return true;
 });
}

function normalizeCapIds(arr){
 const ids = Array.isArray(arr) ? arr : [];
 return new Set(ids.map((x) => String(x)));
}

function buildCapacitacionesLabel({ caps, includePeriod }){
 const rows = (Array.isArray(caps) ? caps : []).map((cap) => {
  const nombre = String((cap && cap.nombre) || (cap && cap.id) || "").trim();
  const periodo = String((cap && cap.periodoLabel) || "").trim();

  if (includePeriod && periodo){
   // Comentario técnico: cuando el export es global, se agrega el período
   // para evitar ambigüedad entre capacitaciones de distintos contextos.
   return `${nombre} · ${periodo}`;
  }

  return nombre;
 }).filter(Boolean);

 return rows.join(" | ");
}

function buildCsvText(rows){
 const headers = ["Docente", "Cédula", "Carrera", "Capacitaciones"];
 const lines = [headers.map(csvCell).join(";")];

 (Array.isArray(rows) ? rows : []).forEach((row) => {
  lines.push([
   csvCell(row.docente),
   csvCell(row.cedula),
   csvCell(row.carrera),
   csvCell(row.capacitaciones)
  ].join(";"));
 });

 return lines.join("\r\n");
}

function csvCell(value){
 const text = String(value == null ? "" : value);
 return `"${text.replace(/"/g, '""')}"`;
}

function buildFileName(payload){
 const base = "cap.assign.export";

 if (payload && payload.scope === "cap"){
  const cap = slugify(payload.capLabel || "capacitacion");
  return `${base}__capacitacion__${cap}.csv`;
 }

 if (payload && payload.scope === "period"){
  const periodo = slugify(payload.periodLabel || "periodo");
  return `${base}__periodo__${periodo}.csv`;
 }

 return `${base}__asignaciones.csv`;
}

function slugify(value){
 return String(value || "")
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .trim() || "archivo";
}

function downloadTextFile({ filename, text, mimeType }){
 const blob = new Blob(["\uFEFF", String(text || "")], {
  type: mimeType || "text/plain;charset=utf-8;"
 });

 const url = URL.createObjectURL(blob);
 const a = document.createElement("a");

 a.href = url;
 a.download = filename || "export.csv";
 a.style.display = "none";

 document.body.appendChild(a);
 a.click();
 a.remove();

 setTimeout(() => URL.revokeObjectURL(url), 0);
}