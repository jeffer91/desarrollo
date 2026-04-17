/* =========================================================
Nombre del archivo: cap.assign.app.js
Ruta - Ubicación: /cap.assign/cap.assign.app.js
Función o funciones:
- Boot/orquestación de pantalla Asignación
- Inicializa estado
- Wiring de eventos (bindings)
- Carga inicial (usecases)
========================================================= */

import { createCapAssignState } from "./cap.assign.state.js";
import { msg } from "./cap.assign.utils.js";
import { bindAssignUI } from "./cap.assign.bindings.js";      // (se crea después)
import { loadInitialData } from "./cap.assign.usecases.js";   // (se crea después)

export async function bootCapAssign(){
  const state = createCapAssignState();

  try{
    bindAssignUI({ state });
    await loadInitialData({ state });
    msg("Listo. Selecciona una capacitación para ver EN/FUERA.", "ok");
  } catch(err){
    msg(`Error: ${err && err.message ? err.message : String(err)}`, "err");
  }
}
