/* =========================================================
Nombre del archivo: regman.repo.carreras.js
Ruta - Ubicación: /registro.manage/regman.repo.carreras.js
Función o funciones:
- listarCarreras(): lee colección "carreras"
========================================================= */

import { getDb, getFs } from "./regman.firebase.js";

const CFG = { carreras: "carreras" };

export async function listarCarreras(){
  const db = await getDb();
  const F = await getFs();

  const snap = await F.getDocs(F.collection(db, CFG.carreras));
  const out = [];

  snap.forEach(d => {
    const data = d.data() || {};
    out.push({
      id: d.id,
      nombre: (data.nombre || "").toString().trim(),
      estado: (data.estado || "").toString().trim()
    });
  });

  out.sort((a,b) => (a.nombre || "").localeCompare((b.nombre || ""), "es"));
  return out.filter(x => x.nombre);
}
