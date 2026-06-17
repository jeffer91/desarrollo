/* =========================================================
Nombre del archivo: cap.assign.bindings.js
Ruta - Ubicación: /cap.assign/cap.assign.bindings.js
Función o funciones:
- bindAssignUI({ state })
- Enlaza filtros principales, tabla, acciones masivas y modal de asignación masiva
- Sincroniza el nuevo filtro de período en la pantalla y en el modal
- ✅ Nuevo: enlaza botón Exportar CSV
========================================================= */
import { $ } from "./cap.assign.dom.js";
import {
 onPeriodChange,
 onCapChange,
 onCarreraChange,
 onInOutChange,
 onSearchChange,
 onTableClick,
 onTableChange,
 onSelectAllVisible,
 onClearSelection,
 onBulkAddSelected,
 onBulkDelSelected,
 onSavePendings,
 onExportCsv,
 onMassOpen,
 onMassClose,
 onMassApply,
 onMassPeriodChange
} from "./cap.assign.usecases.js";
import { openErrorsPanel } from "./cap.assign.errors.js";

export function bindAssignUI({ state }){
 const periodSel = $("periodSelect");
 const capSel = $("capSelect");
 const carSel = $("carSelect");
 const inout = $("inoutSelect");
 const search = $("docSearch");
 const tableHost = $("docTableHost");
 const floatSave = $("floatSave");
 const btnSelAll = $("btnSelAll");
 const btnSelNone = $("btnSelNone");
 const btnAddSel = $("btnAddSel");
 const btnDelSel = $("btnDelSel");
 const btnErrors = $("btnErrors");
 const btnExport = $("btnExport");
 const btnMassOpen = $("btnMassOpen");
 const btnMassClose = $("btnMassClose");
 const btnMassApply = $("btnMassApply");
 const massModal = $("massModal");
 const massPeriodSelect = $("massPeriodSelect");

 if (periodSel){
  periodSel.addEventListener("change", (e) => onPeriodChange({ state, value: e.target.value }));
 }

 if (capSel){
  capSel.addEventListener("change", (e) => onCapChange({ state, value: e.target.value }));
 }

 if (carSel){
  carSel.addEventListener("change", (e) => onCarreraChange({ state, value: e.target.value }));
 }

 if (inout){
  inout.addEventListener("change", (e) => onInOutChange({ state, value: e.target.value }));
 }

 if (search){
  search.addEventListener("input", (e) => onSearchChange({ state, value: e.target.value }));
 }

 if (tableHost){
  tableHost.addEventListener("click", (e) => onTableClick({ state, event: e }));
  tableHost.addEventListener("change", (e) => onTableChange({ state, event: e }));
 }

 if (btnSelAll){
  btnSelAll.addEventListener("click", () => onSelectAllVisible({ state }));
 }

 if (btnSelNone){
  btnSelNone.addEventListener("click", () => onClearSelection({ state }));
 }

 if (btnAddSel){
  btnAddSel.addEventListener("click", () => onBulkAddSelected({ state }));
 }

 if (btnDelSel){
  btnDelSel.addEventListener("click", () => onBulkDelSelected({ state }));
 }

 if (floatSave){
  floatSave.addEventListener("click", () => onSavePendings({ state }));
 }

 if (btnErrors){
  btnErrors.addEventListener("click", () => openErrorsPanel({ state }));
 }

 if (btnExport){
  // Comentario técnico: el export se resuelve desde usecases para aprovechar
  // el estado actual de filtros sin duplicar lógica en la capa de UI.
  btnExport.addEventListener("click", () => onExportCsv({ state }));
 }

 if (btnMassOpen){
  btnMassOpen.addEventListener("click", () => onMassOpen({ state }));
 }

 if (btnMassClose){
  btnMassClose.addEventListener("click", () => onMassClose({ state }));
 }

 if (btnMassApply){
  btnMassApply.addEventListener("click", () => onMassApply({ state }));
 }

 if (massPeriodSelect){
  massPeriodSelect.addEventListener("change", (e) => onMassPeriodChange({ state, value: e.target.value }));
 }

 if (massModal){
  massModal.addEventListener("click", (e) => {
   const t = e && e.target ? e.target : null;
   if (!t) return;
   if (t.dataset && t.dataset.close === "1"){
    onMassClose({ state });
   }
  });
 }

 if (periodSel) periodSel.value = state.S.periodoId || "";
 if (inout) inout.value = state.S.inout || "all";
 if (carSel) carSel.value = state.S.carreraId || "";
 if (search) search.value = state.S.search || "";
}