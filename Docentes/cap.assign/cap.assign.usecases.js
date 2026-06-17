/* =========================================================
Nombre del archivo: cap.assign.usecases.js
Ruta - Ubicación: /cap.assign/cap.assign.usecases.js
Función o funciones:
- loadInitialData({ state })
- onPeriodChange / onCapChange / onCarreraChange / onInOutChange / onSearchChange
- onTableClick / onTableChange
- onSelectAllVisible / onClearSelection
- onBulkAddSelected / onBulkDelSelected
- onSavePendings
- onExportCsv
- onMassOpen / onMassClose / onMassApply / onMassPeriodChange
- Maneja sincronización entre filtro de período y catálogo visible de capacitaciones
========================================================= */
import { msg } from "./cap.assign.utils.js";
import { listarCarreras, listarDocentes, listarCapacitaciones } from "./cap.assign.data.read.js";
import { asignarCapacitacionADocentes, quitarCapacitacionADocentes } from "./cap.assign.data.write.js";
import { renderPeriodSelect, renderCapSelect } from "./cap.assign.select.cap.js";
import { filterDocentes } from "./cap.assign.filters.js";
import { renderDocTable } from "./cap.assign.table.render.js";
import { handleRowAction } from "./cap.assign.table.rowactions.js";
import { toggleSelection, selectAllVisible, clearSelection } from "./cap.assign.selection.js";
import { queueAdd, queueDel, applyBulkAdd, applyBulkDel, pendCount, clearPendings } from "./cap.assign.pending.js";
import { setFloatSaveCount, setFloatSaveEnabled } from "./cap.assign.float.save.js";
import { renderCounters } from "./cap.assign.ui.counters.js";
import { syncCheckboxesUI } from "./cap.assign.ui.checkboxes.js";
import { setStatus } from "./cap.assign.ui.status.js";
import { openMassModal, closeMassModal, fillMassPeriodSelect, fillMassCapSelect, setMassResult } from "./cap.assign.mass.ui.js";
import { resolveDocIdsFromText } from "./cap.assign.mass.parse.js";
import { buildDocViewModel, renderDocViewHTML } from "./cap.assign.doc.view.render.js";
import { openDocViewModal } from "./cap.assign.doc.view.ui.js";
import { exportCapAssignCsv } from "./cap.assign.export.js";

let _lastVisible = [];

export async function loadInitialData({ state }){
 setStatus("Cargando datos…", "info");

 const [carreras, docentes, caps] = await Promise.all([
  listarCarreras(),
  listarDocentes(),
  listarCapacitaciones()
 ]);

 state.setCarreras(carreras);
 state.setDocentes(docentes);
 state.setCapacitacionesAll(caps);
 state.setPeriodos(buildPeriodOptions(caps));

 reconcilePeriodo(state);
 applyPeriodoToCapCatalog(state);
 ensureCapSelected(state);

 // Comentario técnico: al iniciar, la capacitación visible puede quedar auto-seleccionada
 // por contexto; no debe tratarse como filtro explícito para el export.
 state.setCapTouched(false);

 renderStaticFilters(state);
 renderCatalogFilters(state);
 renderAll(state);

 setStatus("Listo. Puedes filtrar por período y asignar o quitar docentes.", "ok");
}

export function onPeriodChange({ state, value }){
 changePeriodoContext({
  state,
  value,
  clearPendingsMessage: "Se limpiaron pendientes porque cambiaste de período."
 });
}

export function onMassPeriodChange({ state, value }){
 changePeriodoContext({
  state,
  value,
  clearPendingsMessage: "Se limpiaron pendientes porque cambiaste de período desde el modal."
 });
}

export function onCapChange({ state, value }){
 const nextCapId = String(value || "").trim();
 const currentCapId = String(state.S.capSelectedId || "").trim();

 if (nextCapId === currentCapId){
  renderCatalogFilters(state);
  renderAll(state);
  return;
 }

 resetTransientStateForCatalogChange(state, "Se limpiaron pendientes porque cambiaste de capacitación.");

 state.setCapSelectedId(nextCapId);

 // Comentario técnico: aquí sí es una selección explícita del usuario;
 // el export debe respetarla por encima del auto-contexto del período.
 state.setCapTouched(true);

 renderCatalogFilters(state);
 renderAll(state);
}

export function onCarreraChange({ state, value }){
 state.setCarreraId(value || "");
 state.clearSelection();
 renderAll(state);
}

export function onInOutChange({ state, value }){
 state.setInOut(value || "all");
 state.clearSelection();
 renderAll(state);
}

export function onSearchChange({ state, value }){
 state.setSearch(value || "");
 state.clearSelection();
 renderAll(state);
}

export function onTableClick({ state, event }){
 const t = event && event.target ? event.target : null;
 if (!t) return;

 const btn = t.closest && t.closest("button[data-act]");
 if (!btn) return;

 const act = btn.dataset.act;
 const id = btn.dataset.id;
 if (!id) return;

 if (act === "view"){
  const docente = (state.S.docentes || []).find((d) => String(d.id) === String(id));
  if (!docente){
   msg("No se encontró el docente.", "warn");
   return;
  }

  const model = buildDocViewModel({
   docente,
   capsCatalog: state.S.capacitacionesAll || state.S.capacitaciones || []
  });

  openDocViewModal(renderDocViewHTML(model));
  return;
 }

 if (!state.S.capSelectedId){
  msg("Selecciona una capacitación primero.", "warn");
  return;
 }

 handleRowAction(state, btn);

 if (act === "add") queueAdd(state, id);
 if (act === "del") queueDel(state, id);

 renderPendingUI(state);
}

export function onTableChange({ state, event }){
 const t = event && event.target ? event.target : null;
 if (!t) return;

 const id = t.dataset && t.dataset.sel ? t.dataset.sel : "";
 if (!id) return;

 toggleSelection(state, id, !!t.checked);
 renderSelectionUI(state);
}

export function onSelectAllVisible({ state }){
 selectAllVisible(state, _lastVisible);
 renderSelectionUI(state);
 syncCheckboxesUI(state, _lastVisible);
}

export function onClearSelection({ state }){
 clearSelection(state);
 renderSelectionUI(state);
 syncCheckboxesUI(state, _lastVisible);
}

export function onBulkAddSelected({ state }){
 if (!state.S.capSelectedId){
  msg("Selecciona una capacitación primero.", "warn");
  return;
 }

 applyBulkAdd(state, Array.from(state.S.selectedDocIds));
 renderPendingUI(state);
}

export function onBulkDelSelected({ state }){
 if (!state.S.capSelectedId){
  msg("Selecciona una capacitación primero.", "warn");
  return;
 }

 applyBulkDel(state, Array.from(state.S.selectedDocIds));
 renderPendingUI(state);
}

export async function onSavePendings({ state }){
 try{
  if (!state.S.capSelectedId){
   msg("Selecciona una capacitación primero.", "warn");
   return;
  }

  const adds = Array.from(state.S.pendingAdd);
  const dels = Array.from(state.S.pendingDel);

  if (!adds.length && !dels.length){
   msg("No hay pendientes para guardar.", "info");
   return;
  }

  setStatus("Guardando pendientes…", "info");
  setFloatSaveEnabled(false);

  if (adds.length) await asignarCapacitacionADocentes(state.S.capSelectedId, adds);
  if (dels.length) await quitarCapacitacionADocentes(state.S.capSelectedId, dels);

  clearPendings(state);

  const docentes = await listarDocentes();
  state.setDocentes(docentes);

  renderAll(state);

  msg("Cambios guardados ✅", "ok");
  setStatus("Guardado exitoso.", "ok");
 } catch(err){
  msg(`Error al guardar: ${err && err.message ? err.message : String(err)}`, "err");
  setStatus("Error al guardar pendientes.", "err");
 } finally {
  renderPendingUI(state);
 }
}

export function onExportCsv({ state }){
 try{
  const res = exportCapAssignCsv({ state });

  if (!res || !res.ok){
   msg(getEmptyExportMessage(res ? res.scope : ""), "warn");
   setStatus("No hay datos para exportar con el filtro actual.", "warn");
   return;
  }

  msg(`Exportación lista: ${res.count} registro(s).`, "ok");
  setStatus(`Archivo exportado: ${res.filename}`, "ok");
 } catch(err){
  msg(`Error al exportar: ${err && err.message ? err.message : String(err)}`, "err");
  setStatus("Error al exportar archivo.", "err");
 }
}

/* =========================================================
Asignación masiva
========================================================= */
export function onMassOpen({ state }){
 renderCatalogFilters(state);
 setMassResult("Listo para procesar.", "info");
 openMassModal();
}

export function onMassClose(){
 closeMassModal();
}

export function onMassApply({ state }){
 try{
  const { capId, text } = getMassFormValues();

  if (!capId){
   setMassResult("Selecciona una capacitación en el modal.", "warn");
   return;
  }

  if (!text || !String(text).trim()){
   setMassResult("Pega al menos una cédula o un nombre.", "warn");
   return;
  }

  if (String(capId) !== String(state.S.capSelectedId || "")){
   resetTransientStateForCatalogChange(
    state,
    "Se limpiaron pendientes previos para aplicar la asignación masiva en otra capacitación."
   );
   state.setCapSelectedId(capId);
  }

  // Comentario técnico: la capacitación elegida en el modal sí representa una intención
  // explícita del usuario y debe quedar marcada como tal para el export.
  state.setCapTouched(true);

  const res = resolveDocIdsFromText({
   raw: text,
   docentes: state.S.docentes || []
  });

  if (!res.docIds.length){
   setMassResult("No se encontró ningún docente válido con el texto pegado.", "warn");
   return;
  }

  applyBulkAdd(state, res.docIds);

  renderCatalogFilters(state);
  renderPendingUI(state);
  renderAll(state);

  const info = `Agregados a pendientes: ${res.docIds.length}. No encontrados: ${res.notFound.length}. Ambiguos: ${res.ambiguous.length}.`;
  setMassResult(info, "ok");
  msg("Pendientes agregados desde asignación masiva ✅", "ok");

  closeMassModal();
 } catch(err){
  setMassResult(`Error en asignación masiva: ${err && err.message ? err.message : String(err)}`, "err");
 }
}

/* =========================================================
Internos
========================================================= */
function changePeriodoContext({ state, value, clearPendingsMessage }){
 const nextPeriodoId = String(value || "").trim();
 const currentPeriodoId = String(state.S.periodoId || "").trim();

 if (nextPeriodoId === currentPeriodoId){
  renderCatalogFilters(state);
  renderAll(state);
  return;
 }

 resetTransientStateForCatalogChange(state, clearPendingsMessage);

 state.setPeriodoId(nextPeriodoId);

 reconcilePeriodo(state);
 applyPeriodoToCapCatalog(state);
 ensureCapSelected(state);

 // Comentario técnico: al cambiar período, la capacitación visible pasa a depender
 // del nuevo catálogo filtrado; por eso se resetea el flag de selección explícita.
 state.setCapTouched(false);

 renderCatalogFilters(state);
 renderAll(state);

 if (state.S.periodoId && !(state.S.capacitaciones || []).length){
  setStatus("El período seleccionado no tiene capacitaciones registradas.", "warn");
  return;
 }

 setStatus("Filtro de período aplicado.", "info");
}

function renderAll(state){
 const visible = filterDocentes(state);
 _lastVisible = visible;
 renderDocTable(state, visible);
 renderCounters(state, visible);
 renderPendingUI(state);
 syncCheckboxesUI(state, visible);
}

function renderSelectionUI(state){
 renderCounters(state, _lastVisible);
}

function renderPendingUI(state){
 const n = pendCount(state);
 setFloatSaveCount(n);
 setFloatSaveEnabled(n > 0);
 renderCounters(state, _lastVisible);
}

function renderStaticFilters(state){
 renderCarrerasSelect(state);
}

function renderCatalogFilters(state){
 renderPeriodSelect(state);
 renderCapSelect(state);
 fillMassPeriodSelect(state);
 fillMassCapSelect(state);
}

function renderCarrerasSelect(state){
 const sel = document.getElementById("carSelect");
 if (!sel) return;

 const rows = state.S.carreras || [];
 const opts = [`<option value="">Todas</option>`].concat(
  rows.map((r) => `<option value="${escapeAttr(r.id)}">${escapeHtml(r.nombre || r.id)}</option>`)
 );

 sel.innerHTML = opts.join("");
 sel.value = state.S.carreraId || "";
}

function resetTransientStateForCatalogChange(state, warningMessage){
 const hadPendings = pendCount(state) > 0;
 state.clearSelection();

 if (hadPendings){
  clearPendings(state);
  if (warningMessage){
   msg(warningMessage, "warn");
  }
 }
}

function reconcilePeriodo(state){
 const validIds = new Set((state.S.periodos || []).map((p) => String(p.id)));
 if (state.S.periodoId && !validIds.has(String(state.S.periodoId))){
  state.setPeriodoId("");
 }
}

function applyPeriodoToCapCatalog(state){
 const all = Array.isArray(state.S.capacitacionesAll) ? state.S.capacitacionesAll : [];
 const periodoId = String(state.S.periodoId || "").trim();

 const filtered = periodoId
  ? all.filter((c) => String(c.periodoKey || "") === periodoId)
  : all.slice();

 state.setCapacitaciones(filtered);
}

function ensureCapSelected(state){
 const filtered = Array.isArray(state.S.capacitaciones) ? state.S.capacitaciones : [];
 const currentCapId = String(state.S.capSelectedId || "").trim();
 const exists = filtered.some((c) => String(c.id) === currentCapId);

 if (exists) return;

 state.setCapSelectedId(filtered.length ? String(filtered[0].id) : "");
}

function buildPeriodOptions(caps){
 const map = new Map();

 (Array.isArray(caps) ? caps : []).forEach((cap) => {
  const id = String(cap.periodoKey || "__sin_periodo__");
  if (!map.has(id)){
   map.set(id, {
    id,
    label: String(cap.periodoLabel || "Sin período"),
    sortValue: getPeriodoSortValue(cap)
   });
  }
 });

 return Array.from(map.values()).sort((a, b) => {
  const bySort = Number(b.sortValue || 0) - Number(a.sortValue || 0);
  if (bySort !== 0) return bySort;
  return String(a.label || "").localeCompare(String(b.label || ""), "es", { sensitivity: "base" });
 });
}

function getPeriodoSortValue(cap){
 const p = (cap && cap.periodo) || {};
 const yi = Number(p.anioIni || 0);
 const mi = Number(p.mesIni || 0);
 const yf = Number(p.anioFin || 0);
 const mf = Number(p.mesFin || 0);
 return (yi * 100 + mi) * 10000 + (yf * 100 + mf);
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

function getMassFormValues(){
 const capSel = document.getElementById("massCapSelect");
 const input = document.getElementById("massInput");

 return {
  capId: capSel ? capSel.value : "",
  text: input ? input.value : ""
 };
}

function getEmptyExportMessage(scope){
 if (scope === "cap"){
  return "No hay docentes asignados a la capacitación seleccionada para exportar.";
 }
 if (scope === "period"){
  return "No hay docentes con capacitaciones en el período seleccionado para exportar.";
 }
 return "No hay docentes con capacitaciones para exportar.";
}