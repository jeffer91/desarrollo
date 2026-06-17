/* =========================================================
Nombre del archivo: regman.bulk.ui.brain.js
Ruta - Ubicación: /registro.manage/regman.bulk.ui.brain.js
Función:
- "Cerebro" del pop up de carga masiva:
  - procesar pegado
  - preview editable
  - estado por fila (duplicado / ya existe / validación / agregado)
  - incluir/descartar
  - agregar uno por uno o varios (sin cerrar modal)
  - quitar elimina del popup
  - marcar como "Agregado" (botón gris + disabled)
- ✅ FIX: ocultar filas que ya existen
- ✅ FIX: normalizar cédulas de 9 dígitos
========================================================= */
import { parsePegadoDocentes, normKey } from "./regman.utils.js";
import { createNoticeUI } from "./regman.notice.ui.js";

function esc(x){
  return String(x ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function normalizeCedula(x){
  let ced = String(x ?? "").replace(/\s+/g, "").replace(/^"+|"+$/g, "").trim();
  if (/^[0-9]{9}$/.test(ced)) ced = `0${ced}`;
  return ced;
}

export function createBulkUIBrain({ DOM, ui, validateDocente }){
  const notice = createNoticeUI({ DOM, ui });

  let lastRows = [];
  let lastStats = null;
  let lastCareersIndex = null;
  let lastCareersNameToId = null;
  let lastExistingCedulas = null; // Set opcional
  let lastHiddenExistingCount = 0;

  function open(){
    const m = DOM.bulkModal?.();
    if (!m) return;
    m.hidden = false;
    setTimeout(() => DOM.bulkText?.()?.focus?.(), 0);
  }

  function close(){
    const m = DOM.bulkModal?.();
    if (!m) return;
    m.hidden = true;
  }

  function clear(){
    lastRows = [];
    lastStats = null;
    lastCareersIndex = null;
    lastCareersNameToId = null;
    lastExistingCedulas = null;
    lastHiddenExistingCount = 0;

    if (DOM.bulkText?.()) DOM.bulkText().value = "";
    if (DOM.bulkPreview?.()) DOM.bulkPreview().innerHTML = "";
    if (DOM.bulkStats?.()) DOM.bulkStats().textContent = "";
    if (DOM.bulkBtnAdd?.()) DOM.bulkBtnAdd().disabled = true;
    if (notice && typeof notice.clear === "function") notice.clear();
  }

  function buildCareerOptionsHTML(selectedId){
    const sid = (selectedId || "").toString().trim();

    if (!lastCareersIndex){
      return `<option value="${esc(sid)}">${esc(sid || "—")}</option>`;
    }

    const pairs = Object.entries(lastCareersIndex)
      .map(([id, name]) => ({ id: String(id), name: String(name || "") }))
      .filter(x => x.id && x.name)
      .sort((a,b) => a.name.localeCompare(b.name, "es"));

    let html = `<option value="">Selecciona…</option>`;
    for (const c of pairs){
      html += `<option value="${esc(c.id)}" ${c.id === sid ? "selected" : ""}>${esc(c.name)}</option>`;
    }
    return html;
  }

  function resolveCarreraFromName(name){
    const n = (name || "").toString();
    const key = normKey(n);

    if (!key) return { carreraId: "", carreraNombre: "" };

    if (lastCareersNameToId && lastCareersNameToId[key]){
      const id = lastCareersNameToId[key];
      const nom = (lastCareersIndex && id) ? (lastCareersIndex[id] || "") : "";
      return { carreraId: id, carreraNombre: nom || n };
    }

    if (lastCareersIndex){
      for (const [id, nom] of Object.entries(lastCareersIndex)){
        if (normKey(nom) === key) return { carreraId: id, carreraNombre: nom };
      }
    }

    return { carreraId: "", carreraNombre: n };
  }

  function buildDupMap(rows){
    const dupMap = Object.create(null);
    for (const r of (rows || [])){
      const ced = normalizeCedula(r?.cedula);
      if (!ced) continue;
      dupMap[ced] = (dupMap[ced] || 0) + 1;
    }
    return dupMap;
  }

  function getRowStatus(r, dupMap){
    const ced = normalizeCedula(r?.cedula);
    const isDup = !!ced && (dupMap[ced] > 1);
    const isExisting = !!ced && lastExistingCedulas && lastExistingCedulas.has(ced);
    const isAdded = r && r.__added === true;

    const normalizedRow = {
      ...(r || {}),
      cedula: ced
    };

    const v = validateDocente(normalizedRow);

    let ok = !!v.ok;
    let reason = v.msg || "";

    if (isAdded){
      ok = false;
      reason = "Agregado.";
    }else if (isDup){
      ok = false;
      reason = "Duplicado (cédula repetida en el pegado).";
    }else if (isExisting){
      ok = false;
      reason = "Ya existe (cédula ya registrada).";
    }else if (!ok){
      reason = reason || "Error de validación.";
    }else{
      reason = "OK";
    }

    return { ok, reason, isDup, isExisting, isAdded };
  }

  function renderPreview(){
    const host = DOM.bulkPreview?.();
    if (!host) return;

    const rows = lastRows || [];
    const dupMap = buildDupMap(rows);

    let okCount = 0;
    let badCount = 0;
    let selectedCount = 0;

    for (const r of rows){
      if (!r) continue;
      r.cedula = normalizeCedula(r.cedula);
      if (typeof r.__include !== "boolean") r.__include = true;
    }

    const withStatus = rows.map((r, idx) => {
      if (r && !String(r.carreraId || "").trim() && String(r.carreraNombre || "").trim()){
        const resolved = resolveCarreraFromName(r.carreraNombre);
        r.carreraId = resolved.carreraId;
        r.carreraNombre = resolved.carreraNombre;
      }

      r.cedula = normalizeCedula(r.cedula);

      const st = getRowStatus(r, dupMap);

      // FIX: auto-descartar errores (solo una vez)
      if (r && r.__include === true && !st.ok && typeof r.__includeAutoFixed !== "boolean"){
        r.__include = false;
        r.__includeAutoFixed = true;
      }

      if (r && r.__include) selectedCount++;
      if (st.ok) okCount++; else badCount++;

      return { r, idx, ...st };
    });

    let html = `
      <table class="bulk-table">
        <thead>
          <tr>
            <th style="width:80px">Incluir</th>
            <th style="width:130px">Cédula</th>
            <th>Nombres</th>
            <th>Apellidos</th>
            <th style="width:300px">Carrera</th>
            <th style="width:280px">Estado</th>
            <th style="width:190px">Acción</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const x of withStatus){
      const includeChecked = x.r.__include ? "checked" : "";
      const isAdded = x.isAdded === true;

      // Solo se deshabilita si ya está agregado.
      const disableAdd = isAdded;
      const rowStyle = isAdded ? ` style="opacity:.55"` : "";

      html += `
        <tr data-ok="${x.ok ? "1" : "0"}" data-idx="${x.idx}"${rowStyle}>
          <td>
            <input type="checkbox" data-idx="${x.idx}" data-field="__include"
              ${includeChecked} ${isAdded ? "disabled" : ""} />
          </td>
          <td>
            <input class="cell" data-idx="${x.idx}" data-field="cedula"
              value="${esc(x.r.cedula)}" ${isAdded ? "disabled" : ""} />
          </td>
          <td>
            <input class="cell" data-idx="${x.idx}" data-field="nombres"
              value="${esc(x.r.nombres)}" ${isAdded ? "disabled" : ""} />
          </td>
          <td>
            <input class="cell" data-idx="${x.idx}" data-field="apellidos"
              value="${esc(x.r.apellidos)}" ${isAdded ? "disabled" : ""} />
          </td>
          <td>
            <select class="cell" data-idx="${x.idx}" data-field="carreraId" ${isAdded ? "disabled" : ""}>
              ${buildCareerOptionsHTML(x.r.carreraId)}
            </select>
          </td>
          <td title="${esc(x.reason)}">
            ${
              isAdded
                ? '<span class="okTag">AGREGADO</span>'
                : (x.ok ? '<span class="okTag">OK</span>' : '<span class="badTag">ERROR</span>')
            }
            <div class="muted" style="margin-top:6px">${esc(x.reason)}</div>
          </td>
          <td>
            <button class="btn ${isAdded ? "gray" : "soft"}" type="button"
              data-idx="${x.idx}" data-action="add-one"
              ${disableAdd ? "disabled" : ""}>
              ${isAdded ? "Agregado" : "Agregar"}
            </button>
            <button class="btn danger" type="button"
              data-idx="${x.idx}" data-action="remove-one"
              ${isAdded ? "disabled" : ""}>
              Quitar
            </button>
          </td>
        </tr>
      `;
    }

    if (!withStatus.length){
      html += `<tr><td colspan="7" class="muted">Sin filas</td></tr>`;
    }

    html += `</tbody></table>`;
    host.innerHTML = html;

    if (DOM.bulkStats?.()){
      const hiddenTxt = lastHiddenExistingCount > 0
        ? ` | Ocultas por ya existir: ${lastHiddenExistingCount}`
        : "";

      DOM.bulkStats().textContent =
        `Filas: ${rows.length} | Válidas: ${okCount} | Con error: ${badCount} | Seleccionadas: ${selectedCount}${hiddenTxt}`;
    }

    if (DOM.bulkBtnAdd?.()){
      DOM.bulkBtnAdd().disabled = selectedCount === 0;
    }

    // inputs + checkbox
    host.oninput = (ev) => {
      const el = ev.target;
      if (!el || !el.getAttribute) return;

      const idx = Number(el.getAttribute("data-idx"));
      const field = el.getAttribute("data-field");

      if (!Number.isFinite(idx) || idx < 0 || idx >= lastRows.length || !field) return;

      const row = lastRows[idx];
      if (!row) return;
      if (row.__added === true) return; // no editar agregado

      if (field === "__include"){
        row.__include = !!el.checked;
      }else if (field === "cedula"){
        row.cedula = normalizeCedula(el.value ?? "");
      }else{
        row[field] = (el.value ?? "").toString();
      }

      renderPreview();
    };

    // select carrera
    host.onchange = (ev) => {
      const el = ev.target;
      if (!el || !el.getAttribute) return;
      if (el.tagName && el.tagName.toLowerCase() !== "select") return;

      const idx = Number(el.getAttribute("data-idx"));
      const field = el.getAttribute("data-field");

      if (!Number.isFinite(idx) || idx < 0 || idx >= lastRows.length || !field) return;

      const row = lastRows[idx];
      if (!row) return;
      if (row.__added === true) return;

      row[field] = (el.value ?? "").toString();

      // sincronizar carreraNombre
      if (field === "carreraId"){
        const cid = (row.carreraId || "").toString().trim();
        row.carreraNombre = (lastCareersIndex && cid) ? (lastCareersIndex[cid] || "") : "";
      }

      renderPreview();
    };

    // botones por fila
    host.onclick = (ev) => {
      const t = ev.target;
      if (!t || !t.getAttribute) return;

      const action = t.getAttribute("data-action");
      const idx = Number(t.getAttribute("data-idx"));

      if (!action || !Number.isFinite(idx) || idx < 0 || idx >= lastRows.length) return;

      const row = lastRows[idx];
      if (!row) return;
      if (row.__added === true) return;

      if (action === "remove-one"){
        lastRows.splice(idx, 1);
        renderPreview();
        notice.info("Ya se borró del pop up.");
        return;
      }

      if (action !== "add-one") return;

      const dupMap2 = buildDupMap(lastRows);
      const st = getRowStatus(row, dupMap2);

      if (!st.ok){
        notice.warn(st.reason);
        return;
      }

      // agregar solo esta fila: seleccionarla
      for (let i = 0; i < lastRows.length; i++){
        lastRows[i].__include = (i === idx);
      }

      renderPreview();

      const btn = DOM.bulkBtnAdd?.();
      if (btn && !btn.disabled){
        btn.click();
      }else{
        notice.warn("No se puede agregar: no hay filas seleccionadas o la fila no es válida.");
      }
    };
  }

  function process({ careersIndex, careersNameToId, existingCedulas }){
    const text = (DOM.bulkText?.() && DOM.bulkText().value) ? DOM.bulkText().value : "";
    if (!text.trim()){
      notice.warn("Pega los docentes en el cuadro primero.");
      return { rows: [], stats: null };
    }

    lastCareersIndex = careersIndex || null;
    lastCareersNameToId = careersNameToId || null;
    lastExistingCedulas = new Set(
      Array.from(existingCedulas || [])
        .map(x => normalizeCedula(x))
        .filter(Boolean)
    );
    lastHiddenExistingCount = 0;

    const parsed = parsePegadoDocentes({ text, careersIndex, careersNameToId });
    const parsedRows = (parsed.rows || []).map(r => ({
      ...r,
      cedula: normalizeCedula(r?.cedula)
    }));

    const visibleRows = [];
    for (const r of parsedRows){
      const ced = normalizeCedula(r?.cedula);
      if (ced && lastExistingCedulas.has(ced)){
        lastHiddenExistingCount++;
        continue;
      }
      visibleRows.push(r);
    }

    lastRows = visibleRows;
    lastStats = {
      ...(parsed.stats || null),
      hiddenExisting: lastHiddenExistingCount
    };

    // reset flags al procesar
    for (const r of lastRows){
      if (!r) continue;
      delete r.__includeAutoFixed;
      delete r.__include;
      delete r.__added;
    }

    renderPreview();

    if (lastHiddenExistingCount > 0){
      notice.ok(`Procesado. ${lastRows.length} filas visibles. ${lastHiddenExistingCount} ya existían y se ocultaron.`);
    }else{
      notice.ok(`Procesado. ${lastRows.length} filas detectadas.`);
    }

    return { rows: lastRows, stats: lastStats };
  }

  function getRows(){
    return lastRows
      .filter(r => r && r.__include === true && r.__added !== true)
      .map(r => ({
        ...r,
        cedula: normalizeCedula(r?.cedula)
      }));
  }

  function markAdded(cedula){
    const c = normalizeCedula(cedula);
    if (!c) return;

    const idx = lastRows.findIndex(r => normalizeCedula(r?.cedula) === c);
    if (idx < 0) return;

    lastRows[idx].cedula = c;
    lastRows[idx].__added = true;
    lastRows[idx].__include = false;

    renderPreview();
    notice.ok("Ya se agregó a la base de datos.");
  }

  return { open, close, clear, process, getRows, markAdded };
}