/*
Nombre completo: incorporaciones-manager.js
Ruta o ubicación: /incorporaciones-app/js/incorporaciones-manager.js

Función o funciones:
1. Guardar la selección de sede o respuesta en la colección incorporaciones.
2. Consultar si un estudiante ya respondió.
3. Impedir que el estudiante cambie su respuesta después de responder.
4. Permitir cambio de respuesta solo desde administrador.
5. Guardar historial de cambios en incorporaciones_historial.
6. Copiar la respuesta también en Estudiantes por compatibilidad.
7. Combinar estudiantes con sus respuestas de incorporación para mostrar en el administrador.
*/

function normalizarRespuestaIncorporacion(valor) {
  const textoBase = typeof normalizarTexto === "function"
    ? normalizarTexto(valor)
    : String(valor || "").trim().toUpperCase();

  const texto = textoBase
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (texto === "QUITO") {
    return "QUITO";
  }

  if (texto === "MANTA") {
    return "MANTA";
  }

  if (
    texto === "NO IRE" ||
    texto === "NO IRÉ" ||
    texto === "NOIRE" ||
    texto === "NO IRA" ||
    texto === "NO IRÁ" ||
    texto === "NO ASISTIRE" ||
    texto === "NO ASISTIRÉ" ||
    texto === "NO ASISTIRA" ||
    texto === "NO ASISTIRÁ"
  ) {
    return "NO IRÉ";
  }

  return "";
}

function esNoIreIncorporacion(valor) {
  return normalizarRespuestaIncorporacion(valor) === "NO IRÉ";
}

function validarSedeIncorporacion(sede) {
  const respuestaNormalizada = normalizarRespuestaIncorporacion(sede);

  if (respuestaNormalizada === "NO IRÉ") {
    return "NO IRÉ";
  }

  if (!APP_CONFIG.sedesPermitidas.includes(respuestaNormalizada)) {
    throw new Error("Respuesta no válida. Solo se permite QUITO, MANTA o NO IRÉ.");
  }

  return respuestaNormalizada;
}

function generarIdIncorporacion(cedula, periodoId, fechaISO) {
  const cedulaLimpia = limpiarCedula(cedula);
  const periodoSeguro = limpiarIdFirestore(periodoId);
  const fecha = String(fechaISO || obtenerFechaISO()).slice(0, 10);

  return `${cedulaLimpia}_${periodoSeguro}_${fecha}`;
}

function generarIdHistorialIncorporacion(cedula, periodoId, fechaISO) {
  const cedulaLimpia = limpiarCedula(cedula);
  const periodoSeguro = limpiarIdFirestore(periodoId);
  const fechaSegura = String(fechaISO || obtenerFechaISO())
    .replace(/[^\d]/g, "")
    .slice(0, 14);

  return `${cedulaLimpia}_${periodoSeguro}_${fechaSegura}`;
}

async function buscarIncorporacionesPorCedulaYPeriodo(cedula, periodoId) {
  const cedulaLimpia = limpiarCedula(cedula);

  if (!cedulaLimpia || !periodoId) {
    return [];
  }

  const snapshot = await db
    .collection(APP_COLLECTIONS.incorporaciones)
    .where("cedula", "==", cedulaLimpia)
    .where("periodoId", "==", periodoId)
    .get();

  const incorporaciones = [];

  snapshot.forEach(function (doc) {
    incorporaciones.push({
      id: doc.id,
      docId: doc.id,
      ...doc.data()
    });
  });

  incorporaciones.sort(function (a, b) {
    return String(b.fechaRegistro || "").localeCompare(
      String(a.fechaRegistro || "")
    );
  });

  return incorporaciones;
}

async function buscarIncorporacionActual(cedula, periodoId) {
  const incorporaciones = await buscarIncorporacionesPorCedulaYPeriodo(
    cedula,
    periodoId
  );

  return incorporaciones.length > 0 ? incorporaciones[0] : null;
}

async function obtenerMapaIncorporacionesPorPeriodo(periodoId) {
  if (!periodoId) {
    return {};
  }

  const snapshot = await db
    .collection(APP_COLLECTIONS.incorporaciones)
    .where("periodoId", "==", periodoId)
    .get();

  const mapa = {};

  snapshot.forEach(function (doc) {
    const data = doc.data() || {};
    const cedula = limpiarCedula(data.cedula);

    if (!cedula) {
      return;
    }

    const registro = {
      id: doc.id,
      docId: doc.id,
      ...data
    };

    const actual = mapa[cedula];

    if (
      !actual ||
      String(registro.fechaRegistro || "") > String(actual.fechaRegistro || "")
    ) {
      mapa[cedula] = registro;
    }
  });

  return mapa;
}

function combinarEstudiantesConIncorporaciones(estudiantes, mapaIncorporaciones) {
  const mapa = mapaIncorporaciones || {};

  return (estudiantes || []).map(function (estudiante) {
    const cedula = obtenerCedulaEstudiante(estudiante);
    const incorporacion = mapa[cedula] || null;

    const respuestaGuardada =
      incorporacion?.incorporacion ||
      estudiante.sedeIncorporacion ||
      estudiante.incorporacion ||
      "";

    const noIre = Boolean(
      incorporacion?.noIre === true ||
      incorporacion?.noIreIncorporacion === true ||
      estudiante.noIre === true ||
      estudiante.noIreIncorporacion === true ||
      esNoIreIncorporacion(respuestaGuardada)
    );

    const respuestaFinal = noIre
      ? "NO IRÉ"
      : respuestaGuardada;

    return {
      ...estudiante,

      incorporacionDocId: incorporacion?.docId || incorporacion?.id || "",
      incorporacion: respuestaFinal,
      sedeIncorporacion: respuestaFinal,
      respondioIncorporacion:
        Boolean(incorporacion) ||
        estudiante.respondioIncorporacion === true ||
        noIre,
      noIre: noIre,
      noIreIncorporacion: noIre,
      fechaRegistroIncorporacion:
        incorporacion?.fechaRegistro ||
        estudiante.fechaRespuestaIncorporacion ||
        "",
      ultimaActualizacionIncorporacion:
        incorporacion?.ultimaActualizacion ||
        estudiante.ultimaActualizacionIncorporacion ||
        "",
      incorporacionRaw: incorporacion
    };
  });
}

async function copiarIncorporacionEnEstudiante(estudianteDocId, datos) {
  if (!estudianteDocId) {
    return;
  }

  const noIre = esNoIreIncorporacion(datos.incorporacion);

  await db
    .collection(APP_COLLECTIONS.estudiantes)
    .doc(estudianteDocId)
    .set(
      {
        sedeIncorporacion: datos.incorporacion,
        incorporacion: datos.incorporacion,
        respondioIncorporacion: true,
        noIre: noIre,
        noIreIncorporacion: noIre,
        fechaRespuestaIncorporacion: datos.fechaRegistro,
        ultimaActualizacionIncorporacion: datos.ultimaActualizacion,
        incorporacionDocId: datos.incorporacionDocId || "",
        origenRespuestaIncorporacion: datos.origen || "web-estudiante"
      },
      { merge: true }
    );
}

async function guardarIncorporacionEstudiante(estudiante, sede) {
  if (!estudiante) {
    throw new Error("No existe información del estudiante.");
  }

  const cedula = obtenerCedulaEstudiante(estudiante);
  const periodoId = obtenerPeriodoEstudiante(estudiante);
  const incorporacion = validarSedeIncorporacion(sede);
  const noIre = esNoIreIncorporacion(incorporacion);

  if (!cedula) {
    throw new Error("No se encontró la cédula del estudiante.");
  }

  if (!periodoId) {
    throw new Error("No se encontró el período del estudiante.");
  }

  if (!estudianteEstaHabilitado(estudiante)) {
    throw new Error("El estudiante no está habilitado para registrar su respuesta.");
  }

  const existente = await buscarIncorporacionActual(cedula, periodoId);

  if (existente) {
    throw new Error(
      `Ya existe una respuesta registrada para este período: ${existente.incorporacion}. Para cambios, contacte con el Coordinador de Titulación.`
    );
  }

  const fecha = obtenerFechaISO();
  const docId = generarIdIncorporacion(cedula, periodoId, fecha);

  const datos = {
    cedula: cedula,
    incorporacion: incorporacion,
    periodoId: periodoId,
    fechaRegistro: fecha,
    ultimaActualizacion: fecha,
    origen: "web-estudiante",
    noIre: noIre,
    noIreIncorporacion: noIre,
    estudianteDocId: estudiante.docId || estudiante.id || "",
    nombres: obtenerNombreEstudiante(estudiante),
    carrera: obtenerCarreraEstudiante(estudiante)
  };

  await db
    .collection(APP_COLLECTIONS.incorporaciones)
    .doc(docId)
    .set(datos, { merge: true });

  await copiarIncorporacionEnEstudiante(estudiante.docId || estudiante.id, {
    ...datos,
    incorporacionDocId: docId
  });

  return {
    docId: docId,
    ...datos
  };
}

/*
Función de compatibilidad con el nombre anterior.
Sirve para que estudiante.js pueda seguir llamando guardarSedeIncorporacion.
*/
async function guardarSedeIncorporacion(cedula, sede, estudianteOpcional) {
  let estudiante = estudianteOpcional || null;

  if (!estudiante) {
    const resultado = await buscarEstudiantePorCedulaEnPeriodosActivos(cedula);
    estudiante = resultado.estudiante;
  }

  if (!estudiante) {
    throw new Error("No se encontró el estudiante en el período habilitado.");
  }

  return guardarIncorporacionEstudiante(estudiante, sede);
}

async function registrarHistorialCambioIncorporacion(datosCambio) {
  const fecha = obtenerFechaISO();
  const cedula = limpiarCedula(datosCambio.cedula);
  const periodoId = String(datosCambio.periodoId || "").trim();

  const historialId = generarIdHistorialIncorporacion(cedula, periodoId, fecha);

  const data = {
    cedula: cedula,
    periodoId: periodoId,
    incorporacionAnterior: datosCambio.incorporacionAnterior || "",
    incorporacionNueva: datosCambio.incorporacionNueva || "",
    fechaCambio: fecha,
    cambiadoPor: datosCambio.cambiadoPor || "ADMIN",
    motivo: datosCambio.motivo || "Cambio realizado desde panel administrador",
    evidencia: datosCambio.evidencia || "Cambio registrado en la app",
    estudianteDocId: datosCambio.estudianteDocId || "",
    incorporacionDocId: datosCambio.incorporacionDocId || ""
  };

  await db
    .collection(APP_COLLECTIONS.incorporacionesHistorial)
    .doc(historialId)
    .set(data, { merge: true });

  return {
    docId: historialId,
    ...data
  };
}

async function cambiarIncorporacionDesdeAdmin(estudiante, nuevaSede, motivo) {
  if (!estudiante) {
    throw new Error("No existe información del estudiante.");
  }

  const cedula = obtenerCedulaEstudiante(estudiante);
  const periodoId = obtenerPeriodoEstudiante(estudiante);
  const incorporacionNueva = validarSedeIncorporacion(nuevaSede);
  const noIre = esNoIreIncorporacion(incorporacionNueva);

  if (!cedula || !periodoId) {
    throw new Error("No se encontró cédula o período del estudiante.");
  }

  const existente = await buscarIncorporacionActual(cedula, periodoId);
  const fecha = obtenerFechaISO();

  let incorporacionDocId = existente?.docId || existente?.id || "";

  if (!incorporacionDocId) {
    incorporacionDocId = generarIdIncorporacion(cedula, periodoId, fecha);
  }

  const incorporacionAnterior =
    existente?.incorporacion ||
    estudiante.incorporacion ||
    estudiante.sedeIncorporacion ||
    "";

  const datosActualizados = {
    cedula: cedula,
    incorporacion: incorporacionNueva,
    periodoId: periodoId,
    fechaRegistro: existente?.fechaRegistro || fecha,
    ultimaActualizacion: fecha,
    origen: "admin",
    noIre: noIre,
    noIreIncorporacion: noIre,
    estudianteDocId: estudiante.docId || estudiante.id || "",
    nombres: obtenerNombreEstudiante(estudiante),
    carrera: obtenerCarreraEstudiante(estudiante)
  };

  await db
    .collection(APP_COLLECTIONS.incorporaciones)
    .doc(incorporacionDocId)
    .set(datosActualizados, { merge: true });

  await copiarIncorporacionEnEstudiante(estudiante.docId || estudiante.id, {
    ...datosActualizados,
    incorporacionDocId: incorporacionDocId
  });

  await registrarHistorialCambioIncorporacion({
    cedula: cedula,
    periodoId: periodoId,
    incorporacionAnterior: incorporacionAnterior,
    incorporacionNueva: incorporacionNueva,
    cambiadoPor: "ADMIN",
    motivo: motivo || "Cambio realizado por administrador",
    evidencia: "Cambio registrado desde el panel administrador",
    estudianteDocId: estudiante.docId || estudiante.id || "",
    incorporacionDocId: incorporacionDocId
  });

  return {
    docId: incorporacionDocId,
    ...datosActualizados
  };
}