/*
Nombre del archivo: carr.actualizar.js
Ubicación: /Curriculo/carreras/backend/carr.actualizar.js
Función:
- Validar datos antes de actualizar
- Confirmar que el documento exista en local o Firebase
- Actualizar nombre, tipo y estado
- Guardar primero local y dejar pendiente sincronización cuando exista base local
*/

import {
  doc,
  getDoc,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  CARR_COLLECTION,
  carrDb,
  carrGuardarLocal,
  carrLeerLocal,
  carrLocalDisponible
} from "./carr.firebase.js";
import { carrPrepararRegistroCarrera } from "./carr.normalizar.js";
import { carrValidarCarrera } from "./carr.validar.js";

async function carrLeerRemota(carrId) {
  const referencia = doc(carrDb, CARR_COLLECTION, carrId);
  const existente = await getDoc(referencia);
  return existente.exists() ? existente.data() : null;
}

async function carrActualizarRemotoDirecto(carrId, valor) {
  const referencia = doc(carrDb, CARR_COLLECTION, carrId);

  await updateDoc(referencia, {
    nombre: valor.nombre,
    tipo: valor.tipo,
    estado: valor.estado,
    nombreNormalizado: valor.nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase(),
    updatedAt: serverTimestamp()
  });
}

async function carrActualizarCarrera(id, data) {
  try {
    const carrId = String(id || "").trim();

    if (!carrId) {
      return {
        ok: false,
        mensaje: "El id de la carrera es obligatorio para actualizar."
      };
    }

    const validacion = carrValidarCarrera(data);

    if (!validacion.ok) {
      return {
        ok: false,
        mensaje: validacion.errores.join(" ")
      };
    }

    const valor = validacion.valor;
    const existenteLocal = await carrLeerLocal(carrId);
    let existenteRemoto = null;

    if (!existenteLocal) {
      try {
        existenteRemoto = await carrLeerRemota(carrId);
      } catch (firebaseError) {
        existenteRemoto = null;
      }
    }

    if (!existenteLocal && !existenteRemoto) {
      return {
        ok: false,
        mensaje: `No existe una carrera con el id: ${carrId}`
      };
    }

    const record = carrPrepararRegistroCarrera(valor, {
      ...(existenteRemoto || {}),
      ...(existenteLocal || {}),
      id: carrId
    });

    if (carrLocalDisponible()) {
      await carrGuardarLocal(carrId, record);

      return {
        ok: true,
        local: true,
        pendienteSync: true,
        mensaje: "Carrera actualizada localmente. Quedó pendiente para sincronizar con Firebase.",
        id: carrId,
        data: record
      };
    }

    await carrActualizarRemotoDirecto(carrId, valor);

    return {
      ok: true,
      local: false,
      pendienteSync: false,
      mensaje: "Carrera actualizada correctamente en Firebase.",
      id: carrId,
      data: record
    };
  } catch (error) {
    console.error("[carr] Error en carrActualizarCarrera:", error);

    return {
      ok: false,
      mensaje: "Ocurrió un error inesperado al actualizar la carrera."
    };
  }
}

export { carrActualizarCarrera };
