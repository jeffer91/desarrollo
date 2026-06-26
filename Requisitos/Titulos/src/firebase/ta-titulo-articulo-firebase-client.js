/*
  Nombre completo: ta-titulo-articulo-firebase-client.js
  Ruta o ubicación: /Requisitos/Titulos/src/firebase/ta-titulo-articulo-firebase-client.js
  Función o funciones:
  - Inicializar Firebase en el frontend del módulo Títulos.
  - Usar variables VITE_FIREBASE_* cuando existan.
  - Usar la configuración pública institucional por defecto cuando se trabaja localmente.
  - Evitar errores en navegadores sin Vite cuando import.meta.env no existe.
  - Exponer una instancia única de Firebase App y Firestore.
  Se conecta con:
  - Requisitos/Titulos/src/firebase/ta-titulo-articulo-collections.js
  - Requisitos/Titulos/src/firebase/ta-titulo-articulo-firebase-sdk.service.js
  - Requisitos/Titulos/src/services/ta-titulo-articulo-firebase-direct.service.js
  - Requisitos/Titulos/src/services/ta-titulo-articulo-api-client.service.js
*/

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { TA_TITULO_ARTICULO_FIREBASE_SDK_VERSION } from "./ta-titulo-articulo-firebase-sdk.service.js";

const DEFAULT_FIREBASE_CONFIG = Object.freeze({
  apiKey: "AIzaSyCaHf1C0BB0X_H3BDZ1o-UDAsPmLTjsZLA",
  authDomain: "utet-4387a.firebaseapp.com",
  projectId: "utet-4387a",
  storageBucket: "utet-4387a.firebasestorage.app",
  messagingSenderId: "902848131454",
  appId: "1:902848131454:web:47f515eb6480834724c32f"
});

const viteEnv = import.meta.env || {};
const runtimeConfig = globalThis?.TA_TITULO_ARTICULO_FIREBASE_CONFIG || {};

const firebaseConfig = {
  apiKey: viteEnv.VITE_FIREBASE_API_KEY || runtimeConfig.apiKey || DEFAULT_FIREBASE_CONFIG.apiKey,
  authDomain: viteEnv.VITE_FIREBASE_AUTH_DOMAIN || runtimeConfig.authDomain || DEFAULT_FIREBASE_CONFIG.authDomain,
  projectId: viteEnv.VITE_FIREBASE_PROJECT_ID || runtimeConfig.projectId || DEFAULT_FIREBASE_CONFIG.projectId,
  storageBucket: viteEnv.VITE_FIREBASE_STORAGE_BUCKET || runtimeConfig.storageBucket || DEFAULT_FIREBASE_CONFIG.storageBucket,
  messagingSenderId: viteEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || runtimeConfig.messagingSenderId || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  appId: viteEnv.VITE_FIREBASE_APP_ID || runtimeConfig.appId || DEFAULT_FIREBASE_CONFIG.appId
};

function tieneConfigFirebase(config) {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

let app = null;
let db = null;
let initError = null;

try {
  if (tieneConfigFirebase(firebaseConfig)) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    db = getFirestore(app);
  }
} catch (error) {
  initError = error;
  console.error("[Títulos Firebase] No se pudo inicializar Firebase:", error);
}

export function obtenerFirebaseApp() {
  return app;
}

export function obtenerFirestore() {
  return db;
}

export function firebaseDisponible() {
  return Boolean(app && db && !initError);
}

export function obtenerFirebaseConfigPublica() {
  return {
    configurado: firebaseDisponible(),
    projectId: firebaseConfig.projectId || "",
    sdkVersion: TA_TITULO_ARTICULO_FIREBASE_SDK_VERSION,
    error: initError?.message || ""
  };
}
