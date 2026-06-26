/*
  Nombre completo: ta-titulo-articulo-firebase-sdk.service.js
  Ruta o ubicación: /Requisitos/Titulos/src/firebase/ta-titulo-articulo-firebase-sdk.service.js
  Función o funciones:
  - Centralizar datos públicos del SDK de Firebase para uso local.
  - Documentar las rutas CDN necesarias para Live Server, doble click y Electron.
  - Exponer un import map reutilizable para HTML sin Vite.
  - Mantener la versión del SDK alineada con package.json.
  Se conecta con:
  - public/ta-titulo-articulo-estudiante.html
  - public/ta-titulo-articulo-coordinador.html
  - electron/admin/ta-titulo-articulo-administrador.html
  - ta-titulo-articulo-firebase-client.js
*/

export const TA_TITULO_ARTICULO_FIREBASE_SDK_VERSION = "10.14.1";

export const TA_TITULO_ARTICULO_FIREBASE_IMPORTS = Object.freeze({
  "firebase/app": `https://www.gstatic.com/firebasejs/${TA_TITULO_ARTICULO_FIREBASE_SDK_VERSION}/firebase-app.js`,
  "firebase/firestore": `https://www.gstatic.com/firebasejs/${TA_TITULO_ARTICULO_FIREBASE_SDK_VERSION}/firebase-firestore.js`
});

export function obtenerImportMapFirebase() {
  return {
    imports: {
      ...TA_TITULO_ARTICULO_FIREBASE_IMPORTS
    }
  };
}

export function firebaseImportMapComoTexto() {
  return JSON.stringify(obtenerImportMapFirebase(), null, 2);
}
