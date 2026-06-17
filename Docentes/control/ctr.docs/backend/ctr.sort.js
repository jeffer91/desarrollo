/* =========================================================
Nombre del archivo: ctr.sort.js
Ruta - Ubicación: /control/ctr.docs/backend/ctr.sort.js
Función o funciones:
- applySort(list, mode): ordena docentes por campo (apellidos/nombres/cedula)
========================================================= */

function asText(v){
  return String(v == null ? "" : v).trim().toLowerCase();
}

export function applySort(list, mode){
  const arr = Array.isArray(list) ? list.slice() : [];
  const m = String(mode || "apellidos");

  // Comentario técnico: orden estable usando índice original.
  const withIdx = arr.map((x, i) => ({ x, i }));

  function keyOf(d){
    if (!d) return "";
    if (m === "nombres") return asText(d.nombres);
    if (m === "cedula") return asText(d.cedula || d.id);
    // default: apellidos
    return asText(d.apellidos);
  }

  withIdx.sort((A, B) => {
    const ka = keyOf(A.x);
    const kb = keyOf(B.x);
    if (ka < kb) return -1;
    if (ka > kb) return 1;
    return A.i - B.i; // estable
  });

  return withIdx.map(o => o.x);
}