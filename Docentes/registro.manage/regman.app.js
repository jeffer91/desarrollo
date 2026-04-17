/* =========================================================
Nombre del archivo: regman.app.js
Ruta - Ubicación: /registro.manage/regman.app.js
Función:
- Boot pantalla
- Carga carreras + docentes
- Guardar y borrar
- Buscador con predictor (datalist)
- Edición inline en tabla + guardado a Firebase
- Carga masiva por modal
- ✅ Botón Errores (badge + modal)
- ✅ FIX: normalizar cédulas de 9 dígitos en carga masiva/comparaciones
========================================================= */
import { createRegManageState } from "./regman.state.js";
import { createMsgUI } from "./regman.msg.ui.js";
import { DOM } from "./regman.dom.js";
import { listarCarreras } from "./regman.repo.carreras.js";
import { listarDocentes, upsertDocente } from "./regman.repo.docentes.js";
import { fillCarreraSelect, buildCareersIndex } from "./regman.careers.ui.js";
import { createTableRenderer } from "./regman.table.render.js";
import { bindTable } from "./regman.table.bind.js";
import { clearForm, fillForm } from "./regman.form.write.js";
import { saveOne } from "./regman.save.one.js";
import { deleteSelected } from "./regman.delete.one.js";
import { confirmDanger } from "./regman.confirm.ui.js";
import { validateDocente } from "./regman.validate.js";
import { normKey } from "./regman.utils.js";
import { createBulkUI } from "./regman.bulk.ui.js";
import { createNoticeUI } from "./regman.notice.ui.js";
import { createErrorsUI } from "./regman.errors.ui.js";

export async function bootRegManage(){
  const state = createRegManageState();
  const ui = createMsgUI();
  const notice = createNoticeUI({ DOM, ui });

  ui.msg("Cargando…", "info");

  // renderer
  const renderer = createTableRenderer({ state });

  // errores UI
  const errorsUI = createErrorsUI({
    DOM,
    state,
    validateDocente,
    onPick: (ced) => pickToForm(ced)
  });

  // ✅ hook: siempre actualizar badge de errores tras render
  const _render = renderer.render;
  renderer.render = () => {
    _render();
    errorsUI.updateBadge();
  };

  let careersIndex = Object.create(null);
  let careersNameToId = Object.create(null);

  function s(x){ return (x === null || x === undefined) ? "" : String(x); }
  function clean(x){ return s(x).replace(/\s+/g, " ").trim(); }
  function onlyDigits(x){ return /^[0-9]+$/.test(x || ""); }

  function normalizeCedula(x){
    let ced = s(x).replace(/\s+/g, "").replace(/^"+|"+$/g, "").trim();
    if (/^[0-9]{9}$/.test(ced)) ced = `0${ced}`;
    return ced;
  }

  function refreshSearchPredictor(){
    const dl = document.getElementById("regmanSearchList");
    if (!dl) return;

    const rows = Array.isArray(state.S.docentes) ? state.S.docentes : [];
    dl.innerHTML = rows.map(d => {
      const ced = clean(d.cedula);
      const nom = clean(d.nombres);
      const ape = clean(d.apellidos);
      const label = `${ape} ${nom}`.trim();
      return `<option value="${ced}">${label}</option>`;
    }).join("");
  }

  function refreshTableSearchPredictor(){
    const dl = DOM.tableSearchList?.();
    if (!dl) return;

    const rows = Array.isArray(state.S.docentes) ? state.S.docentes : [];
    dl.innerHTML = rows.map(d => {
      const ced = clean(d.cedula);
      const nom = clean(d.nombres);
      const ape = clean(d.apellidos);
      const label = `${ape} ${nom}`.trim();
      return `<option value="${ced}">${label}</option>`;
    }).join("");
  }

  function fillFilterCarrera(){
    const sel = DOM.filterCarrera?.();
    if (!sel) return;

    const current = (state.S.filterCarreraId || "").toString().trim();
    sel.innerHTML = "";

    const o0 = document.createElement("option");
    o0.value = "";
    o0.textContent = "Carrera: Todas";
    sel.appendChild(o0);

    for (const c of (state.S.carreras || [])){
      const o = document.createElement("option");
      o.value = (c.id || "").toString();
      o.textContent = (c.nombre || "").toString();
      if (o.value && o.value === current) o.selected = true;
      sel.appendChild(o);
    }
  }

  async function reloadAll(){
    ui.msg("Cargando carreras…", "info");
    const carreras = await listarCarreras();

    fillCarreraSelect({ state, carreras });
    careersIndex = buildCareersIndex(carreras);
    state.setCareersIndex(careersIndex);

    careersNameToId = Object.create(null);
    for (const c of (carreras || [])){
      const name = (c && c.nombre) ? String(c.nombre) : "";
      const key = normKey(name);
      if (key) careersNameToId[key] = c.id;
    }

    ui.msg("Cargando docentes…", "info");
    const docentes = await listarDocentes();

    state.setDocentes(docentes);
    refreshSearchPredictor();
    refreshTableSearchPredictor();
    fillFilterCarrera();
    renderer.render();
    ui.msg("Listo.", "ok");
  }

  function pickToForm(cedula){
    const targetCed = normalizeCedula(cedula);
    const row = state.S.docentes.find(x => normalizeCedula(x.cedula) === targetCed);
    if (!row) return;

    state.setSelectedCedula(row.cedula);
    fillForm(row);
    ui.msg("Docente cargado para editar/borrar.", "info");
  }

  function pickFromSearchValue(rawValue){
    const v = clean(rawValue);
    if (!v) return false;

    const ced = normalizeCedula(v);
    if (!onlyDigits(ced)) return false;

    const row = state.S.docentes.find(x => normalizeCedula(x.cedula) === ced);
    if (!row) return false;

    pickToForm(row.cedula);
    renderer.render();
    return true;
  }

  async function inlineSave(docente){
    try{
      const normalized = {
        ...docente,
        cedula: normalizeCedula(docente?.cedula)
      };

      const v = validateDocente(normalized);
      if (!v.ok){
        ui.msg(`No se pudo guardar edición: ${v.msg}`, "warn");
        return;
      }

      ui.msg("Guardando cambios en tabla…", "info");

      const cid = (normalized.carreraId || "").toString().trim();
      normalized.carreraNombre = (careersIndex && cid) ? (careersIndex[cid] || "") : "";

      const saved = await upsertDocente(normalized);
      const idx = state.S.docentes.findIndex(x => normalizeCedula(x.cedula) === normalizeCedula(saved.cedula));

      if (idx >= 0) state.S.docentes[idx] = { ...state.S.docentes[idx], ...saved };

      refreshSearchPredictor();
      refreshTableSearchPredictor();
      renderer.render();
      pickToForm(saved.cedula);
      ui.msg("Cambios guardados.", "ok");
    }catch(err){
      ui.msg(`Error al guardar edición: ${err && err.message ? err.message : String(err)}`, "err");
    }
  }

  const bulk = createBulkUI({ DOM, ui, validateDocente });

  async function bulkAdd(){
    const rows = bulk.getRows();
    if (!rows.length){
      notice.warn("No hay filas seleccionadas. Primero presiona Procesar y marca 'Incluir'.");
      return;
    }

    let ok = 0;
    let fail = 0;

    for (const d of rows){
      const docente = {
        ...d,
        cedula: normalizeCedula(d?.cedula)
      };

      const v = validateDocente(docente);
      if (!v.ok){
        fail++;
        continue;
      }

      try{
        const saved = await upsertDocente(docente);
        const idx = state.S.docentes.findIndex(x => normalizeCedula(x.cedula) === normalizeCedula(saved.cedula));

        if (idx >= 0) state.S.docentes[idx] = { ...state.S.docentes[idx], ...saved };
        else state.S.docentes.unshift(saved);

        ok++;

        if (bulk && typeof bulk.markAdded === "function"){
          bulk.markAdded(saved.cedula);
        }
      }catch(err){
        fail++;
        console.error("[bulkAdd] Error Firestore:", err);
        const msg = `[bulkAdd] Error al guardar: ${err && err.message ? err.message : String(err)}`;
        notice.err(msg);
      }
    }

    refreshSearchPredictor();
    refreshTableSearchPredictor();
    renderer.render();

    const modal = DOM.bulkModal?.();
    const modalOpen = !!modal && modal.hidden === false;

    if (modalOpen){
      if (fail){
        notice.warn(`Resumen: ${ok} agregados, ${fail} con error. Revisa consola (F12).`);
      }
    }else{
      ui.msg(`Agregado: ${ok} ok, ${fail} con error.`, fail ? "warn" : "ok");
    }
  }

  try{
    await reloadAll();

    // ✅ Errores: botón y cerrar
    if (DOM.btnErrors?.()){
      DOM.btnErrors().onclick = () => errorsUI.open();
    }

    if (DOM.errBtnClose?.()){
      DOM.errBtnClose().onclick = () => errorsUI.close();
    }

    if (DOM.search()){
      DOM.search().oninput = () => {
        state.setSearch(DOM.search().value || "");
        renderer.render();
      };

      DOM.search().onchange = () => {
        const val = DOM.search().value || "";
        const picked = pickFromSearchValue(val);
        if (!picked){
          state.setSearch(val);
          renderer.render();
        }
      };
    }

    // TABLA: buscador + filtros
    if (DOM.tableSearch?.()){
      DOM.tableSearch().oninput = () => {
        state.setSearch(DOM.tableSearch().value || "");
        renderer.render();
      };
    }

    if (DOM.filterSexo?.()){
      DOM.filterSexo().onchange = () => {
        state.setFilterSexo(DOM.filterSexo().value || "");
        renderer.render();
      };
    }

    if (DOM.filterCarrera?.()){
      DOM.filterCarrera().onchange = () => {
        state.setFilterCarreraId(DOM.filterCarrera().value || "");
        renderer.render();
      };
    }

    if (DOM.filterClear?.()){
      DOM.filterClear().onclick = () => {
        state.setSearch("");
        state.setFilterSexo("");
        state.setFilterCarreraId("");

        if (DOM.tableSearch?.()) DOM.tableSearch().value = "";
        if (DOM.filterSexo?.()) DOM.filterSexo().value = "";
        if (DOM.filterCarrera?.()) DOM.filterCarrera().value = "";

        renderer.render();
        ui.msg("Filtros limpiados.", "info");
      };
    }

    bindTable({
      state,
      renderer,
      onPick: (ced) => pickToForm(ced),
      onInlineSave: inlineSave,
      careersIndex
    });

    if (DOM.btnNew()){
      DOM.btnNew().onclick = () => {
        state.setSelectedCedula("");
        clearForm();
        if (DOM.search()) DOM.search().value = "";
        renderer.render();
        ui.msg("Modo: crear nuevo docente.", "info");
      };
    }

    if (DOM.btnSave()){
      DOM.btnSave().onclick = async () => {
        const res = await saveOne({ state, ui, careersIndex });
        if (res.ok){
          refreshSearchPredictor();
          refreshTableSearchPredictor();
          if (state.S.selectedCedula) pickToForm(state.S.selectedCedula);
          renderer.render();
        }
      };
    }

    if (DOM.btnDelete()){
      DOM.btnDelete().onclick = async () => {
        const ced = (state.S.selectedCedula || "").trim();
        if (!ced){
          ui.msg("Selecciona un docente para borrar.", "warn");
          return;
        }

        const ok = confirmDanger(`Vas a borrar al docente con cédula ${ced}. ¿Continuar?`);
        if (!ok) return;

        const res = await deleteSelected({ state, ui });
        if (res.ok){
          refreshSearchPredictor();
          refreshTableSearchPredictor();
          clearForm();
          if (DOM.search()) DOM.search().value = "";
          renderer.render();
        }
      };
    }

    if (DOM.btnLoad()){
      DOM.btnLoad().onclick = () => {
        bulk.clear();
        bulk.open();
      };
    }

    if (DOM.bulkBtnClose()){
      DOM.bulkBtnClose().onclick = () => {
        bulk.clear();
        bulk.close();
      };
    }

    if (DOM.bulkBtnProcess()){
      DOM.bulkBtnProcess().onclick = () => {
        const existingCedulas = new Set(
          (state.S.docentes || [])
            .map(d => normalizeCedula(d.cedula))
            .filter(Boolean)
        );

        bulk.process({ careersIndex, careersNameToId, existingCedulas });
      };
    }

    if (DOM.bulkBtnAdd()){
      DOM.bulkBtnAdd().onclick = bulkAdd;
    }

    if (DOM.btnFile() && DOM.fileInput()){
      DOM.btnFile().onclick = () => DOM.fileInput().click();
      DOM.fileInput().onchange = () => {
        ui.msg("Importar archivo: pendiente (siguiente).", "warn");
        DOM.fileInput().value = "";
      };
    }
  }catch(err){
    ui.msg(`Error: ${err && err.message ? err.message : String(err)}`, "err");
  }
}