/* =========================================================
Nombre del archivo: regman.save.one.js
Ruta - Ubicación: /registro.manage/regman.save.one.js
Función o funciones:
- saveOne({ state, ui, careersIndex }): guarda form actual en Firestore
========================================================= */

import { readForm } from "./regman.form.read.js";
import { validateDocente } from "./regman.validate.js";
import { upsertDocente } from "./regman.repo.docentes.js";

export async function saveOne({ state, ui, careersIndex }){
  const d = readForm({ careersIndex });
  const v = validateDocente(d);
  if (!v.ok){
    ui.msg(v.msg, "warn");
    return { ok:false };
  }

  ui.msg("Guardando…", "info");
  const saved = await upsertDocente(d);

  // actualizar state local sin recargar todo
  const idx = state.S.docentes.findIndex(x => x.cedula === saved.cedula);
  if (idx >= 0) state.S.docentes[idx] = { ...state.S.docentes[idx], ...saved };
  else state.S.docentes.unshift(saved);

  state.setSelectedCedula(saved.cedula);
  ui.msg("Guardado.", "ok");
  return { ok:true, saved };
}
