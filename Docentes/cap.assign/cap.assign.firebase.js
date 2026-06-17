/* =========================================================
Nombre del archivo: cap.assign.firebase.js
Ruta - Ubicación: /cap.assign/cap.assign.firebase.js
Función o funciones:
- Firebase bootstrap (CDN v9 modular) usando window.firebaseConfig
- getDb(): retorna instancia Firestore reutilizable en esta pantalla
========================================================= */

export async function getDb(){
  if (window.__CAP_ASSIGN_DB__) return window.__CAP_ASSIGN_DB__;

  const firebaseConfig = window.firebaseConfig;
  if (!firebaseConfig){
    throw new Error("Falta window.firebaseConfig en cap.assign.index.html.");
  }

  const { initializeApp, getApps } = await import(
    "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js"
  );

  // ✅ CORRECCIÓN: URL correcta del módulo Firestore
  const { getFirestore } = await import(
    "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"
  );

  const app = (getApps && getApps().length) ? getApps()[0] : initializeApp(firebaseConfig);
  const db = getFirestore(app);

  window.__CAP_ASSIGN_DB__ = db;
  return db;
}
