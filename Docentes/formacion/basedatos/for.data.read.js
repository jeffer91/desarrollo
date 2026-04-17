/*
Nombre completo: for.data.read.js
Ruta o ubicación: formacion/basedatos/for.data.read.js
Función o funciones: Leer los registros y catálogos del módulo Formación desde Firebase o
respaldo local, separando correctamente formación docente y capacitaciones y resolviendo
correctamente cédula y carrera aun cuando Firestore tenga campos vacíos
*/

import {
  initializeApp,
  getApp,
  getApps
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { forGetDbKeys, forReadJson } from "./for.db.js";
import { forNormalizeRecord } from "../backend/for.normalize.js";

const FOR_FIREBASE_CONFIG = {
  apiKey: "AIzaSyCaHf1C0BB0X_H3BDZ1o-UDAsPmLTjsZLA",
  authDomain: "utet-4387a.firebaseapp.com",
  projectId: "utet-4387a",
  storageBucket: "utet-4387a.firebasestorage.app",
  messagingSenderId: "902848131454",
  appId: "1:902848131454:web:47f515eb6480834724c32f"
};

function forSortRecords(records) {
  return [...records].sort((a, b) => {
    const aName = String(a?.docente ?? "").toLowerCase();
    const bName = String(b?.docente ?? "").toLowerCase();
    return aName.localeCompare(bName, "es");
  });
}

function forDefaultCatalogs() {
  return {
    modalidades: ["Presencial", "Virtual", "Híbrida"],
    estados: ["En curso", "Finalizado", "Suspendido", "Pendiente"],
    financiamiento: ["Sí", "No", "No aplica"],
    patrocinio: ["Sí", "No"],
    tiposApoyo: ["Económico", "Con tiempo", "Económico y Con tiempo", "No aplica"],
    nivelesFormacion: [
      "Tecnología Superior Universitaria",
      "Licenciatura",
      "Ingeniería",
      "Maestría",
      "Doctorado",
      "Otro"
    ]
  };
}

function forGetFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(FOR_FIREBASE_CONFIG);
}

function forGetFirestoreDb() {
  return getFirestore(forGetFirebaseApp());
}

function forGetFormationSource(data = {}) {
  return data?.formacionDocente && typeof data.formacionDocente === "object"
    ? data.formacionDocente
    : {};
}

function forIsFilled(value) {
  return String(value ?? "").trim() !== "";
}

function forFirstFilled(...values) {
  for (const value of values) {
    if (forIsFilled(value)) {
      return value;
    }
  }
  return "";
}

function forPickValue(data = {}, key, fallback = "") {
  const direct = data?.[key];
  if (direct !== undefined && direct !== null && direct !== "") {
    return direct;
  }

  const formation = forGetFormationSource(data);
  const nested = formation?.[key];
  if (nested !== undefined && nested !== null && nested !== "") {
    return nested;
  }

  return fallback;
}

function forResolveCapacitaciones(data = {}) {
  return Array.isArray(data.capacitaciones) ? data.capacitaciones : [];
}

function forHumanizeCareerId(carreraId = "") {
  const raw = String(carreraId ?? "").trim();
  if (!raw) return "";

  const spaced = raw
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (!spaced) return "";

  return spaced.replace(/\b\w/g, letter => letter.toUpperCase());
}

function forResolveDocente(data = {}) {
  return forFirstFilled(
    data.docente,
    data.nombreCompleto,
    `${String(data.nombres ?? "").trim()} ${String(data.apellidos ?? "").trim()}`.trim()
  );
}

function forResolveCedula(data = {}, docSnapshot) {
  return forFirstFilled(
    data.cedula,
    data.identificacion,
    data.documento,
    data.numeroCedula,
    docSnapshot?.id
  );
}

function forResolveCargo(data = {}) {
  return forFirstFilled(
    data.cargo,
    data.puesto,
    data.rol,
    data.funcion
  );
}

function forResolveCarrera(data = {}) {
  return forFirstFilled(
    data.carrera,
    data.carreraNombre,
    data.area,
    data.unidad,
    forHumanizeCareerId(data.carreraId)
  );
}

function forMapFirestoreDoc(docSnapshot) {
  const data = docSnapshot.data() ?? {};

  return forNormalizeRecord({
    id: docSnapshot.id,
    ...data,

    docente: forResolveDocente(data),
    nombres: data.nombres ?? "",
    apellidos: data.apellidos ?? "",

    cedula: forResolveCedula(data, docSnapshot),
    cargo: forResolveCargo(data),
    carrera: forResolveCarrera(data),

    tituloActual: forFirstFilled(
      data.tituloActual,
      data.titulo_actual,
      data.titulo
    ),

    nivelFormacion: forPickValue(data, "nivelFormacion", ""),
    formacion: forPickValue(data, "formacion", ""),
    carreraCursa: forPickValue(data, "carreraCursa", ""),
    institucion: forPickValue(data, "institucion", ""),
    modalidad: forPickValue(data, "modalidad", ""),
    fechaInicio: forPickValue(data, "fechaInicio", ""),
    fechaFinPrevista: forPickValue(data, "fechaFinPrevista", ""),
    financiamientoItsqmet: forPickValue(data, "financiamientoItsqmet", "No aplica"),
    patrocinio: forPickValue(data, "patrocinio", ""),
    tipoApoyo: forPickValue(data, "tipoApoyo", "No aplica"),
    montoApoyo: forPickValue(data, "montoApoyo", 0),
    horasApoyo: forPickValue(data, "horasApoyo", 0),
    estado: forPickValue(data, "estado", ""),
    avance: forPickValue(data, "avance", 0),
    restante: forPickValue(data, "restante", ""),
    observacionesAvance: forPickValue(data, "observacionesAvance", ""),
    evidencias: forPickValue(data, "evidencias", ""),
    observacionesFinales: forPickValue(data, "observacionesFinales", ""),

    capacitaciones: forResolveCapacitaciones(data),
    anexos: Array.isArray(data.anexos) ? data.anexos : []
  });
}

async function forReadRecordsFromFirebase() {
  const db = forGetFirestoreDb();
  const snapshot = await getDocs(collection(db, "docentes"));
  return snapshot.docs.map(forMapFirestoreDoc);
}

async function forReadRecordByIdFromFirebase(recordId) {
  if (!recordId) return null;

  const db = forGetFirestoreDb();
  const snapshot = await getDoc(doc(db, "docentes", String(recordId)));

  if (!snapshot.exists()) {
    return null;
  }

  return forMapFirestoreDoc(snapshot);
}

function forReadLocalRecordsFallback() {
  const keys = forGetDbKeys();
  const records = forReadJson(keys.records, []);

  if (!Array.isArray(records)) {
    return [];
  }

  return records.map(item => forNormalizeRecord(item));
}

export async function forReadRecords() {
  try {
    const records = await forReadRecordsFromFirebase();

    // Corrige el caso en que Firebase responde vacío:
    // evita dejar la tabla en 0 registros si existe respaldo local utilizable.
    if (Array.isArray(records) && records.length > 0) {
      return forSortRecords(records);
    }

    return forSortRecords(forReadLocalRecordsFallback());
  } catch (error) {
    console.error(
      "forReadRecords: no se pudo leer Firebase, se usa respaldo local.",
      error
    );
    return forSortRecords(forReadLocalRecordsFallback());
  }
}

export async function forReadRecordById(recordId) {
  try {
    const record = await forReadRecordByIdFromFirebase(recordId);
    if (record) {
      return record;
    }
  } catch (error) {
    console.error(
      "forReadRecordById: no se pudo leer Firebase, se usa respaldo local.",
      error
    );
  }

  const records = forReadLocalRecordsFallback();
  return records.find(item => item.id === recordId) ?? null;
}

export async function forReadCatalogs() {
  const keys = forGetDbKeys();
  const storedCatalogs = forReadJson(keys.catalogs, null);

  return storedCatalogs && typeof storedCatalogs === "object"
    ? storedCatalogs
    : forDefaultCatalogs();
}