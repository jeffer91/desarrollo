/* =========================================================
Nombre del archivo: regman.repo.docentes.js
Ruta - Ubicación: /registro.manage/regman.repo.docentes.js
Función o funciones:
- listarDocentes()
- upsertDocente(docente)  // crea/actualiza, id = cedula
- borrarDocente(cedula)
========================================================= */

import { getDb, getFs } from "./regman.firebase.js";

const CFG = { docentes: "docentes" };
function nowIso(){ return new Date().toISOString(); }

// FIX: normalizar carreraId para evitar inconsistencias (tildes/espacios/mayúsculas)
// y asegurar que el id guardado coincida con el catálogo (ej: "Gestión del Talento Humano" -> "gestion_del_talento_humano").
function normCareerId(x){
  const v = (x ?? "").toString().trim();
  if (!v) return "";
  const base = v.normalize ? v.normalize("NFD") : v; // compatibilidad básica
  return base
    .replace(/[\u0300-\u036f]/g, "")   // quita diacríticos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")       // separadores a "_"
    .replace(/^_+|_+$/g, "");          // trim "_"
}

export async function listarDocentes(){
  const db = await getDb();
  const F = await getFs();

  const snap = await F.getDocs(F.collection(db, CFG.docentes));
  const out = [];

  snap.forEach(d => {
    const data = d.data() || {};
    out.push({
      cedula: d.id,
      nombres: (data.nombres || "").toString(),
      apellidos: (data.apellidos || "").toString(),
      carreraId: (data.carreraId || "").toString(),
      carreraNombre: (data.carreraNombre || "").toString(),
      celular: (data.celular || "").toString(),
      titulo: (data.titulo || "").toString(),
      sexo: (data.sexo || "").toString(),
      createdAt: data.createdAt || null,
      updatedAt: data.updatedAt || null
    });
  });

  return out;
}

export async function upsertDocente(docente){
  const db = await getDb();
  const F = await getFs();

  const cedula = (docente.cedula || "").toString().trim();
  if (!cedula) throw new Error("Cédula requerida.");

  const ref = F.doc(db, CFG.docentes, cedula);

  // Mantener createdAt si ya existe
  const prev = await F.getDoc(ref);
  const prevData = prev.exists() ? (prev.data() || {}) : {};

  const prevCarreraId = (prevData.carreraId || "").toString();
  const prevCarreraNombre = (prevData.carreraNombre || "").toString();

  // FIX: si upsertDocente recibe un objeto parcial, NO borrar carreraId/carreraNombre por accidente.
  // - Solo recalcular/guardar carreraId si el campo viene en el objeto.
  const hasCareerId = Object.prototype.hasOwnProperty.call(docente, "carreraId");
  const hasCareerName = Object.prototype.hasOwnProperty.call(docente, "carreraNombre");

  const carreraIdNorm = hasCareerId ? normCareerId(docente.carreraId) : prevCarreraId;
  const carreraNombreIn = hasCareerName ? (docente.carreraNombre || "").toString().trim() : "";

  // FIX: evitar que carreraNombre se pise con "" cuando no se está editando carrera.
  let carreraNombreFinal = carreraNombreIn;
  if (!carreraNombreFinal){
    carreraNombreFinal = (carreraIdNorm === prevCarreraId) ? prevCarreraNombre : "";
  }

  const payload = {
    nombres: (docente.nombres || "").toString(),
    apellidos: (docente.apellidos || "").toString(),
    carreraId: carreraIdNorm,                 // FIX: siempre guardar id normalizado
    carreraNombre: carreraNombreFinal,        // FIX: no perder nombre por merges
    celular: (docente.celular || "").toString(),
    titulo: (docente.titulo || "").toString(),
    sexo: (docente.sexo || "").toString().trim(),
    createdAt: prevData.createdAt || nowIso(),
    updatedAt: nowIso()
  };

  try{
    await F.setDoc(ref, payload, { merge: true });
  }catch(err){
    // FIX: propagar el error real (ayuda a encontrar el 400)
    const msg = err && err.message ? err.message : String(err);
    throw new Error(`Firestore setDoc falló (cedula=${cedula}): ${msg}`);
  }

  return { cedula, ...payload };
}

export async function borrarDocente(cedula){
  const db = await getDb();
  const F = await getFs();

  const id = (cedula || "").toString().trim();
  if (!id) throw new Error("Cédula requerida para borrar.");

  await F.deleteDoc(F.doc(db, CFG.docentes, id));
  return true;
}