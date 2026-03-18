/* =========================================================
Nombre del archivo: prioridad.firebase.js
Ruta: /prioridad/prioridad.firebase.js
Función:
- Inicializa Firebase (compat)
- Expone window.FB y window.db
========================================================= */

(function(){
  const firebaseConfig = {
    apiKey: "AIzaSyB2Bs3YCkDL4CLX_SrEasBfbxw7a0GPOf0",
    authDomain: "ideas-b820b.firebaseapp.com",
    projectId: "ideas-b820b",
    storageBucket: "ideas-b820b.firebasestorage.app",
    messagingSenderId: "259175070156",
    appId: "1:259175070156:web:21caedb8165a74af2e0569"
  };

  if (!window.firebase){
    console.error("Firebase CDN no cargó. Revisa conexión o scripts.");
    return;
  }

  const app = firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  window.FB = { app };
  window.db = db;
})();
