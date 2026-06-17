/* =========================================================
Nombre del archivo: regman.utils.js
Ruta - Ubicación: /registro.manage/regman.utils.js
Función o funciones:
- s(x): string seguro
- cleanSpaces(str): normaliza espacios
- escHtml(str): seguridad para HTML (si se requiere)
- Re-export del "cerebro" (normKey, parsePegadoDocentes)
========================================================= */

export function s(x){
  return (x === null || x === undefined) ? "" : String(x);
}

export function cleanSpaces(str){
  return s(str).replace(/\s+/g, " ").trim();
}

export function escHtml(str){
  return s(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

/* =========================================================
FIX: "CEREBRO" separado
- Separamos la lógica pesada del parser a regman.utils.brain.js
- Mantenemos API pública igual para NO romper imports existentes:
  import { parsePegadoDocentes, normKey } from "./regman.utils.js";
========================================================= */

export { normKey, parsePegadoDocentes } from "./regman.utils.brain.js";
