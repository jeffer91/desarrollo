/* =========================================================
Nombre del archivo: cap.manage.app.js
Ruta - Ubicación: /cap.manage/cap.manage.app.js
Función o funciones:
- Boot/orquestación de Gestión Capacitaciones
- Inicializa estado
- Set defaults (mes/año actual)
- Wiring de eventos (bindings)
- Carga inicial (usecases)
========================================================= */

import { MONTHS } from "./cap.manage.utils.js";
import { createCapManageState } from "./cap.manage.state.js";
import { $ } from "./cap.manage.dom.js";
import { fillMonthsSelect, msg, setFormModeTitle } from "./cap.manage.utils.js";
import { bindManageUI } from "./cap.manage.bindings.js";      // (se crea después)
import { refreshCapsInitial } from "./cap.manage.usecases.js"; // (se crea después)

export async function bootCapManage(){
  const state = createCapManageState();

  try{
    // Defaults: mes/año actual
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const y = now.getFullYear();

    fillMonthsSelect("capMesIni", MONTHS, m);
    fillMonthsSelect("capMesFin", MONTHS, m);

    $("capYearIni").value = String(y);
    $("capYearFin").value = String(y);

    setFormModeTitle(false); // modo crear

    // Wiring UI
    bindManageUI({ state });

    // Carga inicial
    await refreshCapsInitial({ state });

    msg("Listo. Crea, edita o elimina capacitaciones.", "ok");
  } catch(err){
    msg(`Error: ${err && err.message ? err.message : String(err)}`, "err");
  }
}
