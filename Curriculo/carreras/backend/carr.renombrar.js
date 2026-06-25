/*
Nombre del archivo: carr.renombrar.js
Ubicación: /Curriculo/carreras/backend/carr.renombrar.js
Función:
- Validar datos antes de renombrar
- Calcular el nuevo id según el nuevo nombre
- Migrar el registro manteniendo la información existente
*/

import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  CARR_COLLECTION,
  carrDb,
  carrEliminarLocal,
  carrGuardarLocal,
  carrLeerLocal,
  carrLocalDisponible
} from "./carr.firebase.js";
import { carrActualizarCarrera } from "./carr.actualizar.js";
import {
  carrCrearIdCarrera,
  carrPrepararRegistroCarrera
} from "./carr.normalizar.js";
import { carrValidarCarrera } from "./carr.validar.js";

async function carrLeerRemota(carrId) {
  const snap = await getDoc(doc(carrDb, CARR_COLLECTION, carrId));
  return snap.exists() ? snap.data() : null;
}

async function carrExisteRemota(carrId) {
  const snap = await getDoc(doc(carrDb, CARR_COLLECTION, carrId));
  return snap.exists();
}

async function carrRenombrarRemotoDirecto(idOrigen, nuevoId, record) {
  await setDoc(doc(carrDb, CARR_COLLECTION, nuevoId), {
    ...record,
    updatedAt: serverTimestamp()
  });

  await deleteDoc(doc(carrDb, CARR_COLLECTION, idOrigen));
}

async function carrRenombrarCarrera(idActual, data) {
  try {
    const idOrigen = String(idActual || "").trim();

    if (!idOrigen) {
      return { ok: false, mensaje: "El id actual de la carrera es obligatorio para renombrar." };
    }

    const validacion = carrValidarCarrera(data);

    if (!validacion.ok) {
      return { ok: false, mensaje: validacion.errores.join(" ") };
    }

    const valor = validacion.valor;
    const nuevoId = carrCrearIdCarrera(valor.nombre);

    if (!nuevoId) {
      return { ok: false, mensaje: "No fue posible generar un nuevo id válido para la carrera." };
    }

    if (nuevoId === idOrigen) {
      return await carrActualizarCarrera(idOrigen, valor);
    }

    const origenLocal = await carrLeerLocal(idOrigen);
    let origenRemoto = null;

    if (!origenLocal) {
      try { origenRemoto = await carrLeerRemota(idOrigen); }
      catch (error) { origenRemoto = null; }
    }

    if (!origenLocal && !origenRemoto) {
      return { ok: false, mensaje: `No existe una carrera con el id: ${idOrigen}` };
    }

    const destinoLocal = await carrLeerLocal(nuevoId);
    let destinoRemoto = false;

    if (!destinoLocal) {
      try { destinoRemoto = await carrExisteRemota(nuevoId); }
      catch (error) { destinoRemoto = false; }
    }

    if (destinoLocal || destinoRemoto) {
      return { ok: false, mensaje: `Ya existe otra carrera con el id destino: ${nuevoId}` };
    }

    const record = carrPrepararRegistroCarrera(valor, {
      ...(origenRemoto || {}),
      ...(origenLocal || {}),
      id: nuevoId,
      idAnterior: idOrigen
    });

    if (carrLocalDisponible()) {
      await carrGuardarLocal(nuevoId, record);
      await carrEliminarLocal(idOrigen);

      return {
        ok: true,
        local: true,
        pendienteSync: true,
        mensaje: "Carrera renombrada localmente. Quedó pendiente para sincronizar con Firebase.",
        idAnterior: idOrigen,
        id: nuevoId,
        data: record
      };
    }

    await carrRenombrarRemotoDirecto(idOrigen, nuevoId, record);

    return {
      ok: true,
      local: false,
      pendienteSync: false,
      mensaje: "Carrera renombrada correctamente en Firebase.",
      idAnterior: idOrigen,
      id: nuevoId,
      data: record
    };
  } catch (error) {
    console.error("[carr] Error en carrRenombrarCarrera:", error);
    return { ok: false, mensaje: "Ocurrió un error inesperado al renombrar la carrera." };
  }
}

export { carrRenombrarCarrera };
