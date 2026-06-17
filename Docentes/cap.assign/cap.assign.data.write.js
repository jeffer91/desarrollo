/* =========================================================
Nombre del archivo: cap.assign.data.write.js
Ruta - Ubicación: /cap.assign/cap.assign.data.write.js
Función o funciones:
- asignarCapacitacionADocentes(capId, docIds)
- quitarCapacitacionADocentes(capId, docIds)
========================================================= */

import { getDb } from "./cap.assign.firebase.js";

/**
 * ✅ Optimización de guardado:
 * - Firestore permite hasta 500 operaciones por writeBatch.
 * - writeBatch reduce viajes de red vs updateDoc por cada docente.
 * - Se divide en lotes (chunks) para no exceder el límite.
 */
function chunkArray(arr, size){
  const a = Array.isArray(arr) ? arr : [];
  const out = [];
  for (let i = 0; i < a.length; i += size) out.push(a.slice(i, i + size));
  return out;
}

export async function asignarCapacitacionADocentes(capId, docIds){
  const db = await getDb();
  const { doc, writeBatch, arrayUnion } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");

  const ids = (docIds || []).filter(Boolean);
  if (!ids.length) return;

  // ✅ Guardado más rápido: batches (máx 500 updates por commit)
  const batches = chunkArray(ids, 500).map((group) => {
    const batch = writeBatch(db);
    group.forEach((id) => {
      // NOTE: batch.update admite FieldValue (arrayUnion) igual que updateDoc
      batch.update(doc(db, "docentes", id), { capacitaciones: arrayUnion(capId) });
    });
    return batch.commit();
  });

  // ✅ Ejecuta commits en paralelo (menos tiempo total, mantiene chunking por límite)
  await Promise.all(batches);
}

export async function quitarCapacitacionADocentes(capId, docIds){
  const db = await getDb();
  const { doc, writeBatch, arrayRemove } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");

  const ids = (docIds || []).filter(Boolean);
  if (!ids.length) return;

  // ✅ Guardado más rápido: batches (máx 500 updates por commit)
  const batches = chunkArray(ids, 500).map((group) => {
    const batch = writeBatch(db);
    group.forEach((id) => {
      // NOTE: batch.update admite FieldValue (arrayRemove) igual que updateDoc
      batch.update(doc(db, "docentes", id), { capacitaciones: arrayRemove(capId) });
    });
    return batch.commit();
  });

  // ✅ Ejecuta commits en paralelo (menos tiempo total, mantiene chunking por límite)
  await Promise.all(batches);
}
