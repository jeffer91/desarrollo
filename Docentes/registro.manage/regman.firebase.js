/* =========================================================
Nombre del archivo: regman.firebase.js
Ruta - Ubicación: /registro.manage/regman.firebase.js
Función o funciones:
- Inicializar Firebase usando window.firebaseConfig
- Exponer getDb() y getFs()
========================================================= */

const CDN = {
  app: "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js",
  fs: "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js"
};

export async function getDb(){
  if (window.__REGMAN_DB__) return window.__REGMAN_DB__;
  if (window.firebaseDb){
    window.__REGMAN_DB__ = window.firebaseDb;
    return window.__REGMAN_DB__;
  }

  const cfg = window.firebaseConfig;
  if (!cfg) throw new Error("Falta window.firebaseConfig.");

  let appMod;
  let fsMod;

  try{
    appMod = await import(CDN.app);
    fsMod = await import(CDN.fs);
  }catch(err){
    const msg = err && err.message ? err.message : String(err);
    throw new Error(`No se pudo cargar Firebase SDK (CDN): ${msg}`);
  }

  // FIX: evitar re-inicialización si ya existe un app
  const app = (window.__REGMAN_APP__)
    ? window.__REGMAN_APP__
    : appMod.initializeApp(cfg);

  const db = fsMod.getFirestore(app);

  window.__REGMAN_APP__ = app;
  window.__REGMAN_FS__ = fsMod;
  window.__REGMAN_DB__ = db;
  return db;
}

export async function getFs(){
  if (window.__REGMAN_FS__) return window.__REGMAN_FS__;

  try{
    const fsMod = await import(CDN.fs);
    window.__REGMAN_FS__ = fsMod;
    return fsMod;
  }catch(err){
    const msg = err && err.message ? err.message : String(err);
    throw new Error(`No se pudo cargar Firestore SDK (CDN): ${msg}`);
  }
}
