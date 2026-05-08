/* =========================================================
Nombre del archivo: regman.app.js
Ruta - Ubicación: /registro.manage/regman.app.js
Función o funciones:
- Boot de pantalla Registro · Gestión
- Carga carreras + docentes
- Guardar, borrar y limpiar formulario
- Buscador con predictor
- Filtros de tabla
- Edición inline en tabla + guardado en Firebase
- Carga masiva por modal
- Modal de errores
- Exportación Excel de la tabla generada
Correcciones:
- Integra botón Descargar Excel sin crear archivo adicional
- Exporta la tabla respetando búsqueda, filtros y ordenamiento actual
- Incluye campos principales y campos extra disponibles en cada docente
- Mantiene compatibilidad con Firebase y módulos actuales
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
import { createNoticeUI } from "./regman.notice.ui.js";
import { createErrorsUI } from "./regman.errors.ui.js";

export async function bootRegManage(){
  const state = createRegManageState();
  const ui = createMsgUI();
  createNoticeUI({ DOM, ui });

  ui.msg("Cargando…", "info");

  const renderer = createTableRenderer({ state });

  const errorsUI = createErrorsUI({
    DOM,
    state,
    validateDocente,
    onPick: (cedula) => pickToForm(cedula)
  });

  const originalRender = renderer.render;
  renderer.render = () => {
    originalRender();
    if (errorsUI && typeof errorsUI.updateBadge === "function"){
      errorsUI.updateBadge();
    }
  };

  let careersIndex = Object.create(null);
  let careersNameToId = Object.create(null);
  let bulkRows = [];

  /* =========================================================
  Helpers base
  ========================================================== */

  function s(x){
    return x === null || x === undefined ? "" : String(x);
  }

  function clean(x){
    return s(x).replace(/\s+/g, " ").trim();
  }

  function norm(x){
    return clean(x)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function onlyDigits(x){
    return /^[0-9]+$/.test(clean(x));
  }

  function normalizeCedula(x){
    let cedula = s(x)
      .replace(/\s+/g, "")
      .replace(/^"+|"+$/g, "")
      .trim();

    if (/^[0-9]{9}$/.test(cedula)){
      cedula = `0${cedula}`;
    }

    return cedula;
  }

  function sexoLabel(value){
    const v = clean(value).toUpperCase();
    if (v === "F") return "Mujer";
    if (v === "M") return "Hombre";
    return "";
  }

  function escapeHtml(value){
    return s(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeArray(value){
    return Array.isArray(value) ? value : [];
  }

  function formatAnyCell(value){
    if (value === null || value === undefined) return "";

    if (Array.isArray(value)){
      return value.map((x) => formatAnyCell(x)).filter(Boolean).join(" | ");
    }

    if (typeof value === "object"){
      if (typeof value.toDate === "function"){
        try{
          return value.toDate().toLocaleString("es-EC");
        } catch(_){}
      }

      if (value.seconds){
        try{
          return new Date(Number(value.seconds) * 1000).toLocaleString("es-EC");
        } catch(_){}
      }

      try{
        return JSON.stringify(value);
      } catch(_){
        return String(value);
      }
    }

    return String(value);
  }

  function updateStateDocente(saved){
    if (!saved || !saved.cedula) return;

    const cedula = normalizeCedula(saved.cedula);
    const rows = Array.isArray(state.S.docentes) ? state.S.docentes : [];
    const idx = rows.findIndex((x) => normalizeCedula(x.cedula) === cedula);

    if (idx >= 0){
      rows[idx] = {
        ...rows[idx],
        ...saved,
        cedula
      };
      state.setDocentes(rows.slice());
    } else {
      state.setDocentes([
        {
          ...saved,
          cedula
        },
        ...rows
      ]);
    }
  }

  /* =========================================================
  Buscadores y filtros
  ========================================================== */

  function refreshSearchPredictor(){
    const datalist = DOM.searchList?.();
    if (!datalist) return;

    const rows = Array.isArray(state.S.docentes) ? state.S.docentes : [];

    datalist.innerHTML = rows.map((docente) => {
      const cedula = clean(docente.cedula);
      const nombres = clean(docente.nombres);
      const apellidos = clean(docente.apellidos);
      const label = `${apellidos} ${nombres}`.trim();

      return `<option value="${escapeHtml(cedula)}">${escapeHtml(label)}</option>`;
    }).join("");
  }

  function refreshTableSearchPredictor(){
    const datalist = DOM.tableSearchList?.();
    if (!datalist) return;

    const rows = Array.isArray(state.S.docentes) ? state.S.docentes : [];

    datalist.innerHTML = rows.map((docente) => {
      const cedula = clean(docente.cedula);
      const nombres = clean(docente.nombres);
      const apellidos = clean(docente.apellidos);
      const carrera = clean(docente.carreraNombre || docente.carreraId);
      const label = `${apellidos} ${nombres} · ${carrera}`.trim();

      return `<option value="${escapeHtml(cedula)}">${escapeHtml(label)}</option>`;
    }).join("");
  }

  function fillFilterCarrera(){
    const select = DOM.filterCarrera?.();
    if (!select) return;

    const current = clean(state.S.filterCarreraId || "");

    select.innerHTML = "";

    const optionAll = document.createElement("option");
    optionAll.value = "";
    optionAll.textContent = "Carrera: Todas";
    select.appendChild(optionAll);

    safeArray(state.S.carreras)
      .slice()
      .sort((a, b) => clean(a.nombre).localeCompare(clean(b.nombre), "es"))
      .forEach((carrera) => {
        const option = document.createElement("option");
        option.value = clean(carrera.id);
        option.textContent = clean(carrera.nombre || carrera.id);

        if (option.value && option.value === current){
          option.selected = true;
        }

        select.appendChild(option);
      });
  }

  function clearTableFilters(){
    state.setSearch("");
    state.setFilterSexo("");
    state.setFilterCarreraId("");

    if (DOM.tableSearch()) DOM.tableSearch().value = "";
    if (DOM.filterSexo()) DOM.filterSexo().value = "";
    if (DOM.filterCarrera()) DOM.filterCarrera().value = "";

    renderer.render();
    ui.msg("Filtros limpiados.", "info");
  }

  /* =========================================================
  Carga inicial
  ========================================================== */

  async function reloadAll(){
    ui.msg("Cargando carreras…", "info");

    const carreras = await listarCarreras();

    fillCarreraSelect({ state, carreras });

    careersIndex = buildCareersIndex(carreras);
    state.setCareersIndex(careersIndex);

    careersNameToId = Object.create(null);

    for (const carrera of safeArray(carreras)){
      const nombre = carrera && carrera.nombre ? String(carrera.nombre) : "";
      const key = normKey(nombre);

      if (key){
        careersNameToId[key] = carrera.id;
      }
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

  /* =========================================================
  Selección y formulario
  ========================================================== */

  function pickToForm(cedula){
    const targetCedula = normalizeCedula(cedula);

    const row = safeArray(state.S.docentes).find((docente) => {
      return normalizeCedula(docente.cedula) === targetCedula;
    });

    if (!row){
      ui.msg("No se encontró el docente seleccionado.", "warn");
      return;
    }

    state.setSelectedCedula(row.cedula);
    fillForm(row);

    ui.msg("Docente cargado para editar o borrar.", "info");
  }

  function pickFromSearchValue(rawValue){
    const value = clean(rawValue);

    if (!value) return false;

    const cedula = normalizeCedula(value);

    if (!onlyDigits(cedula)) return false;

    const row = safeArray(state.S.docentes).find((docente) => {
      return normalizeCedula(docente.cedula) === cedula;
    });

    if (!row) return false;

    pickToForm(row.cedula);
    renderer.render();

    return true;
  }

  function newDocente(){
    state.setSelectedCedula("");
    clearForm();

    if (DOM.search()) DOM.search().value = "";

    ui.msg("Formulario limpio. Listo para registrar un docente.", "info");
    renderer.render();
  }

  async function saveCurrentForm(){
    try{
      const result = await saveOne({
        state,
        ui,
        careersIndex
      });

      refreshSearchPredictor();
      refreshTableSearchPredictor();
      fillFilterCarrera();

      renderer.render();

      return result;
    } catch(err){
      ui.msg(`Error al guardar: ${err && err.message ? err.message : String(err)}`, "err");
      return { ok: false };
    }
  }

  async function deleteCurrentDocente(){
    try{
      const cedula = clean(state.S.selectedCedula || DOM.cedula()?.value || "");

      if (!cedula){
        ui.msg("Selecciona un docente para borrar.", "warn");
        return;
      }

      const ok = confirmDanger(`¿Seguro que deseas borrar al docente con cédula ${cedula}?`);

      if (!ok){
        ui.msg("Borrado cancelado.", "info");
        return;
      }

      const result = await deleteSelected({ state, ui });

      if (result && result.ok){
        clearForm();
        refreshSearchPredictor();
        refreshTableSearchPredictor();
        fillFilterCarrera();
        renderer.render();
      }
    } catch(err){
      ui.msg(`Error al borrar: ${err && err.message ? err.message : String(err)}`, "err");
    }
  }

  async function swapNombresApellidos(){
    try{
      const cedula = normalizeCedula(DOM.cedula()?.value || state.S.selectedCedula || "");

      if (!cedula){
        ui.msg("Carga primero un docente para intercambiar nombres y apellidos.", "warn");
        return;
      }

      const nombresActuales = clean(DOM.nombres()?.value || "");
      const apellidosActuales = clean(DOM.apellidos()?.value || "");

      if (!nombresActuales && !apellidosActuales){
        ui.msg("No hay nombres ni apellidos para intercambiar.", "warn");
        return;
      }

      const carreraId = clean(DOM.carrera()?.value || "");
      const payload = {
        cedula,
        nombres: apellidosActuales,
        apellidos: nombresActuales,
        carreraId,
        carreraNombre: carreraId && careersIndex ? clean(careersIndex[carreraId] || "") : "",
        celular: clean(DOM.celular()?.value || ""),
        titulo: clean(DOM.titulo()?.value || ""),
        sexo: clean(DOM.sexo()?.value || "")
      };

      const validation = validateDocente(payload);

      if (!validation.ok){
        ui.msg(`No se pudo intercambiar: ${validation.msg}`, "warn");
        return;
      }

      ui.msg("Intercambiando nombres y apellidos…", "info");

      const saved = await upsertDocente(payload);

      updateStateDocente(saved);
      fillForm(saved);

      refreshSearchPredictor();
      refreshTableSearchPredictor();
      renderer.render();

      ui.msg("Nombres y apellidos intercambiados y guardados.", "ok");
    } catch(err){
      ui.msg(`Error al intercambiar: ${err && err.message ? err.message : String(err)}`, "err");
    }
  }

  /* =========================================================
  Edición inline en tabla
  ========================================================== */

  async function inlineSave(docente){
    try{
      const normalized = {
        ...docente,
        cedula: normalizeCedula(docente?.cedula)
      };

      const validation = validateDocente(normalized);

      if (!validation.ok){
        ui.msg(`No se pudo guardar edición: ${validation.msg}`, "warn");
        return;
      }

      const carreraId = clean(normalized.carreraId);

      normalized.carreraNombre = carreraId && careersIndex
        ? clean(careersIndex[carreraId] || "")
        : "";

      ui.msg("Guardando cambios en tabla…", "info");

      const saved = await upsertDocente(normalized);

      updateStateDocente(saved);

      refreshSearchPredictor();
      refreshTableSearchPredictor();
      fillFilterCarrera();

      renderer.render();

      ui.msg("Cambio guardado.", "ok");
    } catch(err){
      ui.msg(`Error en edición inline: ${err && err.message ? err.message : String(err)}`, "err");
    }
  }

  /* =========================================================
  Carga masiva
  ========================================================== */

  function openBulkModal(){
    const modal = DOM.bulkModal?.();

    if (!modal) return;

    modal.hidden = false;

    if (DOM.bulkStats()){
      DOM.bulkStats().textContent = "Pega datos y presiona Procesar.";
    }

    if (DOM.bulkPreview()){
      DOM.bulkPreview().innerHTML = "";
    }

    if (DOM.bulkBtnAdd()){
      DOM.bulkBtnAdd().disabled = true;
    }

    bulkRows = [];
  }

  function closeBulkModal(){
    const modal = DOM.bulkModal?.();

    if (!modal) return;

    modal.hidden = true;
  }

  function setBulkStats(text, type){
    const el = DOM.bulkStats?.();

    if (!el) return;

    el.textContent = text || "";
    el.dataset.type = type || "info";
  }

  function normalizeBulkRow(row){
    const carreraId = clean(row.carreraId || "");
    const carreraNombre = carreraId && careersIndex
      ? clean(careersIndex[carreraId] || row.carreraNombre || "")
      : clean(row.carreraNombre || "");

    return {
      cedula: normalizeCedula(row.cedula),
      nombres: clean(row.nombres),
      apellidos: clean(row.apellidos),
      carreraId,
      carreraNombre,
      celular: clean(row.celular),
      titulo: clean(row.titulo),
      sexo: clean(row.sexo)
    };
  }

  function renderBulkPreview(rows){
    const host = DOM.bulkPreview?.();

    if (!host) return;

    const list = safeArray(rows);

    if (!list.length){
      host.innerHTML = `<div class="muted" style="padding:12px;">Sin datos procesados.</div>`;
      return;
    }

    host.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Cédula</th>
            <th>Nombres</th>
            <th>Apellidos</th>
            <th>Sexo</th>
            <th>Carrera</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${list.map((row) => {
            const validation = validateDocente(row);
            const ok = validation.ok;

            return `
              <tr>
                <td><b>${escapeHtml(row.cedula)}</b></td>
                <td>${escapeHtml(row.nombres)}</td>
                <td>${escapeHtml(row.apellidos)}</td>
                <td>${escapeHtml(sexoLabel(row.sexo))}</td>
                <td>${escapeHtml(row.carreraNombre || row.carreraId)}</td>
                <td>
                  <span class="${ok ? "okTag" : "badTag"}">
                    ${ok ? "OK" : escapeHtml(validation.msg || "Error")}
                  </span>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
  }

  async function processBulkText(){
    try{
      const text = DOM.bulkText()?.value || "";

      if (!clean(text)){
        setBulkStats("Pega datos antes de procesar.", "warn");
        return;
      }

      setBulkStats("Procesando datos…", "info");

      const mod = await import("./regman.utils.brain.js");

      if (!mod || typeof mod.parsePegadoDocentes !== "function"){
        throw new Error("No se encontró parsePegadoDocentes en regman.utils.brain.js.");
      }

      const result = mod.parsePegadoDocentes({
        text,
        careersIndex,
        careersNameToId
      });

      bulkRows = safeArray(result.rows).map(normalizeBulkRow);

      const validCount = bulkRows.filter((row) => validateDocente(row).ok).length;
      const total = bulkRows.length;

      renderBulkPreview(bulkRows);

      if (DOM.bulkBtnAdd()){
        DOM.bulkBtnAdd().disabled = validCount <= 0;
      }

      setBulkStats(
        `Procesados: ${total}. Válidos para agregar: ${validCount}.`,
        validCount > 0 ? "ok" : "warn"
      );
    } catch(err){
      setBulkStats(`Error al procesar: ${err && err.message ? err.message : String(err)}`, "err");
    }
  }

  async function addBulkRows(){
    try{
      const validRows = bulkRows.filter((row) => validateDocente(row).ok);

      if (!validRows.length){
        setBulkStats("No hay filas válidas para agregar.", "warn");
        return;
      }

      setBulkStats("Guardando docentes…", "info");

      for (const row of validRows){
        const saved = await upsertDocente(row);
        updateStateDocente(saved);
      }

      refreshSearchPredictor();
      refreshTableSearchPredictor();
      fillFilterCarrera();

      renderer.render();

      setBulkStats(`Docentes agregados o actualizados: ${validRows.length}.`, "ok");
      ui.msg(`Carga masiva finalizada: ${validRows.length} docente(s).`, "ok");

      if (DOM.bulkBtnAdd()){
        DOM.bulkBtnAdd().disabled = true;
      }
    } catch(err){
      setBulkStats(`Error al agregar: ${err && err.message ? err.message : String(err)}`, "err");
    }
  }

  function readFileAsText(file){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("No se pudo leer el archivo."));

      reader.readAsText(file, "UTF-8");
    });
  }

  async function onFileSelected(event){
    try{
      const file = event && event.target && event.target.files
        ? event.target.files[0]
        : null;

      if (!file) return;

      const text = await readFileAsText(file);

      openBulkModal();

      if (DOM.bulkText()){
        DOM.bulkText().value = text;
      }

      setBulkStats(`Archivo cargado: ${file.name}. Presiona Procesar.`, "info");

      if (DOM.fileInput()){
        DOM.fileInput().value = "";
      }
    } catch(err){
      ui.msg(`Error al importar archivo: ${err && err.message ? err.message : String(err)}`, "err");
    }
  }

  /* =========================================================
  Exportación Excel
  ========================================================== */

  function getFieldValue(row, key){
    if (!row) return "";
    return row[key];
  }

  function compareRows(a, b, key, dir){
    const A = norm(formatAnyCell(getFieldValue(a, key)));
    const B = norm(formatAnyCell(getFieldValue(b, key)));
    const result = A.localeCompare(B, "es");

    return dir === "desc" ? -result : result;
  }

  function applyCurrentFilters(rows){
    const q = norm(state.S.search || "");
    const sexo = clean(state.S.filterSexo || "");
    const carreraId = clean(state.S.filterCarreraId || "");

    return safeArray(rows).filter((docente) => {
      if (sexo && clean(docente.sexo) !== sexo) return false;
      if (carreraId && clean(docente.carreraId) !== carreraId) return false;

      if (!q) return true;

      const bag = [
        docente.cedula,
        docente.nombres,
        docente.apellidos,
        docente.sexo,
        sexoLabel(docente.sexo),
        docente.carreraId,
        docente.carreraNombre,
        docente.celular,
        docente.titulo,
        docente.capacitaciones
      ].map((x) => norm(formatAnyCell(x))).join(" ");

      return bag.includes(q);
    });
  }

  function applyCurrentSort(rows){
    const key = clean(state.S.sortKey || "");
    const dir = clean(state.S.sortDir || "asc") || "asc";

    if (!key) return rows.slice();

    return rows.slice().sort((a, b) => compareRows(a, b, key, dir));
  }

  function getVisibleRowsForExport(){
    const base = safeArray(state.S.docentes);
    const filtered = applyCurrentFilters(base);

    return applyCurrentSort(filtered);
  }

  function buildExportColumns(rows){
    const known = [
      { key: "cedula", label: "Cédula" },
      { key: "nombres", label: "Nombres" },
      { key: "apellidos", label: "Apellidos" },
      { key: "sexo", label: "Sexo" },
      { key: "carreraId", label: "Carrera ID" },
      { key: "carreraNombre", label: "Carrera" },
      { key: "celular", label: "Celular" },
      { key: "titulo", label: "Título" },
      { key: "capacitaciones", label: "Capacitaciones" },
      { key: "createdAt", label: "Creado" },
      { key: "updatedAt", label: "Actualizado" }
    ];

    const used = new Set(known.map((col) => col.key));
    const extras = [];

    safeArray(rows).forEach((row) => {
      Object.keys(row || {}).forEach((key) => {
        if (!used.has(key)){
          used.add(key);
          extras.push({
            key,
            label: key
          });
        }
      });
    });

    return known.concat(extras);
  }

  function getExcelCellValue(row, key){
    if (key === "sexo"){
      return sexoLabel(row.sexo) || row.sexo || "";
    }

    if (key === "carreraNombre"){
      return row.carreraNombre || (row.carreraId && careersIndex ? careersIndex[row.carreraId] : "") || "";
    }

    return formatAnyCell(row ? row[key] : "");
  }

  function buildExcelHtml(rows){
    const list = safeArray(rows);
    const columns = buildExportColumns(list);
    const now = new Date();

    const title = "Registro de docentes";
    const exportedAt = now.toLocaleString("es-EC");

    const head = columns.map((col) => {
      return `<th>${escapeHtml(col.label)}</th>`;
    }).join("");

    const body = list.length
      ? list.map((row) => {
          const cells = columns.map((col) => {
            const value = getExcelCellValue(row, col.key);
            const textMode = [
              "cedula",
              "celular",
              "carreraId"
            ].includes(col.key);

            const style = textMode ? ` style="mso-number-format:'\\@';"` : "";

            return `<td${style}>${escapeHtml(value)}</td>`;
          }).join("");

          return `<tr>${cells}</tr>`;
        }).join("")
      : `<tr><td colspan="${columns.length}">Sin datos</td></tr>`;

    return `
      <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
          }

          .title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 4px;
          }

          .meta {
            font-size: 12px;
            color: #475569;
            margin-bottom: 12px;
          }

          table {
            border-collapse: collapse;
            width: 100%;
          }

          th {
            background: #1d4ed8;
            color: #ffffff;
            font-weight: bold;
            border: 1px solid #94a3b8;
            padding: 8px;
            text-align: left;
          }

          td {
            border: 1px solid #cbd5e1;
            padding: 6px;
            vertical-align: top;
          }
        </style>
      </head>

      <body>
        <div class="title">${escapeHtml(title)}</div>
        <div class="meta">
          Exportado: ${escapeHtml(exportedAt)} |
          Total registros: ${list.length}
        </div>

        <table>
          <thead>
            <tr>${head}</tr>
          </thead>
          <tbody>
            ${body}
          </tbody>
        </table>
      </body>
      </html>
    `;
  }

  function buildExcelFilename(){
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `registro_docentes_${year}-${month}-${day}.xls`;
  }

  function downloadExcelFile(html, filename){
    const blob = new Blob(["\uFEFF", html], {
      type: "application/vnd.ms-excel;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.style.display = "none";

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function exportRegmanExcel(){
    try{
      const rows = getVisibleRowsForExport();

      if (!rows.length){
        ui.msg("No hay datos para exportar con los filtros actuales.", "warn");
        return;
      }

      const html = buildExcelHtml(rows);
      const filename = buildExcelFilename();

      downloadExcelFile(html, filename);

      ui.msg(`Excel generado: ${rows.length} registro(s).`, "ok");
    } catch(err){
      ui.msg(`Error al exportar Excel: ${err && err.message ? err.message : String(err)}`, "err");
    }
  }

  /* =========================================================
  Modal de errores
  ========================================================== */

  function openErrorsModalFallback(){
    const modal = DOM.errModal?.();

    if (!modal) return;

    modal.hidden = false;
  }

  function closeErrorsModalFallback(){
    const modal = DOM.errModal?.();

    if (!modal) return;

    modal.hidden = true;
  }

  function openErrorsModal(){
    if (errorsUI && typeof errorsUI.open === "function"){
      errorsUI.open();
      return;
    }

    if (errorsUI && typeof errorsUI.render === "function"){
      errorsUI.render();
    }

    openErrorsModalFallback();
  }

  /* =========================================================
  Bindings
  ========================================================== */

  function bindUI(){
    if (DOM.btnNew()){
      DOM.btnNew().addEventListener("click", () => newDocente());
    }

    if (DOM.btnSave()){
      DOM.btnSave().addEventListener("click", () => saveCurrentForm());
    }

    if (DOM.btnDelete()){
      DOM.btnDelete().addEventListener("click", () => deleteCurrentDocente());
    }

    if (DOM.btnSwapNA()){
      DOM.btnSwapNA().addEventListener("click", () => swapNombresApellidos());
    }

    if (DOM.search()){
      DOM.search().addEventListener("change", (event) => {
        pickFromSearchValue(event.target.value);
      });

      DOM.search().addEventListener("keydown", (event) => {
        if (event.key === "Enter"){
          event.preventDefault();
          pickFromSearchValue(event.target.value);
        }
      });
    }

    if (DOM.tableSearch()){
      DOM.tableSearch().addEventListener("input", (event) => {
        const value = event.target.value || "";

        const selected = pickFromSearchValue(value);

        if (!selected){
          state.setSearch(value);
          renderer.render();
        }
      });
    }

    if (DOM.filterSexo()){
      DOM.filterSexo().addEventListener("change", (event) => {
        state.setFilterSexo(event.target.value || "");
        renderer.render();
      });
    }

    if (DOM.filterCarrera()){
      DOM.filterCarrera().addEventListener("change", (event) => {
        state.setFilterCarreraId(event.target.value || "");
        renderer.render();
      });
    }

    if (DOM.filterClear()){
      DOM.filterClear().addEventListener("click", () => clearTableFilters());
    }

    if (DOM.btnExportExcel()){
      DOM.btnExportExcel().addEventListener("click", () => exportRegmanExcel());
    }

    if (DOM.btnLoad()){
      DOM.btnLoad().addEventListener("click", () => openBulkModal());
    }

    if (DOM.bulkBtnClose()){
      DOM.bulkBtnClose().addEventListener("click", () => closeBulkModal());
    }

    if (DOM.bulkBtnProcess()){
      DOM.bulkBtnProcess().addEventListener("click", () => processBulkText());
    }

    if (DOM.bulkBtnAdd()){
      DOM.bulkBtnAdd().addEventListener("click", () => addBulkRows());
    }

    if (DOM.btnFile()){
      DOM.btnFile().addEventListener("click", () => {
        if (DOM.fileInput()){
          DOM.fileInput().click();
        }
      });
    }

    if (DOM.fileInput()){
      DOM.fileInput().addEventListener("change", (event) => onFileSelected(event));
    }

    if (DOM.btnErrors()){
      DOM.btnErrors().addEventListener("click", () => openErrorsModal());
    }

    if (DOM.errBtnClose()){
      DOM.errBtnClose().addEventListener("click", () => {
        if (errorsUI && typeof errorsUI.close === "function"){
          errorsUI.close();
          return;
        }

        closeErrorsModalFallback();
      });
    }

    const bulkModal = DOM.bulkModal?.();

    if (bulkModal){
      bulkModal.addEventListener("click", (event) => {
        if (event.target === bulkModal){
          closeBulkModal();
        }
      });
    }

    const errModal = DOM.errModal?.();

    if (errModal){
      errModal.addEventListener("click", (event) => {
        if (event.target === errModal){
          closeErrorsModalFallback();
        }
      });
    }

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;

      closeBulkModal();
      closeErrorsModalFallback();
    });

    bindTable({
      state,
      renderer,
      onPick: (cedula) => pickToForm(cedula),
      onInlineSave: (docente) => inlineSave(docente),
      careersIndex
    });
  }

  /* =========================================================
  Inicio
  ========================================================== */

  try{
    bindUI();
    await reloadAll();
  } catch(err){
    ui.msg(`Error inicial: ${err && err.message ? err.message : String(err)}`, "err");
  }
}