/* =========================================================
Nombre del archivo: ctr.firebase.js
Ruta - Ubicación: /control/ctr.docs/backend/ctr.firebase.js
Función o funciones:
- getDb(): inicializa Firebase (v9 modular) usando window.firebaseConfig y retorna Firestore
- Cachea la instancia en window.__CTR_DOCS_DB__ para evitar doble init
========================================================= */
export async function getDb(){
  if (window.__CTR_DOCS_DB__) return window.__CTR_DOCS_DB__;

  const cfg = window.firebaseConfig;
  if (!cfg){
    throw new Error("Falta window.firebaseConfig en ctr.firebase.config.js.");
  }

  // Comentario técnico: validación mínima para evitar errores silenciosos.
  if (!cfg.apiKey || !cfg.authDomain || !cfg.projectId || !cfg.appId){
    throw new Error("La configuración de Firebase está incompleta. Revisa ctr.firebase.config.js.");
  }

  const { initializeApp, getApps } = await import(
    "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js"
  );
  const { getFirestore } = await import(
    "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"
  );

  // Evita doble init (patrón usado en módulos existentes)
  const app = (getApps && getApps().length) ? getApps()[0] : initializeApp(cfg);
  const db = getFirestore(app);

  window.__CTR_DOCS_DB__ = db;
  return db;
}