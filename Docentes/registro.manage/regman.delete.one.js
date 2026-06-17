/* =========================================================
Nombre del archivo: regman.delete.one.js
Ruta - Ubicación: /registro.manage/regman.delete.one.js
Función o funciones:
- deleteSelected({ state, ui }): borra por cédula seleccionada
========================================================= */

import { borrarDocente } from "./regman.repo.docentes.js";

export async function deleteSelected({ state, ui }){
  const cedula = (state.S.selectedCedula || "").trim();
  if (!cedula){
    ui.msg("Selecciona un docente en la tabla para borrar.", "warn");
    return { ok:false };
  }

  ui.msg("Borrando…", "info");
  await borrarDocente(cedula);

  state.setDocentes(state.S.docentes.filter(x => x.cedula !== cedula));
  state.setSelectedCedula("");

  ui.msg("Borrado.", "ok");
  return { ok:true };
}
