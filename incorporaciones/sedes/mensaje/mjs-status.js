/*
=========================================================
Nombre completo: mjs-status.js
Ruta o ubicación: /incorporaciones/sedes/mensaje/mjs-status.js
Función o funciones:
1. Manejar los estados de mensajes de la pantalla Mensajes.
2. Usar una colección independiente llamada mensajesIncorporacion.
3. Leer estados guardados por período.
4. Guardar el estado AVISADO cuando se abre WhatsApp.
5. Evitar modificar la colección incorporaciones.
=========================================================
*/

const MJS_COLLECTION_MENSAJES = "mensajesIncorporacion";

const MJS_ESTADOS = {
  PENDIENTE: "PENDIENTE",
  AVISADO: "AVISADO",
  CUMPLIDO: "CUMPLIDO"
};

function mjsFechaIsoLocal() {
  return new Date().toISOString();
}

function mjsLimpiarTextoId(valor) {
  if (typeof limpiarIdFirestore === "function") {
    return limpiarIdFirestore(valor);
  }

  return String(valor || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function mjsLimpiarCedulaEstado(valor) {
  if (typeof limpiarCedula === "function") {
    return limpiarCedula(valor);
  }

  return String(valor || "")
    .trim()
    .replace(/\D/g, "");
}

function mjsNormalizarCedulaEstado(valor) {
  if (typeof normalizarCedulaSistema === "function") {
    return normalizarCedulaSistema(valor);
  }

  const cedula = mjsLimpiarCedulaEstado(valor);

  if (cedula.length === 9) {
    return `0${cedula}`;
  }

  return cedula;
}

function mjsCrearDocIdMensaje(cedula, periodoId) {
  const cedulaSegura = mjsNormalizarCedulaEstado(cedula);
  const periodoSeguro = mjsLimpiarTextoId(periodoId);

  return `${cedulaSegura}_${periodoSeguro}`;
}

async function mjsObtenerEstadosMensajes(periodoId) {
  const mapa = {};

  if (!periodoId) {
    return mapa;
  }

  const periodoTexto = String(periodoId || "").trim();
  const periodoSeguro = mjsLimpiarTextoId(periodoTexto);

  try {
    const snapshot = await db
      .collection(MJS_COLLECTION_MENSAJES)
      .where("periodoId", "==", periodoTexto)
      .get();

    snapshot.forEach(function (doc) {
      const data = doc.data() || {};
      const cedula = mjsNormalizarCedulaEstado(data.cedula);

      if (!cedula) {
        return;
      }

      mapa[cedula] = {
        docId: doc.id,
        ...data
      };
    });

    return mapa;
  } catch (error) {
    console.warn("No se pudo consultar mensajes por período. Se intentará lectura general.", error);
  }

  const snapshotGeneral = await db.collection(MJS_COLLECTION_MENSAJES).get();

  snapshotGeneral.forEach(function (doc) {
    const data = doc.data() || {};
    const cedula = mjsNormalizarCedulaEstado(data.cedula);
    const periodoDatoSeguro = mjsLimpiarTextoId(data.periodoId || "");
    const docIdSeguro = mjsLimpiarTextoId(doc.id || "");

    const pertenece =
      periodoDatoSeguro === periodoSeguro ||
      docIdSeguro.includes(periodoSeguro);

    if (!cedula || !pertenece) {
      return;
    }

    mapa[cedula] = {
      docId: doc.id,
      ...data
    };
  });

  return mapa;
}

async function mjsGuardarEstadoAvisado(registro) {
  if (!registro) {
    throw new Error("No existe información del estudiante para guardar el aviso.");
  }

  const cedula = mjsNormalizarCedulaEstado(registro.cedula);
  const periodoId = String(registro.periodo || registro.periodoId || "").trim();

  if (!cedula) {
    throw new Error("No se encontró la cédula del estudiante.");
  }

  if (!periodoId) {
    throw new Error("No se encontró el período del estudiante.");
  }

  const fecha = mjsFechaIsoLocal();
  const docId = mjsCrearDocIdMensaje(cedula, periodoId);

  const datos = {
    cedula: cedula,
    periodoId: periodoId,
    estadoMensaje: MJS_ESTADOS.AVISADO,
    fechaAviso: fecha,
    ultimaActualizacion: fecha,
    nombre: registro.nombres || "",
    carrera: registro.carrera || "",
    sede: registro.sede || registro.sedeInstitucional || "",
    celular: registro.celularOriginal || registro.celularWhatsapp || "",
    origen: "pantalla-mensaje-whatsapp"
  };

  await db
    .collection(MJS_COLLECTION_MENSAJES)
    .doc(docId)
    .set(datos, { merge: true });

  return {
    docId: docId,
    ...datos
  };
}