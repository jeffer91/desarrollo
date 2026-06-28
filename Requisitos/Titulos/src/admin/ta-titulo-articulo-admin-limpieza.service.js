/*
  Nombre completo: ta-titulo-articulo-admin-limpieza.service.js
  Ruta o ubicación: /Requisitos/Titulos/src/admin/ta-titulo-articulo-admin-limpieza.service.js
  Función o funciones:
  - Limpiar documentos de prueba del módulo Títulos desde administración.
  - Borrar únicamente las colecciones titulos y titulos_logs.
  - Proteger Estudiantes, periodos y titulos_coordinadores.
  Se conecta con:
  - Requisitos/Titulos/src/admin/ta-titulo-articulo-admin.app.js
  - Requisitos/Titulos/src/firebase/ta-titulo-articulo-firebase-client.js
  - Requisitos/Titulos/src/firebase/ta-titulo-articulo-collections.js
*/

import { collection, deleteDoc, getDocs } from "firebase/firestore";
import { obtenerFirestore, firebaseDisponible } from "../firebase/ta-titulo-articulo-firebase-client.js";
import { TA_TITULO_ARTICULO_COLLECTIONS as COLLECTIONS } from "../firebase/ta-titulo-articulo-collections.js";

function db() {
  const firestore = obtenerFirestore();
  if (!firebaseDisponible() || !firestore) {
    throw new Error("Firebase no está configurado para limpiar pruebas de Títulos.");
  }
  return firestore;
}

async function borrarColeccion(firestore, nombreColeccion) {
  const snap = await getDocs(collection(firestore, nombreColeccion));
  let total = 0;

  for (const documento of snap.docs) {
    await deleteDoc(documento.ref);
    total += 1;
  }

  return total;
}

async function limpiarPruebasTitulos(confirmacion) {
  if (String(confirmacion || "").trim() !== "BORRAR TITULOS") {
    throw new Error("Confirmación incorrecta. Debe escribir BORRAR TITULOS.");
  }

  const firestore = db();
  const titulosBorrados = await borrarColeccion(firestore, COLLECTIONS.envios);
  const logsBorrados = await borrarColeccion(firestore, COLLECTIONS.historial);

  return {
    ok: true,
    titulosBorrados,
    logsBorrados,
    mensaje: `Limpieza completada. Títulos borrados: ${titulosBorrados}. Logs borrados: ${logsBorrados}.`
  };
}

export const TaTituloArticuloAdminLimpieza = Object.freeze({
  limpiarPruebasTitulos
});
