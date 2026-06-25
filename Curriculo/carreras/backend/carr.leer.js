/*
Nombre del archivo: carr.leer.js
Ubicación: /Curriculo/carreras/backend/carr.leer.js
Función:
- Leer una carrera específica por su id
- Leer todas las carreras desde local y Firebase
- Cachear datos remotos en la base local sin marcarlos como pendientes
- Devolver datos listos para consumo en frontend
*/

import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  CARR_COLLECTION,
  carrDb,
  carrGuardarLocal,
  carrLeerLocal,
  carrLeerLocales,
  carrLocalDisponible
} from "./carr.firebase.js";
import {
  carrPrepararLecturaCarrera,
  carrNormalizarBusqueda
} from "./carr.normalizar.js";

function carrOrdenarItems(items) {
  return (Array.isArray(items) ? items : []).slice().sort((a, b) => {
    return carrNormalizarBusqueda(a?.nombre || a?.id)
      .localeCompare(carrNormalizarBusqueda(b?.nombre || b?.id), "es", {
        numeric: true,
        sensitivity: "base"
      });
  });
}

async function carrLeerRemotaPorId(carrId) {
  const referencia = doc(carrDb, CARR_COLLECTION, carrId);
  const snap = await getDoc(referencia);

  if (!snap.exists()) {
    return null;
  }

  return carrPrepararLecturaCarrera(snap.id, snap.data());
}

async function carrLeerRemotas() {
  const referencia = collection(carrDb, CARR_COLLECTION);
  const consulta = query(referencia, orderBy("nombre"));
  const snap = await getDocs(consulta);

  return snap.docs.map((docItem) => (
    carrPrepararLecturaCarrera(docItem.id, docItem.data())
  ));
}

async function carrCachearRemotas(items) {
  if (!carrLocalDisponible()) {
    return;
  }

  await Promise.all((Array.isArray(items) ? items : []).map((item) => (
    carrGuardarLocal(item.id, item, { markDirty: false })
  )));
}

async function carrLeerCarreraPorId(carrId) {
  const id = String(carrId || "").trim();

  if (!id) {
    return {
      ok: false,
      mensaje: "Debe proporcionar un id de carrera válido."
    };
  }

  try {
    const local = await carrLeerLocal(id);

    if (local) {
      return {
        ok: true,
        mensaje: "Carrera encontrada en base local.",
        id,
        data: carrPrepararLecturaCarrera(id, local)
      };
    }

    const remoto = await carrLeerRemotaPorId(id);

    if (!remoto) {
      return {
        ok: false,
        mensaje: "No se encontró la carrera solicitada."
      };
    }

    await carrCachearRemotas([remoto]);

    return {
      ok: true,
      mensaje: "Carrera encontrada en Firebase.",
      id,
      data: remoto
    };
  } catch (error) {
    console.error("[carr] Error al leer carrera:", error);

    return {
      ok: false,
      mensaje: "No se pudo leer la carrera solicitada."
    };
  }
}

async function carrLeerTodasLasCarreras() {
  try {
    const locales = carrLocalDisponible()
      ? (await carrLeerLocales()).map((item) => carrPrepararLecturaCarrera(item.id, item))
      : [];

    let remotas = [];
    let aviso = "";

    try {
      remotas = await carrLeerRemotas();
      await carrCachearRemotas(remotas);
    } catch (firebaseError) {
      aviso = "No se pudo conectar con Firebase. Se muestran los datos locales disponibles.";
      console.warn("[carr] Lectura remota no disponible:", firebaseError);
    }

    const mapa = new Map();

    remotas.forEach((item) => {
      if (item?.id) mapa.set(item.id, item);
    });

    locales.forEach((item) => {
      if (item?.id) mapa.set(item.id, item);
    });

    const items = carrOrdenarItems(Array.from(mapa.values()));

    return {
      ok: true,
      mensaje: aviso || "Carreras cargadas correctamente.",
      total: items.length,
      items,
      fuente: carrLocalDisponible() ? "local_firebase" : "firebase"
    };
  } catch (error) {
    console.error("[carr] Error al leer carreras:", error);

    return {
      ok: false,
      mensaje: "No se pudieron leer las carreras.",
      total: 0,
      items: []
    };
  }
}

export {
  carrLeerCarreraPorId,
  carrLeerTodasLasCarreras
};
