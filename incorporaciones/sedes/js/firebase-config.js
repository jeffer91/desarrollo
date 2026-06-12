/*
Nombre completo: firebase-config.js
Ruta o ubicación: /incorporaciones-app/js/firebase-config.js

Función o funciones:
1. Inicializar Firebase usando la configuración real del proyecto UTET.
2. Inicializar Cloud Firestore.
3. Dejar disponible la constante global db para todos los archivos de la app.
4. Centralizar los nombres reales de las colecciones usadas:
   - Estudiantes
   - periodos
   - incorporaciones
   - incorporaciones_historial
5. Centralizar la clave de administrador.
6. Centralizar los campos que deben estar en CUMPLE para habilitar al estudiante.
7. Centralizar las sedes permitidas para incorporación.
8. Centralizar nombres de campos usados en la app.
*/

/*
IMPORTANTE:
Esta app usa Firebase Compat mediante CDN.

Por eso NO debes pegar esto:
import { initializeApp } from "firebase/app";

Ese código es para proyectos con npm, Vite, Webpack o React.
Como esta app será HTML + CSS + JS simple para Netlify o Live Server,
usamos firebase.initializeApp(firebaseConfig).
*/

const firebaseConfig = {
  apiKey: "AIzaSyCaHf1C0BB0X_H3BDZ1o-UDAsPmLTjsZLA",
  authDomain: "utet-4387a.firebaseapp.com",
  projectId: "utet-4387a",
  storageBucket: "utet-4387a.firebasestorage.app",
  messagingSenderId: "902848131454",
  appId: "1:902848131454:web:47f515eb6480834724c32f"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

const APP_COLLECTIONS = {
  estudiantes: "Estudiantes",
  periodos: "periodos",
  incorporaciones: "incorporaciones",
  incorporacionesHistorial: "incorporaciones_historial"
};

const APP_CONFIG = {
  appName: "Incorporaciones ITSQMET",
  appVersion: "2026.05.23.02",

  adminPassword: "Titulación2026",

  sedesPermitidas: ["QUITO", "MANTA"],

  campoCedula: "cedula",
  campoIncorporacion: "incorporacion",
  campoPeriodo: "periodoId",

  /*
  Estos son los campos que deben constar como CUMPLE para que el estudiante pueda elegir sede.
  Se usan los nombres que aparecen en Firebase / Excel.
  */
  camposCumplimiento: [
    "Academico",
    "Documentacion",
    "Financiero",
    "Ingles",
    "ActualizaciónDatos",
    "PrácticasVinculacion",
    "AprobacionTitulacion",
    "AprobacionComplexivoProyecto"
  ],

  nombresRequisitos: {
    Academico: "Académico",
    Documentacion: "Documentación",
    Financiero: "Financiero",
    Ingles: "Inglés",
    "ActualizaciónDatos": "Actualización de datos",
    "PrácticasVinculacion": "Prácticas / Vinculación",
    AprobacionTitulacion: "Aprobación de titulación",
    AprobacionComplexivoProyecto: "Aprobación complexivo / proyecto"
  },

  jsonBackupKey: "incorporaciones_app_backup_json",
  jsonBackupLastDateKey: "incorporaciones_app_backup_json_fecha",

  /*
  Permite que la app trabaje con períodos activos para la consulta estudiantil.
  Un período puede tener activoConsulta: true.
  */
  campoPeriodoActivoConsulta: "activoConsulta",

  /*
  Campo sugerido para ordenar períodos.
  Si no existe, la app intentará ordenar por creadoEn o por el texto del período.
  */
  campoOrdenPeriodo: "ordenPeriodo"
};