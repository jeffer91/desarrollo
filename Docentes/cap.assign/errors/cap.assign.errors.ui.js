/* =========================================================
Nombre del archivo: cap.assign.errors.ui.js
Ruta - Ubicación: /cap.assign/errors/cap.assign.errors.ui.js
Función:
- Inyecta HTML/CSS de modales (panel + editor)
- Wiring de eventos (clicks, rerun, filtros, acciones)

✅ Correcciones incluidas (alineadas a “ASIGNACIÓN”, NO borrar entidades):
1) Cierre por backdrop del editor: usa closeEditModal() (cierre completo).
2) Borrado masivo: SOLO borra asignaciones (quita capId inválido del docente).
   - 🚫 No borra documentos (docentes/carreras/capacitaciones) desde este módulo.
3) Botón “Borrar” del editor: bloqueado para evitar borrar entidades por error.
========================================================= */

import { toast, safeErr, escapeAttr, escapeHtml } from "./cap.assign.errors.utils.js";
import { renderErrorsReport } from "./cap.assign.errors.render.js";
import { openEditModal, closeEditModal, onEditSave, onEditDelete, onQuickRemoveInvalidCapRef } from "./cap.assign.errors.editor.js";

const IDS = {
  modal: "errorsModal",
  close: "btnErrorsClose",
  rerun: "btnErrorsRerun",
  body: "errorsBody",
  summary: "errorsSummary",
  filter: "errorsFilter",

  // editor
  editModal: "errorsEditModal",
  editClose: "btnErrorsEditClose",
  editSave: "btnErrorsEditSave",
  editDelete: "btnErrorsEditDelete",
  editTitle: "errorsEditTitle",
  editRef: "errorsEditRef",
  editArea: "errorsEditArea",
  editType: "errorsEditType",
  editJson: "errorsEditJson",
  editMsg: "errorsEditMsg",
  editConfirmWrap: "errorsEditConfirmWrap",
  editConfirmInput: "errorsEditConfirmInput"
};

function $(id){ return document.getElementById(id); }

/* =========================
Panel principal
========================= */
export function ensureErrorsUIInternal(){
  if (!$(IDS.modal)){
    const host = document.body || document.documentElement;
    if (host){
      const wrap = document.createElement("div");
      wrap.innerHTML = errorsModalHTML();
      host.appendChild(wrap.firstElementChild);
    }
  }

  // backdrop close
  const modal = $(IDS.modal);
  if (modal && !modal.__wired){
    modal.__wired = true;

    modal.addEventListener("click", (e) => {
      const t = e && e.target ? e.target : null;
      if (t && t.dataset && t.dataset.close === "1") closeErrorsUI();
    });

    const btnClose = $(IDS.close);
    if (btnClose) btnClose.addEventListener("click", () => closeErrorsUI());

    const btnRerun = $(IDS.rerun);
    if (btnRerun){
      btnRerun.addEventListener("click", () => {
        const st = window.__CAP_ASSIGN_ERRORS_STATE__;
        if (st && typeof window.openErrorsPanel === "function"){
          window.openErrorsPanel({ state: st, _rerun: true });
          return;
        }
        // fallback si no está global:
        const report = window.__CAP_ASSIGN_ERRORS_LAST__;
        const filter = $(IDS.filter);
        if (report) renderErrorsReport(report, filter ? filter.value : "all");
      });
    }

    const filter = $(IDS.filter);
    if (filter){
      filter.addEventListener("change", () => {
        const last = window.__CAP_ASSIGN_ERRORS_LAST__;
        if (last) renderErrorsReport(last, filter.value);
      });
    }

    const bodyEl = $(IDS.body);
    if (bodyEl){
      bodyEl.addEventListener("click", async (e) => {
        const t = e && e.target ? e.target : null;
        if (!t) return;

        // Comentario técnico: soporta clicks en hijos (ej: <span> dentro del botón).
        const el = (t.closest && t.closest("[data-action]")) ? t.closest("[data-action]") : t;
        if (!el || !el.dataset) return;

        const action = el.dataset.action || "";
        if (!action) return;

        const ref = el.dataset.ref || "";
        const type = el.dataset.type || "";
        const capId = el.dataset.capid || "";
        const state = window.__CAP_ASSIGN_ERRORS_STATE__;

        if (action === "rerender"){
          try{
            if (state && typeof state.onForceRender === "function") state.onForceRender();
            toast("Re-render solicitado.");
          }catch(_){
            toast("No se pudo re-renderizar.");
          }
          return;
        }

        if (action === "openEdit"){
          // Nota: abrir editor sirve para INSPECCIONAR/EDITAR JSON (si tu flujo lo permite),
          // pero el borrado de ENTIDADES queda bloqueado (ver ensureEditUI()).
          await openEditModal({ state, type, ref });
          return;
        }

        if (action === "quickRemoveCapRef"){
          // ✅ Acción correcta para este módulo: borrar ASIGNACIÓN (quitar capId inválido del docente).
          await onQuickRemoveInvalidCapRef({ state, docenteId: ref, badCapId: capId });
          // rerun
          const btn = $(IDS.rerun);
          if (btn) btn.click();
          return;
        }

        // ✅ Selección masiva por sección (checkboxes del render)
        if (action === "bulkSelectSection"){
          const key = (el.dataset.key || "").replace(/"/g, '\\"');
          const sec = document.querySelector(`details.e-sec[data-key="${key}"]`);
          const cbs = sec ? Array.from(sec.querySelectorAll('input[type="checkbox"][data-bulk="1"]')) : [];
          const all = cbs.length ? cbs.every(cb => !!cb.checked) : false;
          cbs.forEach(cb => { cb.checked = !all; });
          toast(all ? "Selección limpiada." : "Sección seleccionada.");
          return;
        }

        // ✅ Borrado masivo: SOLO borra ASIGNACIONES (no borra entidades)
        if (action === "bulkDeleteSelected"){
          const key = (el.dataset.key || "").replace(/"/g, '\\"');
          const sec = document.querySelector(`details.e-sec[data-key="${key}"]`);
          const cbs = sec ? Array.from(sec.querySelectorAll('input[type="checkbox"][data-bulk="1"]:checked')) : [];
          if (!cbs.length){ toast("No hay seleccionados."); return; }

          // Comentario técnico: este módulo NO debe borrar documentos completos.
          // Solo se permite “borrar asignación” cuando existe capId inválido (badCapId).
          if (!confirm(`¿Quitar asignaciones inválidas de ${cbs.length} seleccionados?`)) return;

          let applied = 0;
          let skipped = 0;

          for (const cb of cbs){
            const area = cb.dataset.area || "";
            const ty   = cb.dataset.type || "";
            const ref0 = cb.dataset.ref || "";
            const cap0 = cb.dataset.capid || "";

            // ✅ Caso permitido: referencia inválida de cap dentro de docente
            if (area === "db" && ty === "docente" && ref0 && cap0){
              await onQuickRemoveInvalidCapRef({ state, docenteId: ref0, badCapId: cap0 });
              applied++;
              continue;
            }

            // 🚫 Todo lo demás se omite para evitar borrar ENTIDADES.
            skipped++;
          }

          const btn = $(IDS.rerun);
          if (btn) btn.click(); // refresca lista

          if (applied && !skipped){
            toast("Asignaciones inválidas eliminadas.");
          } else if (applied && skipped){
            toast(`Listo: ${applied} aplicados · ${skipped} omitidos (no se borran entidades).`);
          } else {
            toast("Nada aplicable: este panel solo quita asignaciones inválidas.");
          }
          return;
        }

        if (action === "copy"){
          const txt = el.dataset.copy || "";
          if (!txt) return;
          try{
            await navigator.clipboard.writeText(txt);
            toast("Copiado.");
          }catch(_){
            toast("No se pudo copiar.");
          }
          return;
        }
      });
    }
  }

  ensureEditUI();
}

export function openErrorsUI(){
  const modal = $(IDS.modal);
  if (!modal) return;
  modal.dataset.open = "1";
  modal.setAttribute("aria-hidden", "false");
}

export function closeErrorsUI(){
  const modal = $(IDS.modal);
  if (!modal) return;
  modal.dataset.open = "0";
  modal.setAttribute("aria-hidden", "true");
}

/* =========================
Editor submodal
========================= */
export function ensureEditUI(){
  if ($(IDS.editModal)) return;

  const host = document.body || document.documentElement;
  if (!host) return;

  const wrap = document.createElement("div");
  wrap.innerHTML = editModalHTML();
  host.appendChild(wrap.firstElementChild);

  const modal = $(IDS.editModal);
  if (modal){
    modal.addEventListener("click", (e) => {
      const t = e && e.target ? e.target : null;
      // ✅ Corrección: cierre completo (limpia ctx y UI de confirmación) al cerrar por backdrop.
      if (t && t.dataset && t.dataset.close === "1") closeEditModal();
    });
  }

  const btnClose = $(IDS.editClose);
  if (btnClose) btnClose.addEventListener("click", () => closeEditModal());

  const btnSave = $(IDS.editSave);
  if (btnSave) btnSave.addEventListener("click", () => onEditSave());

  const btnDel = $(IDS.editDelete);
  if (btnDel){
    // 🚫 BLOQUEO: este módulo NO borra entidades (docentes/carreras/capacitaciones).
    // “Borrar” aquí debe ser solo quitar asignación (se hace con quickRemoveCapRef desde la lista).
    btnDel.addEventListener("click", () => {
      toast("Este panel no borra entidades. Solo quita asignaciones inválidas.");
      setEditMessage("Acción bloqueada: no se borra el documento completo desde Asignación.");
      // (No llamamos a onEditDelete() para evitar deleteEntity() accidental)
    });
  }
}

export function openEditUI(){
  const modal = $(IDS.editModal);
  if (!modal) return;
  modal.dataset.open = "1";
  modal.setAttribute("aria-hidden", "false");
}

export function closeEditUI(){
  const modal = $(IDS.editModal);
  if (!modal) return;
  modal.dataset.open = "0";
  modal.setAttribute("aria-hidden", "true");
}

export function setEditHeader(title, ref, area, type){
  const t = $(IDS.editTitle);
  const r = $(IDS.editRef);
  const a = $(IDS.editArea);
  const ty = $(IDS.editType);
  if (t) t.textContent = title || "Editar";
  if (r) r.textContent = ref || "—";
  if (a) a.textContent = area || "—";
  if (ty) ty.textContent = type || "—";
}

export function setEditMessage(msg){
  const el = $(IDS.editMsg);
  if (el) el.textContent = msg || "—";
}

export function setEditLoading(isLoading){
  const btnSave = $(IDS.editSave);
  const btnDel  = $(IDS.editDelete);
  if (btnSave) btnSave.disabled = !!isLoading;
  if (btnDel)  btnDel.disabled  = !!isLoading;
}

export function getEditJson(){
  const el = $(IDS.editJson);
  return el ? el.value : "";
}

export function setEditJson(v){
  const el = $(IDS.editJson);
  if (el) el.value = v || "";
}

export function showDeleteConfirm(show){
  const wrap = $(IDS.editConfirmWrap);
  if (wrap) wrap.style.display = show ? "block" : "none";
  const inp = $(IDS.editConfirmInput);
  if (inp && !show) inp.value = "";
}

export function getDeleteTyped(){
  const inp = $(IDS.editConfirmInput);
  return inp ? inp.value : "";
}

/* =========================
HTML (modales)
========================= */
function errorsModalHTML(){
  return `
  <div id="${IDS.modal}" class="e-modal" data-open="0" aria-hidden="true">
    <div class="e-modal__backdrop" data-close="1"></div>

    <div class="e-modal__panel" role="dialog" aria-modal="true" aria-label="Errores">
      <div class="e-modal__head">
        <div>
          <div class="e-h3">Errores</div>
          <div class="e-muted">Diagnóstico y acciones sobre datos y UI.</div>
        </div>

        <div class="e-head__actions">
          <select id="${IDS.filter}" class="e-sel" aria-label="Filtrar">
            <option value="all">Todo</option>
            <option value="db">Solo BD</option>
            <option value="ui">Solo UI</option>
            <option value="error">Solo errores</option>
            <option value="warn">Solo advertencias</option>
          </select>

          <button id="${IDS.rerun}" class="btn ghost" type="button">Re-ejecutar</button>
          <button id="${IDS.close}" class="btn ghost" type="button">Cerrar</button>
        </div>
      </div>

      <div class="e-modal__summary" id="${IDS.summary}"></div>
      <div class="e-modal__body" id="${IDS.body}"></div>
    </div>

    <style>
      .e-modal{ position:fixed; inset:0; display:none; z-index:99999; }
      .e-modal[data-open="1"]{ display:block; }

      .e-modal__backdrop{ position:absolute; inset:0; background:rgba(2,6,23,.45); backdrop-filter: blur(2px); }

      .e-modal__panel{
        position:relative;
        width:min(960px, calc(100% - 24px));
        margin:24px auto;
        background: var(--surface, #fff);
        border:1px solid var(--line, rgba(15,23,42,.10));
        border-radius: var(--r-card, 18px);
        box-shadow: var(--shadow, 0 12px 22px rgba(2,6,23,.08));
        padding: var(--pad-card, 16px);
        max-height: calc(100vh - 48px);
        overflow:auto;
      }

      .e-modal__head{ display:flex; gap:12px; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; }
      .e-head__actions{ display:flex; gap:10px; align-items:center; flex-wrap:wrap; justify-content:flex-end; }

      .e-h3{ font-size: var(--fs-h3, 15px); font-weight:950; letter-spacing:.15px; }
      .e-muted{ color: var(--muted, #64748b); font-size: var(--fs-small, 12px); margin-top:2px; }

      .e-sel{
        border-radius: var(--r-control, 14px);
        border:1px solid var(--fieldBorder, rgba(15,23,42,.14));
        background: var(--fieldBg, rgba(255,255,255,.92));
        padding: var(--pad-ctl-y, 9px) var(--pad-ctl-x, 12px);
        font-size: var(--fs-base, 13px);
      }

      .e-modal__summary{ display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-top:10px; }
      .e-pill{
        display:inline-flex; align-items:center;
        padding:7px 12px; border-radius:999px; border:1px solid var(--line, rgba(15,23,42,.10));
        background: rgba(15,23,42,.04); font-weight:900; font-size: var(--fs-small, 12px);
      }
      .e-pill--err{ background: rgba(225,29,72,.10); border-color: rgba(225,29,72,.22); color: var(--rose, #e11d48); }
      .e-pill--warn{ background: rgba(217,119,6,.12); border-color: rgba(217,119,6,.22); color: var(--amber, #d97706); }
      .e-pill--info{ background: rgba(37,99,235,.10); border-color: rgba(37,99,235,.22); color: var(--blue, #2563eb); }
      .e-meta{ color: var(--muted, #64748b); font-size: var(--fs-small, 12px); margin-left:auto; }

      .e-modal__body{ margin-top:12px; display:flex; flex-direction:column; gap:10px; }
      .e-empty{ padding:12px; border:1px dashed var(--line, rgba(15,23,42,.16)); border-radius:14px; color: var(--muted, #64748b); }

      .e-sec{ border:1px solid var(--line, rgba(15,23,42,.10)); border-radius: 14px; background: rgba(2,6,23,.012); overflow:hidden; }
      .e-sec__sum{
        display:flex; gap:10px; align-items:center; justify-content:space-between;
        padding:10px 12px; cursor:pointer; list-style:none;
        background: rgba(15,23,42,.03);
        border-bottom:1px solid var(--line, rgba(15,23,42,.10));
      }
      .e-sec__title{ font-weight:950; font-size: var(--fs-base, 13px); }
      .e-sec__badges{ display:flex; gap:8px; align-items:center; }

      .e-badge{
        padding:4px 8px; border-radius:999px;
        border:1px solid var(--line, rgba(15,23,42,.10));
        font-size: 12px; font-weight:900;
        background: #fff;
      }
      .e-badge--err{ border-color: rgba(225,29,72,.22); color: var(--rose, #e11d48); background: rgba(225,29,72,.08); }
      .e-badge--warn{ border-color: rgba(217,119,6,.22); color: var(--amber, #d97706); background: rgba(217,119,6,.10); }
      .e-badge--tot{ border-color: rgba(37,99,235,.18); color: var(--blue, #2563eb); background: rgba(37,99,235,.08); }

      .e-list{ padding:12px; display:flex; flex-direction:column; gap:10px; }

      .e-item{ border:1px solid var(--line, rgba(15,23,42,.10)); border-radius: 14px; background:#fff; padding:10px 12px; }
      .e-item--err{ border-color: rgba(225,29,72,.22); background: linear-gradient(180deg, rgba(225,29,72,.06), #fff); }
      .e-item--warn{ border-color: rgba(217,119,6,.22); background: linear-gradient(180deg, rgba(217,119,6,.06), #fff); }
      .e-item--info{ border-color: rgba(37,99,235,.18); background: linear-gradient(180deg, rgba(37,99,235,.05), #fff); }

      .e-item__head{ display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:6px; }

      .e-tag{
        padding:3px 8px; border-radius:999px; font-size:12px; font-weight:950;
        border:1px solid var(--line, rgba(15,23,42,.10));
        background: rgba(15,23,42,.03);
      }
      .e-tag--error{ border-color: rgba(225,29,72,.22); color: var(--rose, #e11d48); background: rgba(225,29,72,.08); }
      .e-tag--warn{ border-color: rgba(217,119,6,.22); color: var(--amber, #d97706); background: rgba(217,119,6,.10); }
      .e-tag--info{ border-color: rgba(37,99,235,.18); color: var(--blue, #2563eb); background: rgba(37,99,235,.08); }
      .e-tag--area{ opacity:.85; }
      .e-tag--type{ opacity:.85; }

      .e-item__ref{ font-weight:900; font-size:12px; color: rgba(15,23,42,.85); }
      .e-item__msg{ margin-top:4px; font-size: var(--fs-base, 13px); color: var(--text, #0f172a); }
      .e-item__sug{ margin-top:6px; font-size:12px; color: var(--muted, #64748b); }

      .e-actions{ margin-top:10px; display:flex; gap:10px; flex-wrap:wrap; }
    </style>
  </div>
  `;
}

function editModalHTML(){
  return `
  <div id="${IDS.editModal}" class="e2-modal" data-open="0" aria-hidden="true">
    <div class="e2-modal__backdrop" data-close="1"></div>

    <div class="e2-modal__panel" role="dialog" aria-modal="true" aria-label="Editor">
      <div class="e2-head">
        <div>
          <div class="e2-h3" id="${IDS.editTitle}">Editar</div>
          <div class="e2-sub">
            Ref: <span id="${IDS.editRef}">—</span> ·
            <span id="${IDS.editArea}">—</span> ·
            <span id="${IDS.editType}">—</span>
          </div>
        </div>

        <button id="${IDS.editClose}" class="btn ghost" type="button">Cerrar</button>
      </div>

      <div class="e2-body">
        <label class="e2-lab">JSON</label>
        <textarea id="${IDS.editJson}" class="e2-json" rows="14"></textarea>

        <div id="${IDS.editConfirmWrap}" class="e2-confirm" style="display:none;">
          <div class="e2-warn">Borrar es permanente. Escribe ELIMINAR para confirmar.</div>
          <input id="${IDS.editConfirmInput}" class="e2-inp" placeholder="ELIMINAR" />
        </div>

        <div class="e2-actions">
          <button id="${IDS.editSave}" class="btn primary" type="button">Guardar</button>
          <button id="${IDS.editDelete}" class="btn ghost danger" type="button">Borrar</button>
        </div>

        <div id="${IDS.editMsg}" class="e2-msg">—</div>
      </div>
    </div>

    <style>
      .e2-modal{ position:fixed; inset:0; display:none; z-index:100000; }
      .e2-modal[data-open="1"]{ display:block; }

      .e2-modal__backdrop{ position:absolute; inset:0; background:rgba(2,6,23,.55); backdrop-filter: blur(2px); }

      .e2-modal__panel{
        position:relative;
        width:min(860px, calc(100% - 24px));
        margin:28px auto;
        background: var(--surface, #fff);
        border:1px solid var(--line, rgba(15,23,42,.10));
        border-radius: 18px;
        box-shadow: 0 18px 40px rgba(2,6,23,.18);
        padding: 14px;
        max-height: calc(100vh - 56px);
        overflow:auto;
      }

      .e2-head{ display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
      .e2-h3{ font-size: 15px; font-weight:950; }
      .e2-sub{ font-size:12px; color: var(--muted, #64748b); margin-top:2px; font-weight:800; }

      .e2-body{ margin-top:10px; display:flex; flex-direction:column; gap:10px; }

      .e2-lab{ font-size:12px; font-weight:950; color: var(--muted, #64748b); }

      .e2-json{
        width:100%;
        border-radius: 14px;
        border:1px solid rgba(15,23,42,.14);
        background: rgba(255,255,255,.95);
        padding: 12px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
        font-size: 12px;
      }

      .e2-actions{ display:flex; gap:10px; flex-wrap:wrap; }
      .e2-msg{ font-size:12px; color: var(--muted, #64748b); font-weight:800; }

      .e2-confirm{ border:1px solid rgba(225,29,72,.18); background: rgba(225,29,72,.06); padding:10px; border-radius:14px; }
      .e2-warn{ font-weight:950; color: rgba(225,29,72,.95); font-size:12px; margin-bottom:8px; }
      .e2-inp{
        width: 220px;
        border-radius: 12px;
        border:1px solid rgba(15,23,42,.14);
        padding: 10px 12px;
        font-weight:900;
      }
    </style>
  </div>
  `;
}
