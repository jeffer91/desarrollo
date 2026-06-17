/* =========================================================
Nombre del archivo: cap.manage.data.cap.js
Ruta - Ubicación: /cap.manage/cap.manage.data.cap.js
Función o funciones:
- CRUD capacitaciones (colección: "capacitaciones")
- listarCapacitaciones()
- crearCapacitacion(payload)
- actualizarCapacitacion(id, payload)
- borrarCapacitacion(id)

CORRECCIÓN (ID Firestore):
- ID ahora = nombre reducido (slug) SIN sufijo random.
- Si ya existe ese ID, se intenta con "-2", "-3", ... (evita colisiones).
========================================================= */
import { getDb } from "./cap.manage.firebase.js";

const COL = "capacitaciones";

export async function listarCapacitaciones(){
  const db = await getDb();
  const { collection, getDocs, query, orderBy } = await import(
    "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"
  );

  const q = query(collection(db, COL), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  const rows = [];
  snap.forEach((docSnap) => {
    rows.push({ id: docSnap.id, ...docSnap.data() });
  });

  return rows;
}

export async function crearCapacitacion(payload){
  const db = await getDb();

  // ✅ setDoc para controlar el ID
  const { doc, setDoc, getDoc, serverTimestamp } = await import(
    "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"
  );

  // Comentario: ID legible y corto basado en el nombre.
  // Si se repite el nombre, se agrega "-2", "-3", ...
  const base = slugifyNombre(payload && payload.nombre ? payload.nombre : "capacitacion");
  const id = await buildUniqueId({ db, doc, getDoc, base });

  await setDoc(doc(db, COL, id), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return id;
}

export async function actualizarCapacitacion(id, payload){
  const db = await getDb();
  const { doc, updateDoc, serverTimestamp } = await import(
    "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"
  );

  if (!id) throw new Error("ID de capacitación inválido.");

  await updateDoc(doc(db, COL, id), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

export async function borrarCapacitacion(id){
  const db = await getDb();

  // ✅ FIX CRÍTICO:
  // Antes había un caracter invisible en "firebase￾firestore.js" (rompe el import dinámico).
  const { doc, deleteDoc } = await import(
    "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"
  );

  if (!id) throw new Error("ID de capacitación inválido.");
  await deleteDoc(doc(db, COL, id));
}

/* =========================================================
Helpers (ID basado en nombre)
========================================================= */
function slugifyNombre(nombre){
  // Comentario: reduce el nombre para usarlo como ID:
  // - minúsculas
  // - sin acentos
  // - espacios/símbolos -> "-"
  // - solo [a-z0-9-]
  // - longitud controlada
  const s = String(nombre || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

  const max = 28;
  const out = s.length ? s.slice(0, max) : "capacitacion";
  return out.replace(/-+$/g, "") || "capacitacion";
}

async function buildUniqueId({ db, doc, getDoc, base }){
  // Comentario: 1) intenta "base"
  // 2) si existe, usa "base-2", "base-3", ...
  const tryId = async (id) => {
    const ref = doc(db, COL, id);
    const snap = await getDoc(ref);
    return snap.exists();
  };

  let id = base;

  const existsBase = await tryId(id);
  if (!existsBase) return id;

  // Limite para evitar loops infinitos por algún caso raro
  for (let i = 2; i <= 50; i++){
    id = `${base}-${i}`;
    const exists = await tryId(id);
    if (!exists) return id;
  }

  // Si por alguna razón hay demasiados duplicados, cae en un sufijo de tiempo (no random)
  // Comentario: sigue siendo legible y evita colisiones.
  return `${base}-${Date.now()}`;
}
