/* =========================================================
Nombre del archivo: ctr.firebase.config.js
Ruta - Ubicación: /control/ctr.docs/basedatos/ctr.firebase.config.js
Función:
- Define window.firebaseConfig para este módulo (pantalla independiente)
- IMPORTANTE: pega aquí el MISMO objeto de configuración que ya usas en otras pantallas
  (cap.assign / cap.manage / stats).
========================================================= */
(function attachCtrFirebaseConfig(window){
  "use strict";

  // Comentario técnico:
  // - Este módulo NO comparte variables con otras pantallas (iframe).
  // - Debes pegar la configuración real de Firebase para inicializar Firestore.
window.firebaseConfig = window.firebaseConfig || {
  // Corrección: se cargan los valores reales de Firebase para evitar inicialización incompleta.
  apiKey: "AIzaSyCaHf1C0BB0X_H3BDZ1o-UDAsPmLTjsZLA",
  authDomain: "utet-4387a.firebaseapp.com",
  projectId: "utet-4387a",
  storageBucket: "utet-4387a.firebasestorage.app",
  messagingSenderId: "902848131454",
  appId: "1:902848131454:web:47f515eb6480834724c32f"
  // Evita el error: "La configuración de Firebase está incompleta".
};
})(window);