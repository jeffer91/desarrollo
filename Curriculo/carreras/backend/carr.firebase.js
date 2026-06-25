/*
Nombre del archivo: carr.firebase.js
Ubicación: /Curriculo/carreras/backend/carr.firebase.js
Función:
- Inicializar Firebase de forma segura sin duplicar la app
- Inicializar Firestore
- Exponer helpers para usar la base local central de Currículo cuando exista
- Centralizar nombre de colección y configuración Firebase del módulo Carreras
*/

import {
  getApp,
  getApps,
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const CARR_COLLECTION = "carreras";

const carrFirebaseConfig = {
  apiKey: "AIzaSyCaHf1C0BB0X_H3BDZ1o-UDAsPmLTjsZLA",
  authDomain: "utet-4387a.firebaseapp.com",
  projectId: "utet-4387a",
  storageBucket: "utet-4387a.firebasestorage.app",
  messagingSenderId: "902848131454",
  appId: "1:902848131454:web:47f515eb6480834724c32f"
};

function carrSafeText(value) {
  return String(value ?? "").trim();
}

function carrGetFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(carrFirebaseConfig);
}

function carrGetLocalDb() {
  if (typeof window === "undefined") {
    return null;
  }

  if (window.CurriculoLocal) {
    return window.CurriculoLocal;
  }

  try {
    if (
      window.parent &&
      window.parent !== window &&
      window.parent.CurriculoLocal
    ) {
      return window.parent.CurriculoLocal;
    }
  } catch (error) {
    return null;
  }

  return null;
}

function carrLocalDisponible() {
  const local = carrGetLocalDb();
  return Boolean(
    local &&
    typeof local.get === "function" &&
    typeof local.put === "function" &&
    typeof local.all === "function"
  );
}

async function carrGuardarLocal(id, data, options = {}) {
  const local = carrGetLocalDb();
  const safeId = carrSafeText(id);

  if (!local || !safeId) {
    return false;
  }

  await local.put(CARR_COLLECTION, safeId, data, {
    remoteCollection: CARR_COLLECTION,
    ...options
  });

  return true;
}

async function carrEliminarLocal(id, options = {}) {
  const local = carrGetLocalDb();
  const safeId = carrSafeText(id);

  if (!local || !safeId || typeof local.remove !== "function") {
    return false;
  }

  await local.remove(CARR_COLLECTION, safeId, {
    remoteCollection: CARR_COLLECTION,
    ...options
  });

  return true;
}

async function carrLeerLocal(id) {
  const local = carrGetLocalDb();
  const safeId = carrSafeText(id);

  if (!local || !safeId || typeof local.get !== "function") {
    return null;
  }

  return await local.get(CARR_COLLECTION, safeId);
}

async function carrLeerLocales() {
  const local = carrGetLocalDb();

  if (!local || typeof local.all !== "function") {
    return [];
  }

  return await local.all(CARR_COLLECTION);
}

const carrApp = carrGetFirebaseApp();
const carrDb = getFirestore(carrApp);

export {
  CARR_COLLECTION,
  carrApp,
  carrDb,
  carrFirebaseConfig,
  carrGetLocalDb,
  carrLocalDisponible,
  carrGuardarLocal,
  carrEliminarLocal,
  carrLeerLocal,
  carrLeerLocales
};
