/* =========================================================
Nombre del archivo: regman.bulk.ui.js
Ruta - Ubicación: /registro.manage/regman.bulk.ui.js
Función:
- Fachada (wrapper) para UI de carga masiva
- Mantiene API estable: createBulkUI(...)
- Lógica separada en: regman.bulk.ui.brain.js
========================================================= */

import { createBulkUIBrain } from "./regman.bulk.ui.brain.js";

export function createBulkUI({ DOM, ui, validateDocente }){
  // FIX: mantener estructura super modular (UI -> cerebro)
  return createBulkUIBrain({ DOM, ui, validateDocente });
}
