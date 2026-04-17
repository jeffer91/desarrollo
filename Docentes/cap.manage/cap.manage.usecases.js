/* =========================================================
Nombre del archivo: cap.manage.usecases.js
Ruta - Ubicación: /cap.manage/cap.manage.usecases.js
Función o funciones:
- refreshCapsInitial({state})
- onSaveCap({state})
- onClearForm({state})
- onSearchChange({state, value})
- onTableClick({state, event})

CORRECCIÓN (Pop-up edición + ID):
- El pop-up ahora permite editar el ID del documento (docId).
- Si el ID cambia, se migra en Firestore:
  setDoc(nuevoId, datos) + deleteDoc(viejoId)
- Se valida el ID para evitar caracteres inválidos (Firestore no permite "/" en docId).
========================================================= */
import { msg } from "./cap.manage.utils.js";
import { validateCapForm } from "./cap.manage.validate.js";
import { readCapForm, buildPayload } from "./cap.manage.form.read.js";
import { clearCapForm, setFormMode } from "./cap.manage.form.write.js";
import { renderCapTable } from "./cap.manage.table.render.js";
import {
  listarCapacitaciones,
  crearCapacitacion,
  actualizarCapacitacion,
  borrarCapacitacion
} from "./cap.manage.data.cap.js";

/* =========================================================
✅ ALERTA VISIBLE DE ERRORES
- Comentario: algunos errores pasan desapercibidos si solo se muestra msg().
- Esto fuerza un popup (alert) además del msg.
========================================================= */
function reportErr(prefix, err){
  const text = `${prefix}: ${err && err.message ? err.message : String(err)}`;
  msg(text, "err");   // mantiene tu UI
  alert(text);        // ✅ alerta visible inmediata
}

export async function refreshCapsInitial({ state }){
  const rows = await listarCapacitaciones();
  state.setRows(rows);
  renderCapTable(state);
}

export async function onSaveCap({ state }){
  try{
    const form = readCapForm();
    if (!form.ok){
      msg(form.err || "Formulario inválido.", "err");
      return;
    }

    const payload = form.payload;

    const v = validateCapForm({
      nombre: payload.nombre,
      mesIni: payload.periodo && payload.periodo.mesIni,
      anioIni: payload.periodo && payload.periodo.anioIni,
      mesFin: payload.periodo && payload.periodo.mesFin,
      anioFin: payload.periodo && payload.periodo.anioFin,
      fechaIni: payload.fechaInicio,
      fechaFin: payload.fechaFin,
      modalidad: payload.modalidad,
      tipoCapacitacion: payload.tipoCapacitacion,
      tipoEvento: payload.tipoEvento,
      ambito: payload.ambito,
      imparte: payload.imparte
    });

    if (!v.ok){
      msg(v.errors[0] || "Formulario inválido.", "err");
      return;
    }

    if (state.S.editId){
      await actualizarCapacitacion(state.S.editId, payload);
      msg("Cambios guardados ✅", "ok");
      setFormMode(state, false, "");
    } else {
      await crearCapacitacion(payload);
      msg("Capacitación creada ✅", "ok");
      clearCapForm(state);
    }

    const rows = await listarCapacitaciones();
    state.setRows(rows);
    renderCapTable(state);

  } catch(err){
    // ✅ antes: solo msg(); ahora: msg() + alert()
    reportErr("Error al guardar", err);
  }
}

export function onClearForm({ state }){
  clearCapForm(state);
}

export function onSearchChange({ state, value }){
  state.setSearch(value || "");
  renderCapTable(state);
}

export async function onTableClick({ state, event }){
  const t = event && event.target ? event.target : null;
  if (!t) return;

  const btn = t.closest && t.closest("button[data-action]");
  const tr = t.closest && t.closest("tr[data-id]");

  if (tr && tr.dataset && tr.dataset.id){
    state.setSelectedId(tr.dataset.id);
    renderCapTable(state);
  }

  if (!btn) return;

  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (!id) return;

  if (action === "edit"){
    const row = (state.S.rows || []).find(r => r.id === id);
    if (!row){
      msg("No se encontró la capacitación seleccionada.", "err");
      return;
    }

    try{
      const res = await openEditDialog({ state, row });
      if (!res) return; // cancelado

      // ✅ Si cambia el ID, migramos docId en Firestore (copy + delete)
      if (res.newId && res.newId !== row.id){
        await migrateCapDocId({
          oldId: row.id,
          newId: res.newId,
          payload: res.payload,
          oldRow: row
        });
        msg("Cambios guardados ✅ (ID actualizado)", "ok");
      } else {
        await actualizarCapacitacion(row.id, res.payload);
        msg("Cambios guardados ✅", "ok");
      }

      const rows = await listarCapacitaciones();
      state.setRows(rows);
      state.setSelectedId(res.newId && res.newId !== row.id ? res.newId : row.id);
      renderCapTable(state);

    } catch(err){
      // ✅ antes: solo msg(); ahora: msg() + alert()
      reportErr("Error al editar", err);
    }
    return;
  }

  if (action === "del"){
    const ok = confirm("¿Eliminar esta capacitación? Esta acción no se puede deshacer.");
    if (!ok) return;

    try{
      await borrarCapacitacion(id);
      msg("Capacitación eliminada ✅", "ok");

      if (state.S.editId === id){
        setFormMode(state, false, "");
      }
      if (state.S.selectedId === id){
        state.setSelectedId("");
      }

      const rows = await listarCapacitaciones();
      state.setRows(rows);
      renderCapTable(state);

    } catch(err){
      // ✅ antes: solo msg(); ahora: msg() + alert()
      reportErr("Error al eliminar", err);
    }
  }
}

/* =========================================================
POP-UP (dialog) edición completa + edición de ID
- Se crea dinámicamente (no requiere modificar index.html)
- Devuelve { payload, newId } o null si cancelas
========================================================= */
function openEditDialog({ state, row }){
  return new Promise((resolve) => {
    let dlg = document.getElementById("__capEditDialog");
    if (dlg) dlg.remove();

    dlg = document.createElement("dialog");
    dlg.id = "__capEditDialog";
    dlg.style.padding = "0";
    dlg.style.border = "1px solid rgba(15,23,42,.18)";
    dlg.style.borderRadius = "14px";
    dlg.style.maxWidth = "860px";
    dlg.style.width = "calc(100% - 24px)";

    const p = row.periodo || {};
    const vId = String(row.id || "");
    const vNombre = String(row.nombre || "");
    const vHoras = String(row.horas ?? row.duracionHoras ?? row.duracion ?? "");
    const vMesIni = String(p.mesIni || "01");
    const vAnioIni = String(p.anioIni || new Date().getFullYear());
    const vMesFin = String(p.mesFin || "01");
    const vAnioFin = String(p.anioFin || new Date().getFullYear());
    const vFechaIni = String(row.fechaInicio || "");
    const vFechaFin = String(row.fechaFin || "");
    const vModalidad = String(row.modalidad || "presencial");
    const vTipoCap = String(row.tipoCapacitacion || "generica");
    const vTipoEvt = String(row.tipoEvento || "curso");
    const vAmbito = String(row.ambito || "nacional");
    const vImparte = String(row.imparte || "");

    dlg.innerHTML = `
      <div style="padding:14px 14px 10px 14px; background:linear-gradient(180deg, rgba(37,99,235,.08), #fff); border-bottom:1px solid rgba(15,23,42,.10);">
        <div style="font-weight:950;">Editar capacitación</div>
        <div style="font-size:12px; color:#475569; margin-top:2px;">ID actual: ${escapeHtml(vId)}</div>
      </div>

      <div id="__eErr" style="display:none; margin:10px 14px 0 14px; padding:10px 12px; border-radius:12px; border:1px solid rgba(225,29,72,.25); background: rgba(225,29,72,.08); color:#7f1d1d; font-size:13px; font-weight:800;"></div>

      <form method="dialog" style="padding:14px; display:grid; gap:10px;">
        <!-- ✅ NUEVO: ID editable -->
        <div>
          <label style="font-size:12px; color:#475569; display:block; margin:2px 0 5px;">ID documento (Firestore)</label>
          <input id="__eId" value="${escapeAttr(vId)}" style="width:100%; padding:8px 10px; border-radius:12px; border:1px solid rgba(15,23,42,.12);" />
          <div style="font-size:12px; color:#475569; margin-top:4px;">
            Nota: no se permite "/" y se normaliza a minúsculas/guiones.
          </div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 220px; gap:10px; align-items:end;">
          <div>
            <label style="font-size:12px; color:#475569; display:block; margin:2px 0 5px;">Nombre</label>
            <input id="__eNombre" value="${escapeAttr(vNombre)}" style="width:100%; padding:8px 10px; border-radius:12px; border:1px solid rgba(15,23,42,.12);" />
          </div>
          <div>
            <label style="font-size:12px; color:#475569; display:block; margin:2px 0 5px;">Horas</label>
            <input id="__eHoras" type="number" min="0" step="1" value="${escapeAttr(vHoras)}" style="width:100%; padding:8px 10px; border-radius:12px; border:1px solid rgba(15,23,42,.12);" />
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(4, minmax(160px, 1fr)); gap:10px; align-items:end;">
          <div>
            <label style="font-size:12px; color:#475569; display:block; margin:2px 0 5px;">Mes inicio</label>
            ${monthSelect("__eMesIni", vMesIni)}
          </div>
          <div>
            <label style="font-size:12px; color:#475569; display:block; margin:2px 0 5px;">Año inicio</label>
            <input id="__eAnioIni" inputmode="numeric" value="${escapeAttr(vAnioIni)}" style="width:100%; padding:8px 10px; border-radius:12px; border:1px solid rgba(15,23,42,.12); text-align:center; font-weight:900;" />
          </div>
          <div>
            <label style="font-size:12px; color:#475569; display:block; margin:2px 0 5px;">Mes fin</label>
            ${monthSelect("__eMesFin", vMesFin)}
          </div>
          <div>
            <label style="font-size:12px; color:#475569; display:block; margin:2px 0 5px;">Año fin</label>
            <input id="__eAnioFin" inputmode="numeric" value="${escapeAttr(vAnioFin)}" style="width:100%; padding:8px 10px; border-radius:12px; border:1px solid rgba(15,23,42,.12); text-align:center; font-weight:900;" />
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(2, minmax(220px, 1fr)); gap:10px; align-items:end;">
          <div>
            <label style="font-size:12px; color:#475569; display:block; margin:2px 0 5px;">Fecha inicio</label>
            <input id="__eFechaIni" type="date" value="${escapeAttr(vFechaIni)}" style="width:100%; padding:8px 10px; border-radius:12px; border:1px solid rgba(15,23,42,.12);" />
          </div>
          <div>
            <label style="font-size:12px; color:#475569; display:block; margin:2px 0 5px;">Fecha fin</label>
            <input id="__eFechaFin" type="date" value="${escapeAttr(vFechaFin)}" style="width:100%; padding:8px 10px; border-radius:12px; border:1px solid rgba(15,23,42,.12);" />
          </div>
        </div>

        <div style="display:grid; grid-template-columns: repeat(4, minmax(160px, 1fr)); gap:10px; align-items:end;">
          <div>
            <label style="font-size:12px; color:#475569; display:block; margin:2px 0 5px;">Modalidad</label>
            ${simpleSelect("__eModalidad", [
              ["presencial","Presencial"],
              ["semipresencial","Semipresencial"],
              ["virtual","Virtual"],
              ["hibrida","Híbrida"]
            ], vModalidad)}
          </div>
          <div>
            <label style="font-size:12px; color:#475569; display:block; margin:2px 0 5px;">Capacitación</label>
            ${simpleSelect("__eTipoCap", [
              ["generica","Genérica"],
              ["especifica","Específica"]
            ], vTipoCap)}
          </div>
          <div>
            <label style="font-size:12px; color:#475569; display:block; margin:2px 0 5px;">Tipo</label>
            ${simpleSelect("__eTipoEvt", [
              ["curso","Curso"],
              ["taller","Taller"],
              ["seminario","Seminario"],
              ["diplomado","Diplomado"],
              ["conferencia","Conferencia"]
            ], vTipoEvt)}
          </div>
          <div>
            <label style="font-size:12px; color:#475569; display:block; margin:2px 0 5px;">Ámbito</label>
            ${simpleSelect("__eAmbito", [
              ["nacional","Nacional"],
              ["internacional","Internacional"]
            ], vAmbito)}
          </div>
        </div>

        <div>
          <label style="font-size:12px; color:#475569; display:block; margin:2px 0 5px;">¿Quién da la capacitación?</label>
          <input id="__eImparte" value="${escapeAttr(vImparte)}" style="width:100%; padding:8px 10px; border-radius:12px; border:1px solid rgba(15,23,42,.12);" />
        </div>

        <div style="display:flex; gap:10px; justify-content:flex-end; align-items:center; padding-top:4px;">
          <button id="__eCancel" type="button" style="padding:8px 12px; border-radius:12px; border:1px solid rgba(15,23,42,.12); background:#fff; font-weight:900; cursor:pointer;">Cancelar</button>
          <button id="__eSave" type="button" style="padding:8px 12px; border-radius:12px; border:1px solid rgba(37,99,235,.55); background:linear-gradient(180deg,#2563eb,#4f46e5); color:#fff; font-weight:950; cursor:pointer;">Guardar</button>
        </div>
      </form>
    `;

    document.body.appendChild(dlg);

    const errBox = () => dlg.querySelector("#__eErr");
    const showErr = (text) => {
      const el = errBox();
      if (!el) return;
      el.textContent = text || "Error.";
      el.style.display = "block";
    };
    const clearErr = () => {
      const el = errBox();
      if (!el) return;
      el.textContent = "";
      el.style.display = "none";
    };

    const closeWith = (value) => {
      try{ dlg.close(); } catch(_e) {}
      dlg.remove();
      resolve(value);
    };

    dlg.querySelector("#__eCancel").addEventListener("click", () => closeWith(null));

    dlg.querySelector("#__eSave").addEventListener("click", () => {
      clearErr();

      // ✅ Nuevo ID
      const rawNewId = String(dlg.querySelector("#__eId").value || "").trim();
      const newId = normalizeDocId(rawNewId);
      if (!newId){
        showErr("ID inválido. Escribe un ID con letras/números y sin '/'.");
        return;
      }

      const nombre = String(dlg.querySelector("#__eNombre").value || "").trim();
      const horas = String(dlg.querySelector("#__eHoras").value || "").trim();

      const mesIni = String(dlg.querySelector("#__eMesIni").value || "01");
      const anioIni = String(dlg.querySelector("#__eAnioIni").value || "").trim();
      const mesFin = String(dlg.querySelector("#__eMesFin").value || "01");
      const anioFin = String(dlg.querySelector("#__eAnioFin").value || "").trim();

      const fechaIni = String(dlg.querySelector("#__eFechaIni").value || "").trim();
      const fechaFin = String(dlg.querySelector("#__eFechaFin").value || "").trim();

      const modalidad = String(dlg.querySelector("#__eModalidad").value || "").trim();
      const tipoCapacitacion = String(dlg.querySelector("#__eTipoCap").value || "").trim();
      const tipoEvento = String(dlg.querySelector("#__eTipoEvt").value || "").trim();
      const ambito = String(dlg.querySelector("#__eAmbito").value || "").trim();
      const imparte = String(dlg.querySelector("#__eImparte").value || "").trim();

      const payload = buildPayload({
        nombre,
        mesIni, anioIni,
        mesFin, anioFin,
        fechaIni, fechaFin,
        horas,
        modalidad, tipoCapacitacion, tipoEvento, ambito, imparte
      });

      const v = validateCapForm({
        nombre: payload.nombre,
        mesIni: payload.periodo && payload.periodo.mesIni,
        anioIni: payload.periodo && payload.periodo.anioIni,
        mesFin: payload.periodo && payload.periodo.mesFin,
        anioFin: payload.periodo && payload.periodo.anioFin,
        fechaIni: payload.fechaInicio,
        fechaFin: payload.fechaFin,
        modalidad: payload.modalidad,
        tipoCapacitacion: payload.tipoCapacitacion,
        tipoEvento: payload.tipoEvento,
        ambito: payload.ambito,
        imparte: payload.imparte
      });

      if (!v.ok){
        showErr(v.errors[0] || "Formulario inválido.");
        return;
      }

      closeWith({ payload, newId });
    });

    if (typeof dlg.showModal === "function") dlg.showModal();
    else closeWith(null);
  });
}

/* =========================================================
Migración de docId (Firestore no permite renombrar)
========================================================= */
async function migrateCapDocId({ oldId, newId, payload, oldRow }){
  // Comentario: copiamos datos al nuevo docId y borramos el anterior.
  // Advertencia: si existieran subcolecciones, NO se migran con este método.
  const { doc, getDoc, setDoc, deleteDoc, serverTimestamp } =
    await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");

  const { getDb } = await import("./cap.manage.firebase.js");
  const db = await getDb();
  const COL = "capacitaciones";

  // 1) Verifica que no exista el nuevo ID
  const newRef = doc(db, COL, newId);
  const exists = await getDoc(newRef);
  if (exists.exists()){
    throw new Error("Ese ID ya existe. Elige otro.");
  }

  // 2) Escribe el nuevo doc
  const createdAtKeep = (oldRow && oldRow.createdAt) ? oldRow.createdAt : serverTimestamp();

  await setDoc(newRef, {
    ...payload,
    createdAt: createdAtKeep,        // conserva createdAt si existía
    updatedAt: serverTimestamp()
  });

  // 3) Borra el doc viejo
  const oldRef = doc(db, COL, oldId);
  await deleteDoc(oldRef);
}

/* =========================================================
Helpers UI (selects) - internos de este archivo
========================================================= */
function monthSelect(id, selected){
  const opts = [
    ["01","Enero"],["02","Febrero"],["03","Marzo"],["04","Abril"],
    ["05","Mayo"],["06","Junio"],["07","Julio"],["08","Agosto"],
    ["09","Septiembre"],["10","Octubre"],["11","Noviembre"],["12","Diciembre"]
  ];
  return simpleSelect(id, opts, selected);
}

function simpleSelect(id, opts, selected){
  const sel = String(selected || "");
  const html = `
    <select id="${escapeAttr(id)}" style="width:100%; padding:8px 10px; border-radius:12px; border:1px solid rgba(15,23,42,.12); background:#fff;">
      ${opts.map(([v,t]) => {
        const s = (String(v) === sel) ? " selected" : "";
        return `<option value="${escapeAttr(v)}"${s}>${escapeHtml(t)}</option>`;
      }).join("")}
    </select>
  `;
  return html;
}

/* =========================================================
Validación/normalización del docId
========================================================= */
function normalizeDocId(raw){
  // Comentario:
  // - Firestore NO permite "/" en docId.
  // - Normalizamos a: minúsculas, sin acentos, solo [a-z0-9-], colapsa guiones.
  // - Si queda vacío => inválido.
  const s = String(raw || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\//g, "-")           // evita el caracter prohibido
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

  return s || "";
}

/* =========================================================
Escape (para HTML generado en el dialog)
========================================================= */
function escapeHtml(s){
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
function escapeAttr(s){ return escapeHtml(s); }
