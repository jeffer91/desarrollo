/*
=========================================================
Nombre completo: mesa-firebase-config.js
Ruta o ubicación: /js/mesa-firebase-config.js
Función o funciones:
- Centralizar la configuración Firebase del proyecto.
- Definir nombres de colecciones usadas por la app.
=========================================================
*/
"use strict";

(function attachMesaFirebaseConfig(global) {
  const MesaFirebaseConfig = Object.freeze({
    apiKey: "AIzaSyCaHf1C0BB0X_H3BDZ1o-UDAsPmLTjsZLA",
    authDomain: "utet-4387a.firebaseapp.com",
    projectId: "utet-4387a",
    storageBucket: "utet-4387a.firebasestorage.app",
    messagingSenderId: "902848131454",
    appId: "1:902848131454:web:47f515eb6480834724c32f",

    collections: Object.freeze({
      estudiantes: "Estudiantes",

      // Corrección: se agrega la colección de profesores para poblar el selector del formulario.
      // Si en Firebase usas otro nombre exacto, solo cambia este valor sin tocar la lógica.
      profesores: "Profesores",

      invitaciones: "historial_invitaciones"
    })
  });

  global.MesaFirebaseConfig = MesaFirebaseConfig;
})(window);