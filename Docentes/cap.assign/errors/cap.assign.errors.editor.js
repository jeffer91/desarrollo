/* =========================================================
Nombre del archivo: cap.assign.errors.editor.js
Ruta - Ubicación: /cap.assign/errors/cap.assign.errors.editor.js
Función:
- Editor (submodal): abrir/guardar/borrar
========================================================= */

import { cleanSpaces } from "../cap.assign.utils.js";
import { loadEntityFromStateOrDb, upsertEntity, deleteEntity, quickRemoveInvalidCapFromDocente } from "./cap.assign.errors.firestore.js";
import { toast, safeErr, str } from "./cap.assign.errors.utils.js";
import { openEditUI, closeEditUI, ensureEditUI, setEditLoading, setEditMessage, getEditJson, setEditJson, setEditHeader, showDeleteConfirm, getDeleteTyped } from "./cap.assign.errors.ui.js";

function prettyType(type){
  if (type === "docente") return "Docentes";
  if (type === "carrera") return "Carreras";
  if (type === "capacitacion") return "Capacitaciones";
  return String(type || "Entidad");
}

export async function openEditModal({ state, type, ref }){
  ensureEditUI();
  openEditUI();

  setEditLoading(true);
  showDeleteConfirm(false);

  try{
    const entity = await loadEntityFromStateOrDb({ state, type, id: ref });
    setEditHeader(`Editar ${prettyType(type)}`, ref, "BD", prettyType(type));
    setEditJson(JSON.stringify(entity || {}, null, 2));
    setEditMessage(entity ? "Listo." : "No se encontró el documento.");
  }catch(e){
    setEditMessage(`Error al cargar: ${safeErr(e)}`);
    setEditJson("{}");
  }finally{
    setEditLoading(false);
  }

  window.__CAP_ASSIGN_EDIT_CTX__ = { state, type, ref };
}

export function closeEditModal(){
  closeEditUI();
  window.__CAP_ASSIGN_EDIT_CTX__ = null;
}

export async function onEditSave(){
  const ctx = window.__CAP_ASSIGN_EDIT_CTX__;
  if (!ctx) return;

  setEditMessage("Guardando…");

  let payload;
  try{
    payload = JSON.parse(getEditJson() || "{}");
  }catch(e){
    setEditMessage("JSON inválido. Corrige el formato.");
    return;
  }

  try{
    await upsertEntity({ state: ctx.state, type: ctx.type, id: ctx.ref, data: payload });
    setEditMessage("Guardado OK.");
    toast("Guardado.");

    // refresca panel
    if (ctx.state && typeof window.openErrorsPanel === "function"){
      window.openErrorsPanel({ state: ctx.state, _rerun: true });
    } else {
      // fallback: disparar click rerun
      const btn = document.getElementById("btnErrorsRerun");
      if (btn) btn.click();
    }
  }catch(e){
    setEditMessage(`Error al guardar: ${safeErr(e)}`);
  }
}

export async function onEditDelete(){
  const ctx = window.__CAP_ASSIGN_EDIT_CTX__;
  if (!ctx) return;

  showDeleteConfirm(true);

  const typed = cleanSpaces(getDeleteTyped());
  if (typed !== "ELIMINAR"){
    setEditMessage("Para borrar, escribe ELIMINAR en el campo de confirmación.");
    return;
  }

  setEditMessage("Borrando…");

  try{
    await deleteEntity({ state: ctx.state, type: ctx.type, id: ctx.ref });
    setEditMessage("Borrado OK.");
    toast("Borrado.");
    closeEditModal();

    // refresca panel
    const btn = document.getElementById("btnErrorsRerun");
    if (btn) btn.click();
  }catch(e){
    setEditMessage(`Error al borrar: ${safeErr(e)}`);
  }
}

export async function onQuickRemoveInvalidCapRef({ state, docenteId, badCapId }){
  if (!docenteId || !badCapId) return;
  try{
    await quickRemoveInvalidCapFromDocente({ state, docenteId: str(docenteId), badCapId: str(badCapId) });
    toast("Referencia eliminada.");
  }catch(e){
    toast(`Error: ${safeErr(e)}`);
  }
}
