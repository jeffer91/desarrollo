/* =========================================================
Nombre del archivo: cap.manage.firebase.js
Ruta - Ubicación: /cap.manage/cap.manage.firebase.js
Función o funciones:
- Firebase bootstrap (CDN v9 modular) usando window.firebaseConfig
- getDb(): retorna instancia Firestore reutilizable en esta pantalla
========================================================= */
export async function getDb(){
  if (window.__CAP_MANAGE_DB__) return window.__CAP_MANAGE_DB__;

  const firebaseConfig = window.firebaseConfig;
  if (!firebaseConfig){
    throw new Error("Falta window.firebaseConfig en cap.manage.index.html.");
  }

  const { initializeApp, getApps } = await import(
    "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js"
  );

  // ✅ FIX CRÍTICO:
  // Antes había un carácter invisible en la URL (firebase￾firestore.js) y rompía el import dinámico.
  // Se deja la URL exacta oficial.
  const { getFirestore } = await import(
    "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"
  );

  // Evita doble init
  const app = (getApps && getApps().length) ? getApps()[0] : initializeApp(firebaseConfig);
  const db = getFirestore(app);

  window.__CAP_MANAGE_DB__ = db;
  return db;
}