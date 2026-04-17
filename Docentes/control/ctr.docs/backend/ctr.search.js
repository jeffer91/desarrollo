/* =========================================================
Nombre del archivo: ctr.search.js
Ruta - Ubicación: /control/ctr.docs/backend/ctr.search.js
Función o funciones:
- applySearch(list, query): filtra docentes por texto (nombres/apellidos/cédula)
========================================================= */

function norm(v){
  return String(v == null ? "" : v).toLowerCase().trim();
}

export function applySearch(list, query){
  const arr = Array.isArray(list) ? list : [];
  const q = norm(query);

  // Comentario técnico: sin query, no filtramos.
  if (!q) return arr;

  // tokens por espacios
  const tokens = q.split(/\s+/).filter(Boolean);
  if (!tokens.length) return arr;

  return arr.filter((d) => {
    const hay = norm(
      (d && d.nombres ? d.nombres : "") + " " +
      (d && d.apellidos ? d.apellidos : "") + " " +
      (d && d.cedula ? d.cedula : "") + " " +
      (d && d.id ? d.id : "")
    );

    // Comentario técnico: todos los tokens deben existir (AND).
    return tokens.every(t => hay.includes(t));
  });
}