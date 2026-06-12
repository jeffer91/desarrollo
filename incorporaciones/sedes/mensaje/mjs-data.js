/*
=========================================================
Nombre completo: mjs-data.js
Ruta o ubicación: /incorporaciones/sedes/mensaje/mjs-data.js
Función o funciones:
1. Leer períodos desde Firebase.
2. Leer estudiantes por período.
3. Leer incorporaciones registradas por período.
4. Leer estados de mensajes guardados.
5. Consolidar la información para la tabla de mensajes.
6. Determinar estado: Pendiente, Avisado o Cumplido.
=========================================================
*/

function mjsNormalizarTextoDato(valor) {
  if (typeof normalizarTexto === "function") {
    return normalizarTexto(valor);
  }

  return String(valor || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function mjsNormalizarTextoFlexibleDato(valor) {
  return String(valor || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function mjsLimpiarCedulaDato(valor) {
  if (typeof limpiarCedula === "function") {
    return limpiarCedula(valor);
  }

  return String(valor || "")
    .trim()
    .replace(/\D/g, "");
}

function mjsNormalizarCedulaDato(valor) {
  if (typeof normalizarCedulaSistema === "function") {
    return normalizarCedulaSistema(valor);
  }

  const cedula = mjsLimpiarCedulaDato(valor);

  if (cedula.length === 9) {
    return `0${cedula}`;
  }

  return cedula;
}

function mjsLimpiarIdDato(valor) {
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

function mjsTextoDato(valor, defecto) {
  const texto = String(valor || "").trim();
  return texto || defecto || "Sin dato";
}

function mjsObtenerCampoDato(objeto, campos) {
  if (!objeto || !Array.isArray(campos)) {
    return "";
  }

  for (const campo of campos) {
    if (objeto[campo] !== undefined && objeto[campo] !== null && String(objeto[campo]).trim() !== "") {
      return objeto[campo];
    }
  }

  return "";
}

function mjsObtenerCedulaDato(estudiante) {
  if (typeof obtenerCedulaEstudiante === "function") {
    return mjsNormalizarCedulaDato(obtenerCedulaEstudiante(estudiante));
  }

  return mjsNormalizarCedulaDato(
    mjsObtenerCampoDato(estudiante, [
      "numeroIdentificacion",
      "NumeroIdentificacion",
      "Número Identificación",
      "Identificacion",
      "identificacion",
      "Cedula",
      "Cédula",
      "cedula",
      "CEDULA",
      "id"
    ])
  );
}

function mjsObtenerNombreDato(estudiante) {
  if (typeof obtenerNombreEstudiante === "function") {
    return mjsTextoDato(obtenerNombreEstudiante(estudiante), "Sin nombres");
  }

  return mjsTextoDato(
    mjsObtenerCampoDato(estudiante, [
      "Nombres",
      "nombres",
      "Nombre",
      "nombre",
      "NombreCompleto",
      "nombreCompleto",
      "Estudiante",
      "estudiante",
      "Apellidos y Nombres",
      "APELLIDOS Y NOMBRES"
    ]),
    "Sin nombres"
  );
}

function mjsObtenerCarreraDato(estudiante) {
  if (typeof obtenerCarreraEstudiante === "function") {
    return mjsTextoDato(obtenerCarreraEstudiante(estudiante), "Sin carrera");
  }

  return mjsTextoDato(
    mjsObtenerCampoDato(estudiante, [
      "NombreCarrera",
      "nombreCarrera",
      "Carrera",
      "carrera",
      "CARRERA",
      "Programa",
      "programa"
    ]),
    "Sin carrera"
  );
}

function mjsObtenerSedeDato(estudiante) {
  return mjsTextoDato(
    mjsObtenerCampoDato(estudiante, [
      "Sede",
      "sede",
      "SedeInstitucional",
      "sedeInstitucional",
      "SEDE",
      "Campus",
      "campus"
    ]),
    "Sin sede"
  );
}

function mjsObtenerPeriodoDato(estudiante, periodoSeleccionado) {
  if (typeof obtenerPeriodoEstudiante === "function") {
    return mjsTextoDato(obtenerPeriodoEstudiante(estudiante), periodoSeleccionado);
  }

  return mjsTextoDato(
    mjsObtenerCampoDato(estudiante, [
      "periodoId",
      "PeriodoId",
      "Periodo",
      "periodo",
      "PERIODO"
    ]),
    periodoSeleccionado
  );
}

function mjsObtenerCelularDato(estudiante) {
  return String(
    mjsObtenerCampoDato(estudiante, [
      "Celular",
      "celular",
      "CELULAR",
      "Telefono",
      "Teléfono",
      "telefono",
      "TELEFONO",
      "Número Celular",
      "NumeroCelular",
      "numeroCelular",
      "WhatsApp",
      "Whatsapp",
      "whatsapp",
      "Contacto",
      "contacto"
    ])
  ).trim();
}

function mjsPerteneceAlPeriodoDato(item, periodoId) {
  const periodoSeguro = mjsLimpiarIdDato(periodoId);
  const periodoCampo = String(item.periodoId || item.Periodo || item.periodo || "").trim();
  const periodoCampoSeguro = mjsLimpiarIdDato(periodoCampo);
  const docIdSeguro = mjsLimpiarIdDato(item.docId || item.id || "");

  if (periodoCampo && periodoCampo === periodoId) {
    return true;
  }

  if (periodoCampoSeguro && periodoCampoSeguro === periodoSeguro) {
    return true;
  }

  if (docIdSeguro.includes(periodoSeguro)) {
    return true;
  }

  return false;
}

async function mjsObtenerPeriodosMensaje() {
  if (typeof obtenerPeriodosFirebase === "function") {
    return await obtenerPeriodosFirebase();
  }

  const snapshot = await db.collection(APP_COLLECTIONS.periodos).get();
  const periodos = [];

  snapshot.forEach(function (doc) {
    const data = doc.data() || {};

    periodos.push({
      docId: doc.id,
      id: data.id || doc.id,
      label: data.label || data.nombre || data.id || doc.id,
      activoConsulta: data.activoConsulta === true,
      ordenPeriodo: data.ordenPeriodo || data.orden || 0,
      raw: data
    });
  });

  periodos.sort(function (a, b) {
    return Number(b.ordenPeriodo || 0) - Number(a.ordenPeriodo || 0);
  });

  return periodos;
}

async function mjsObtenerEstudiantesMensaje(periodoId) {
  if (!periodoId) {
    throw new Error("Debe seleccionar un período.");
  }

  if (typeof obtenerEstudiantesPorPeriodo === "function") {
    const estudiantesSistema = await obtenerEstudiantesPorPeriodo(periodoId);

    if (Array.isArray(estudiantesSistema) && estudiantesSistema.length > 0) {
      return estudiantesSistema;
    }
  }

  const estudiantes = [];

  try {
    const snapshot = await db
      .collection(APP_COLLECTIONS.estudiantes)
      .where("periodoId", "==", periodoId)
      .get();

    snapshot.forEach(function (doc) {
      estudiantes.push({
        id: doc.id,
        docId: doc.id,
        ...doc.data()
      });
    });

    if (estudiantes.length > 0) {
      return estudiantes;
    }
  } catch (error) {
    console.warn("No se pudo consultar estudiantes por período exacto. Se intentará lectura general.", error);
  }

  const snapshotGeneral = await db.collection(APP_COLLECTIONS.estudiantes).get();
  const filtrados = [];

  snapshotGeneral.forEach(function (doc) {
    const data = {
      id: doc.id,
      docId: doc.id,
      ...doc.data()
    };

    if (mjsPerteneceAlPeriodoDato(data, periodoId)) {
      filtrados.push(data);
    }
  });

  return filtrados;
}

async function mjsObtenerIncorporacionesMensaje(periodoId) {
  const mapa = {};

  if (!periodoId) {
    return mapa;
  }

  const guardarEnMapa = function (doc) {
    const data = doc.data() || {};
    const cedula = mjsNormalizarCedulaDato(data.cedula || data.numeroIdentificacion || "");

    if (!cedula) {
      return;
    }

    const actual = mapa[cedula];
    const nuevoRegistro = {
      id: doc.id,
      docId: doc.id,
      ...data
    };

    const fechaNueva = String(
      nuevoRegistro.ultimaActualizacion ||
      nuevoRegistro.fechaActualizacion ||
      nuevoRegistro.fechaRegistro ||
      ""
    );

    const fechaActual = String(
      actual?.ultimaActualizacion ||
      actual?.fechaActualizacion ||
      actual?.fechaRegistro ||
      ""
    );

    if (!actual || fechaNueva >= fechaActual) {
      mapa[cedula] = nuevoRegistro;
    }
  };

  try {
    const snapshot = await db
      .collection(APP_COLLECTIONS.incorporaciones)
      .where("periodoId", "==", periodoId)
      .get();

    snapshot.forEach(guardarEnMapa);

    if (Object.keys(mapa).length > 0) {
      return mapa;
    }
  } catch (error) {
    console.warn("No se pudo consultar incorporaciones por período exacto. Se intentará lectura general.", error);
  }

  const snapshotGeneral = await db.collection(APP_COLLECTIONS.incorporaciones).get();

  snapshotGeneral.forEach(function (doc) {
    const data = {
      id: doc.id,
      docId: doc.id,
      ...doc.data()
    };

    if (!mjsPerteneceAlPeriodoDato(data, periodoId)) {
      return;
    }

    guardarEnMapa({
      id: doc.id,
      data: function () {
        return data;
      }
    });
  });

  return mapa;
}

function mjsEstudianteRespondioEncuesta(estudiante, incorporacion) {
  if (incorporacion) {
    return true;
  }

  const sedeIncorporacion = String(
    estudiante.sedeIncorporacion ||
    estudiante.incorporacion ||
    estudiante.Incorporacion ||
    ""
  ).trim();

  if (sedeIncorporacion) {
    return true;
  }

  if (estudiante.respondioIncorporacion === true) {
    return true;
  }

  return false;
}

function mjsDeterminarEstadoMensaje(estudiante, incorporacion, estadoGuardado) {
  if (mjsEstudianteRespondioEncuesta(estudiante, incorporacion)) {
    return MJS_ESTADOS.CUMPLIDO;
  }

  if (estadoGuardado && estadoGuardado.estadoMensaje === MJS_ESTADOS.AVISADO) {
    return MJS_ESTADOS.AVISADO;
  }

  return MJS_ESTADOS.PENDIENTE;
}

/* Corrección: detecta si el estudiante está habilitado antes de generar mensajes.
   Evita que la pantalla de WhatsApp trate igual a estudiantes no habilitados. */
function mjsEstudianteEstaHabilitadoDato(estudiante) {
  if (typeof estudianteEstaHabilitado === "function") {
    return estudianteEstaHabilitado(estudiante);
  }

  return estudiante.habilitado === true || estudiante.Habilitado === true;
}

function mjsCrearRegistroMensaje(estudiante, periodoId, mapaIncorporaciones, mapaEstados) {
  const cedula = mjsObtenerCedulaDato(estudiante);
  const incorporacion = mapaIncorporaciones[cedula] || null;
  const estadoGuardado = mapaEstados[cedula] || null;
  const celularOriginal = mjsObtenerCelularDato(estudiante);
  const celularWhatsapp = mjsNormalizarCelularWhatsapp(celularOriginal);
  const periodo = mjsObtenerPeriodoDato(estudiante, periodoId);
  const estado = mjsDeterminarEstadoMensaje(estudiante, incorporacion, estadoGuardado);

  return {
    key: `${cedula}_${mjsLimpiarIdDato(periodo)}`,
    idFila: `mjsFila_${cedula}_${mjsLimpiarIdDato(periodo)}`,
    cedula: cedula,
    nombres: mjsObtenerNombreDato(estudiante),
    carrera: mjsObtenerCarreraDato(estudiante),
    sede: mjsObtenerSedeDato(estudiante),
    periodo: periodo,
    periodoId: periodoId,
    celularOriginal: celularOriginal,
    celularWhatsapp: celularWhatsapp,
    tieneCelular: Boolean(celularWhatsapp),
    estado: estado,

    // Corrección: guarda el estado de habilitación dentro del registro consolidado.
    // Permite filtrar y bloquear mensajes a estudiantes no habilitados desde mjs-main.js.
    habilitado: mjsEstudianteEstaHabilitadoDato(estudiante),

    estadoGuardado: estadoGuardado,
    incorporacion: incorporacion,
    estudianteRaw: estudiante
  };
}

async function mjsCargarRegistrosMensaje(periodoId) {
  const estudiantes = await mjsObtenerEstudiantesMensaje(periodoId);
  const incorporaciones = await mjsObtenerIncorporacionesMensaje(periodoId);
  const estados = await mjsObtenerEstadosMensajes(periodoId);

  return estudiantes
    .map(function (estudiante) {
      return mjsCrearRegistroMensaje(estudiante, periodoId, incorporaciones, estados);
    })
    .filter(function (registro) {
      return Boolean(registro.cedula);
    })
    .sort(function (a, b) {
      return (
        a.carrera.localeCompare(b.carrera, "es") ||
        a.nombres.localeCompare(b.nombres, "es")
      );
    });
}