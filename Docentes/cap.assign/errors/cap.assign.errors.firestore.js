/* =========================================================
Nombre del archivo: cap.assign.errors.firestore.js
Ruta - Ubicación: /cap.assign/errors/cap.assign.errors.firestore.js
Función:
- Helpers Firestore v9 modular para editor/acciones rápidas
========================================================= */

import { getDb } from "../cap.assign.firebase.js";
import { str } from "./cap.assign.errors.utils.js";

const TYPE = {
  docente: "docente",
  carrera: "carrera",
  cap: "capacitacion"
};

const DEFAULT_COLLECTIONS = {
  docentes: "docentes",
  carreras: "carreras",
  caps: "capacitaciones"
};

function resolveCollections(state){
  const S = state && state.S ? state.S : null;
  const custom = S && S.collections ? S.collections : null;
  return {
    docentes: (custom && custom.docentes) ? custom.docentes : DEFAULT_COLLECTIONS.docentes,
    carreras: (custom && custom.carreras) ? custom.carreras : DEFAULT_COLLECTIONS.carreras,
    caps:     (custom && custom.caps)     ? custom.caps     : DEFAULT_COLLECTIONS.caps
  };
}

function typeToCollection(type, cols){
  if (type === TYPE.docente) return cols.docentes;
  if (type === TYPE.carrera) return cols.carreras;
  if (type === TYPE.cap)     return cols.caps;
  throw new Error("Tipo no soportado para Firestore.");
}

async function fsApi(){
  return await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js");
}

export async function loadEntityFromStateOrDb({ state, type, id }){
  const S = state && state.S ? state.S : null;

  // 1) desde state
  if (S){
    if (type === TYPE.docente && Array.isArray(S.docentes)){
      const d = S.docentes.find(x => str(x && x.id) === str(id));
      if (d) return d;
    }
    if (type === TYPE.carrera && Array.isArray(S.carreras)){
      const r = S.carreras.find(x => str(x && x.id) === str(id));
      if (r) return r;
    }
    if (type === TYPE.cap && Array.isArray(S.capacitaciones)){
      const c = S.capacitaciones.find(x => str(x && x.id) === str(id));
      if (c) return c;
    }
  }

  // 2) Firestore
  const db = await getDb();
  const cols = resolveCollections(state);
  const col = typeToCollection(type, cols);

  const { doc, getDoc } = await fsApi();
  const snap = await getDoc(doc(db, col, id));
  if (!snap.exists()) return null;

  const data = snap.data() || {};
  if (!data.id) data.id = id;
  return data;
}

export async function upsertEntity({ state, type, id, data }){
  const db = await getDb();
  const cols = resolveCollections(state);
  const col = typeToCollection(type, cols);

  const payload = Object.assign({}, data);
  if (!payload.id) payload.id = id;

  const { doc, setDoc } = await fsApi();
  await setDoc(doc(db, col, id), payload, { merge: true });
}

export async function deleteEntity({ state, type, id }){
  const db = await getDb();
  const cols = resolveCollections(state);
  const col = typeToCollection(type, cols);

  const { doc, deleteDoc } = await fsApi();
  await deleteDoc(doc(db, col, id));
}

export async function quickRemoveInvalidCapFromDocente({ state, docenteId, badCapId }){
  const db = await getDb();
  const cols = resolveCollections(state);
  const col = cols.docentes;

  const { doc, getDoc, setDoc } = await fsApi();
  const ref = doc(db, col, docenteId);

  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Docente no existe en Firestore.");

  const d = snap.data() || {};
  const arr = Array.isArray(d.capacitaciones) ? d.capacitaciones.slice() : [];
  const next = arr.filter(x => str(x) !== str(badCapId));

  await setDoc(ref, { capacitaciones: next }, { merge: true });
}
