/*
  Nombre completo: ta-titulo-articulo-firebase-client.js
  Ruta o ubicación: /Requisitos/Titulos/src/firebase/ta-titulo-articulo-firebase-client.js
  Función o funciones:
  - Inicializar Firebase en el frontend del módulo Títulos.
  - Usar variables VITE_FIREBASE_* cuando existan.
  - Usar la configuración pública institucional por defecto cuando se trabaja localmente.
  - Exponer una instancia única de Firebase App y Firestore.
  Se conecta con:
  - Requisitos/Titulos/src/firebase/ta-titulo-articulo-collections.js
  - Requisitos/Titulos/src/services/ta-titulo-articulo-firebase-direct.service.js
  - Requisitos/Titulos/src/services/ta-titulo-articulo-api-client.service.js
*/

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const DEFAULT_FIREBASE_CONFIG = Object.freeze({
  apiKey: "AIzaSyCaHf1C0BB0X_H3BDZ1o-UDAsPmLTjsZLA",
  authDomain: "utet-4387a.firebaseapp.com",
  projectId: "utet-4387a",
  storageBucket: "utet-4387a.firebasestorage.app",
  messagingSenderId: "902848131454",
  appId: "1:902848131454:web:47f515eb6480834724c32f"
});

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || DEFAULT_FIREBASE_CONFIG.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId
};

function tieneConfigFirebase(config) {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

let app = null;
let db = null;

if (tieneConfigFirebase(firebaseConfig)) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  db = getFirestore(app);
}

export function obtenerFirebaseApp() {
  return app;
}

export function obtenerFirestore() {
  return db;
}

export function firebaseDisponible() {
  return Boolean(app && db);
}

export function obtenerFirebaseConfigPublica() {
  return {
    configurado: firebaseDisponible(),
    projectId: firebaseConfig.projectId || ""
  };
}
