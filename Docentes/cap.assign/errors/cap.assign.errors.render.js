/* =========================================================
Nombre del archivo: cap.assign.errors.render.js
Ruta - Ubicación: /cap.assign/errors/cap.assign.errors.render.js
Función:
- renderErrorsReport(report, filterMode)

✅ Cambio mínimo:
- Agrega selector (checkbox) por item + acciones por sección
- No implementa borrado aún (eso va en errors.ui.js en el siguiente chat)
========================================================= */

import { escapeAttr, escapeHtml, groupBy, num, str } from "./cap.assign.errors.utils.js";

const LEVEL = { error: "error", warn: "warn", info: "info" };
const AREA  = { db: "db", ui: "ui" };

const TYPE = {
  docente: "docente",
  carrera: "carrera",
  cap: "capacitacion",
  tabla: "tabla",
  pendientes: "pendientes"
};

function prettyType(t){
  if (t === TYPE.docente) return "Docentes";
  if (t === TYPE.carrera) return "Carreras";
  if (t === TYPE.cap) return "Capacitaciones";
  if (t === TYPE.tabla) return "Tabla";
  if (t === TYPE.pendientes) return "Pendientes";
  return String(t || "General");
}

function itemHTML(it){
  const cls =
    it.level === LEVEL.error ? "e-item e-item--err" :
    it.level === LEVEL.warn  ? "e-item e-item--warn" :
    "e-item e-item--info";

  const refTxt = it.ref ? `<div class="e-item__ref">${escapeHtml(it.ref)}</div>` : "";
  const sug = it.suggestion ? `<div class="e-item__sug">${escapeHtml(it.suggestion)}</div>` : "";

  // ✅ NUEVO: checkbox de selección múltiple.
  // Comentario técnico: se guarda metadata para que el handler (errors.ui.js) pueda resolver qué borrar.
  const bulkBox = `
    <input
      type="checkbox"
      class="e-bulk-cb"
      data-bulk="1"
      data-area="${escapeAttr(it.area)}"
      data-type="${escapeAttr(it.type)}"
      data-level="${escapeAttr(it.level)}"
      data-ref="${escapeAttr(it.ref || "")}"
      data-capid="${escapeAttr(it?.extra?.badCapId || "")}"
      aria-label="Seleccionar error"
    />
  `;

  return `
    <div class="${cls}">
      <div class="e-item__head">
        ${bulkBox}
        <span class="e-tag e-tag--${escapeAttr(it.level)}">${escapeHtml(it.level.toUpperCase())}</span>
        <span class="e-tag e-tag--area">${escapeHtml(it.area.toUpperCase())}</span>
        <span class="e-tag e-tag--type">${escapeHtml(prettyType(it.type))}</span>
      </div>
      ${refTxt}
      <div class="e-item__msg">${escapeHtml(it.message)}</div>
      ${sug}
      ${buildActions(it)}
    </div>
  `;
}

function buildActions(it){
  const ref  = str(it.ref);
  const type = str(it.type);
  const area = str(it.area);

  const btns = [];
  const copyLine = `${area}|${type}|${it.level}|${ref}|${it.message}`;
  btns.push(`<button class="btn ghost" type="button" data-action="copy" data-copy="${escapeAttr(copyLine)}">Copiar</button>`);

  if (area === AREA.ui){
    btns.push(`<button class="btn ghost" type="button" data-action="rerender">Re-render</button>`);
  }

  if (area === AREA.db && ref){
    if (type === TYPE.docente || type === TYPE.carrera || type === TYPE.cap){
      btns.push(`<button class="btn ghost" type="button" data-action="openEdit" data-type="${escapeAttr(type)}" data-ref="${escapeAttr(ref)}">Editar</button>`);
      btns.push(`<button class="btn ghost danger" type="button" data-action="openEdit" data-type="${escapeAttr(type)}" data-ref="${escapeAttr(ref)}" data-mode="delete">Borrar</button>`);
    }
  }

  if (area === AREA.db && type === TYPE.docente && it.extra && it.extra.badCapId && ref){
    btns.push(`<button class="btn ghost" type="button" data-action="quickRemoveCapRef" data-type="${escapeAttr(type)}" data-ref="${escapeAttr(ref)}" data-capid="${escapeAttr(it.extra.badCapId)}">Quitar referencia inválida</button>`);
  }

  return `<div class="e-actions">${btns.join("")}</div>`;
}

function sectionHTML(area, type, list){
  const titleArea = area === AREA.db ? "Base de datos" : "Tabla y UI";
  const titleType = prettyType(type);

  const countErr  = list.filter(x => x.level === LEVEL.error).length;
  const countWarn = list.filter(x => x.level === LEVEL.warn).length;

  // ✅ NUEVO: acciones de selección/borrado por sección.
  // Comentario técnico: el handler real se implementa en errors.ui.js (siguiente chat).
  const sectionKey = `${area}__${type}`;
  const bulkActions = `
    <div class="e-actions" style="margin:10px 12px 0 12px;">
      <button class="btn ghost" type="button" data-action="bulkSelectSection" data-key="${escapeAttr(sectionKey)}">Seleccionar sección</button>
      <button class="btn ghost danger" type="button" data-action="bulkDeleteSelected" data-key="${escapeAttr(sectionKey)}">Borrar seleccionados</button>
    </div>
  `;

  return `
    <details class="e-sec" open data-key="${escapeAttr(sectionKey)}">
      <summary class="e-sec__sum">
        <span class="e-sec__title">${escapeHtml(titleArea)} · ${escapeHtml(titleType)}</span>
        <span class="e-sec__badges">
          <span class="e-badge e-badge--err">${countErr} err</span>
          <span class="e-badge e-badge--warn">${countWarn} warn</span>
          <span class="e-badge e-badge--tot">${list.length} total</span>
        </span>
      </summary>

      ${bulkActions}

      <div class="e-list">
        ${list.map(itemHTML).join("")}
      </div>
    </details>
  `;
}

export function renderErrorsReport(report, filterMode){
  const sumEl  = document.getElementById("errorsSummary");
  const bodyEl = document.getElementById("errorsBody");
  if (!sumEl || !bodyEl) return;

  const items = Array.isArray(report && report.items) ? report.items : [];
  const f = String(filterMode || "all");

  const filtered = items.filter((it) => {
    if (f === "all") return true;
    if (f === "db") return it.area === AREA.db;
    if (f === "ui") return it.area === AREA.ui;
    if (f === "error") return it.level === LEVEL.error;
    if (f === "warn") return it.level === LEVEL.warn;
    return true;
  });

  const s = report && report.summary ? report.summary : { errors:0, warnings:0, info:0 };

  sumEl.innerHTML = `
    <div class="e-pill e-pill--err">Errores: ${num(s.errors)}</div>
    <div class="e-pill e-pill--warn">Advertencias: ${num(s.warnings)}</div>
    <div class="e-pill e-pill--info">Info: ${num(s.info)}</div>
    <div class="e-meta">
      Docentes: ${num(report?.meta?.counts?.docentes)} ·
      Carreras: ${num(report?.meta?.counts?.carreras)} ·
      Caps: ${num(report?.meta?.counts?.caps)} ·
      Filas: ${num(report?.meta?.counts?.tableRows)}
    </div>
  `;

  if (!filtered.length){
    bodyEl.innerHTML = `<div class="e-empty">No hay hallazgos para este filtro.</div>`;
    return;
  }

  const groups = groupBy(filtered, (it) => `${it.area}__${it.type}`);
  const parts = [];

  Object.keys(groups).sort().forEach((key) => {
    const [area, type] = key.split("__");
    parts.push(sectionHTML(area, type, groups[key] || []));
  });

  bodyEl.innerHTML = parts.join("");
}
