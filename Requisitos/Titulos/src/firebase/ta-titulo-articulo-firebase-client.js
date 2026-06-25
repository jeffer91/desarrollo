/*
  Nombre completo: ta-titulo-articulo-firebase-client.js
  Ruta o ubicación: /Requisitos/Titulos/src/firebase/ta-titulo-articulo-firebase-client.js
  Función o funciones:
  - Inicializar Firebase en el frontend únicamente cuando existan variables públicas VITE_FIREBASE_*.
  - Exponer una instancia segura y única de Firebase App y Firestore para usos futuros del cliente.
  - Evitar que la app falle si Netlify todavía no tiene configuradas las variables de entorno.
  Se conecta con:
  - Requisitos/Titulos/src/firebase/ta-titulo-articulo-collections.js
  - Requisitos/Titulos/src/services/ta-titulo-articulo-api-client.service.js
  - Requisitos/Titulos/public/ta-titulo-articulo-estudiante.html
  - Requisitos/Titulos/public/ta-titulo-articulo-coordinador.html
*/

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
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
