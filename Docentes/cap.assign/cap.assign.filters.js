/* =========================================================
Nombre del archivo: cap.assign.filters.js
Ruta - Ubicación: /cap.assign/cap.assign.filters.js
Función o funciones:
- filterDocentes(state)
========================================================= */

import { cleanSpaces } from "./cap.assign.utils.js";

export function filterDocentes(state){
  const S = state.S;
  const q = cleanSpaces(S.search).toLowerCase();

  return S.docentes.filter(d => {

    if (S.carreraId && d.carreraId !== S.carreraId) return false;

    if (q){
      const nom = cleanSpaces(d.nombre).toLowerCase();
      const ced = cleanSpaces(d.cedula).toLowerCase();
      if (!nom.includes(q) && !ced.includes(q)) return false;
    }

    if (!S.capSelectedId) return true;

    const caps = d.capacitaciones || [];
    const isIn = caps.includes(S.capSelectedId);

    if (S.inout === "in" && !isIn) return false;
    if (S.inout === "out" && isIn) return false;

    return true;
  });
}
