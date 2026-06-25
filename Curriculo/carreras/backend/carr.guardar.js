/*
Nombre del archivo: carr.guardar.js
Ubicación: /Curriculo/carreras/backend/carr.guardar.js
Función:
- Validar datos antes de guardar
- Crear el id del documento
- Verificar duplicados en local y Firebase
- Guardar primero en la base local central si está disponible
- Usar Firebase como respaldo cuando no existe base local
*/

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  CARR_COLLECTION,
  carrDb,
  carrGuardarLocal,
  carrLeerLocal,
  carrLocalDisponible
} from "./carr.firebase.js";
import {
  carrCrearIdCarrera,
  carrPrepararRegistroCarrera
} from "./carr.normalizar.js";
import { carrValidarCarrera } from "./carr.validar.js";

function carrPayloadFirebase(record) {
  return {
    ...record,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
}

async function carrExisteEnFirebase(carrId) {
  const referencia = doc(carrDb, CARR_COLLECTION, carrId);
  const existente = await getDoc(referencia);
  return existente.exists();
}

async function carrGuardarRemotoDirecto(carrId, record) {
  const referencia = doc(carrDb, CARR_COLLECTION, carrId);
  await setDoc(referencia, carrPayloadFirebase(record), { merge: true });
}

async function carrGuardarCarrera(data) {
  try {
    const validacion = carrValidarCarrera(data);

    if (!validacion.ok) {
      return {
        ok: false,
        mensaje: validacion.errores.join(" ")
      };
    }

    const valor = validacion.valor;
    const carrId = carrCrearIdCarrera(valor.nombre);

    if (!carrId) {
      return {
        ok: false,
        mensaje: "No fue posible generar un id válido para la carrera."
      };
    }

    const existenteLocal = await carrLeerLocal(carrId);

    if (existenteLocal) {
      return {
        ok: false,
        mensaje: `La carrera ya existe localmente con el id: ${carrId}`
      };
    }

    if (!carrLocalDisponible() && await carrExisteEnFirebase(carrId)) {
      return {
        ok: false,
        mensaje: `La carrera ya existe con el id: ${carrId}`
      };
    }

    const record = carrPrepararRegistroCarrera(valor, {
      id: carrId,
      origen: carrLocalDisponible() ? "local" : "firebase"
    });

    if (carrLocalDisponible()) {
      await carrGuardarLocal(carrId, record);

      return {
        ok: true,
        local: true,
        pendienteSync: true,
        mensaje: "Carrera guardada localmente. Quedó pendiente para sincronizar con Firebase.",
        id: carrId,
        data: record
      };
    }

    await carrGuardarRemotoDirecto(carrId, record);

    return {
      ok: true,
      local: false,
      pendienteSync: false,
      mensaje: "Carrera creada correctamente en Firebase.",
      id: carrId,
      data: record
    };
  } catch (error) {
    console.error("[carr] Error en carrGuardarCarrera:", error);

    return {
      ok: false,
      mensaje: "Ocurrió un error inesperado al guardar la carrera."
    };
  }
}

export { carrGuardarCarrera };
