/*
  Nombre completo: ta-titulo-articulo-api-estudiante.js
  Ruta o ubicación: /Requisitos/Titulos/netlify/functions/ta-titulo-articulo-api-estudiante.js
  Función o funciones:
  - Atender acciones públicas del estudiante desde Netlify.
  - Buscar estudiante por cédula, numeroIdentificacion o ID del documento.
  - Validar período activo normalizado, sin bloquear por campos CUMPLE / NO CUMPLE.
  - Guardar solo telegramUser solicitado al estudiante.
  - Validar coherencia de las 3 propuestas antes de guardar.
  - Reutilizar envíos existentes aunque el período esté escrito como Primer semestre de 2026, 2026-1 o 2026 I.
*/

import {
  COLLECTIONS,
  ESTADOS,
  badRequest,
  buscarEstudiantePorCedula,
  cleanString,
  createEnvioId,
  estudiantePertenecePeriodo,
  estudiantePublico,
  getAdminDb,
  getPeriodoActivo,
  handleOptions,
  normalizeText,
  nowIso,
  ok,
  onlyDigits,
  parseBody,
  periodoEquivalente,
  serverError,
  validarMetodoPost
} from "./ta-titulo-articulo-api-security.js";

import {
  COHERENCIA_ESTADOS,
  validarCoherenciaPropuesta
} from "../../src/services/ta-titulo-articulo-coherencia.service.js";

function tituloReflejaCampos(propuesta) {
  const titulo = normalizeText(propuesta.tituloFinal);
  const valores = [
    propuesta.temaGeneral,
    propuesta.problemaNecesidad,
    propuesta.lugarContexto,
    propuesta.grupoEstudio,
    propuesta.anioPeriodoDatos,
    propuesta.resultadoEsperado
  ].map(normalizeText).filter(Boolean);

  return valores.some((valor) => {
    const palabras = valor.split(" ").filter((p) => p.length >= 4);
    return palabras.some((palabra) => titulo.includes(palabra));
  });
}

function validarPropuestas(propuestas, tituloPreferidoNumero, carrera) {
  if (!Array.isArray(propuestas) || propuestas.length !== 3) return "Debe enviar exactamente 3 propuestas.";
  if (![1, 2, 3].includes(Number(tituloPreferidoNumero))) return "Debe seleccionar cuál de los 3 títulos prefiere.";

  const campos = ["temaGeneral", "lugarContexto", "problemaNecesidad", "grupoEstudio", "anioPeriodoDatos", "objetivoArticulo", "resultadoEsperado", "tituloFinal"];
  const titulos = [];

  for (let i = 0; i < propuestas.length; i += 1) {
    const numero = i + 1;
    const propuesta = propuestas[i] || {};

    for (const campo of campos) {
      if (!cleanString(propuesta[campo])) return `La propuesta ${numero} tiene incompleto el campo ${campo}.`;
    }

    const coherencia = validarCoherenciaPropuesta({ ...propuesta, numero, carrera }, carrera, { forzar: true });
    if (!coherencia.ok) {
      if (coherencia.estado === COHERENCIA_ESTADOS.adaptable) return `La propuesta ${numero} necesita usar el enfoque corregido antes de enviarse.`;
      return coherencia.mensaje || `La propuesta ${numero} no corresponde a la carrera del estudiante.`;
    }

    if (!tituloReflejaCampos(propuesta)) return `El título final de la propuesta ${numero} debe reflejar la información de sus campos guía.`;

    const titulo = normalizeText(propuesta.tituloFinal);
    if (titulos.includes(titulo)) return "Los 3 títulos no pueden ser iguales.";
    titulos.push(titulo);
  }

  const repetidos = titulos.some((titulo, index) => titulos.some((otro, otroIndex) => index !== otroIndex && (titulo.includes(otro) || otro.includes(titulo))));
  if (repetidos) return "Los títulos son demasiado parecidos. Deben ser 3 propuestas diferentes.";

  return "";
}

function limpiarPropuestas(propuestas, tituloPreferidoNumero, carrera) {
  const preferido = Number(tituloPreferidoNumero);

  return propuestas.map((propuesta, index) => {
    const numero = index + 1;
    const coherencia = validarCoherenciaPropuesta({ ...propuesta, numero, carrera }, carrera, { forzar: true });

    return {
      numero,
      preferido: numero === preferido,
      temaGeneral: cleanString(propuesta.temaGeneral),
      lugarContexto: cleanString(propuesta.lugarContexto),
      problemaNecesidad: cleanString(propuesta.problemaNecesidad),
      grupoEstudio: cleanString(propuesta.grupoEstudio),
      anioPeriodoDatos: cleanString(propuesta.anioPeriodoDatos),
      objetivoArticulo: cleanString(propuesta.objetivoArticulo),
      resultadoEsperado: cleanString(propuesta.resultadoEsperado),
      tituloFinal: cleanString(propuesta.tituloFinal),
      coherencia: {
        estado: coherencia.estado,
        clasificacion: coherencia.clasificacion,
        areaCarrera: coherencia.areaCarrera?.id || "",
        areaTema: coherencia.areaTema?.id || "",
        validadoEnServidor: true,
        actualizadoEn: nowIso()
      }
    };
  });
}

async function obtenerEstudiantePeriodo(db, cedula) {
  const periodoActivo = await getPeriodoActivo(db);
  if (!periodoActivo) return { error: badRequest("No existe un período activo configurado.") };

  const estudiante = await buscarEstudiantePorCedula(db, cedula);
  if (!estudiante) return { error: badRequest("No se encontró un estudiante con esa cédula.") };

  if (!estudiantePertenecePeriodo(estudiante, periodoActivo.id)) {
    return {
      error: badRequest("El estudiante no pertenece al período activo.", {
        periodoActivoId: periodoActivo.id,
        periodoActivoLabel: periodoActivo.label
      })
    };
  }

  return { estudiante, periodoActivo };
}

async function buscarEnvioEstudiante(db, periodoActivo, cedula) {
  const envioId = createEnvioId(periodoActivo.id, cedula);
  const directoRef = db.collection(COLLECTIONS.envios).doc(envioId);
  const directoSnap = await directoRef.get();

  if (directoSnap.exists) {
    return { ref: directoRef, id: directoSnap.id, data: directoSnap.data() || {}, exists: true };
  }

  const snap = await db.collection(COLLECTIONS.envios).where("cedula", "==", cedula).get();
  const encontrado = snap.docs.find((doc) => {
    const data = doc.data() || {};
    return periodoEquivalente(data.periodoId || data.periodoLabel, periodoActivo.id);
  });

  if (encontrado) {
    return { ref: encontrado.ref, id: encontrado.id, data: encontrado.data() || {}, exists: true };
  }

  return { ref: directoRef, id: envioId, data: null, exists: false };
}

async function buscarPorCedula(db, payload) {
  const cedula = onlyDigits(payload.cedula);
  if (!cedula) return badRequest("Ingrese una cédula válida.");

  const { estudiante, periodoActivo, error } = await obtenerEstudiantePeriodo(db, cedula);
  if (error) return error;

  const envio = await buscarEnvioEstudiante(db, periodoActivo, cedula);
  return ok({ estudiante: estudiantePublico(estudiante, periodoActivo.label), periodoActivo, envio: envio.exists ? envio.data : null });
}

async function guardarTelegram(db, payload) {
  const cedula = onlyDigits(payload.cedula);
  const telegramUser = cleanString(payload.telegramUser || payload.telegramUsuario);

  if (!cedula) return badRequest("Ingrese una cédula válida.");
  if (!telegramUser) return badRequest("Ingrese su usuario de Telegram.");

  const { estudiante, periodoActivo, error } = await obtenerEstudiantePeriodo(db, cedula);
  if (error) return error;

  const envio = await buscarEnvioEstudiante(db, periodoActivo, cedula);
  const fecha = nowIso();

  await db.collection(COLLECTIONS.estudiantes).doc(estudiante.id).set({ telegramUser, updatedAt: fecha }, { merge: true });
  await envio.ref.set({ envioId: envio.id, periodoId: periodoActivo.id, periodoLabel: periodoActivo.label, cedula, telegramUser, actualizadoEn: fecha }, { merge: true });

  return ok({ mensaje: "Usuario de Telegram guardado correctamente." });
}

async function consultarEstado(db, payload) {
  const cedula = onlyDigits(payload.cedula);
  if (!cedula) return badRequest("Ingrese una cédula válida.");

  const periodoActivo = await getPeriodoActivo(db);
  if (!periodoActivo) return badRequest("No existe un período activo configurado.");

  const envio = await buscarEnvioEstudiante(db, periodoActivo, cedula);
  return ok({ envio: envio.exists ? envio.data : null, periodoActivo });
}

async function enviarPropuestas(db, payload) {
  const cedula = onlyDigits(payload.cedula);
  const telegramUser = cleanString(payload.telegramUser || payload.telegramUsuario);

  if (!cedula) return badRequest("Ingrese una cédula válida.");
  if (!telegramUser) return badRequest("Ingrese su usuario de Telegram.");

  const { estudiante, periodoActivo, error } = await obtenerEstudiantePeriodo(db, cedula);
  if (error) return error;

  const carrera = cleanString(estudiante.NombreCarrera || estudiante.nombreCarrera || estudiante.carrera);
  const errorPropuestas = validarPropuestas(payload.propuestas, payload.tituloPreferidoNumero, carrera);
  if (errorPropuestas) return badRequest(errorPropuestas);

  const envio = await buscarEnvioEstudiante(db, periodoActivo, cedula);
  const envioActual = envio.exists ? envio.data : null;

  if (envioActual && [ESTADOS.enviado, ESTADOS.enRevision, ESTADOS.aprobado, ESTADOS.aprobadoConCorrecciones].includes(envioActual.estado)) {
    return badRequest("El envío ya fue registrado y no puede editarse en este estado.");
  }

  const intento = Number(envioActual?.intento || 0) + 1;
  const propuestas = limpiarPropuestas(payload.propuestas, payload.tituloPreferidoNumero, carrera);
  const fecha = nowIso();

  const data = {
    envioId: envio.id,
    periodoId: periodoActivo.id,
    periodoLabel: periodoActivo.label,
    cedula,
    telegramUser,
    propuestas,
    tituloPreferidoNumero: Number(payload.tituloPreferidoNumero),
    estado: ESTADOS.enviado,
    intento,
    enviadoEn: fecha,
    actualizadoEn: fecha,
    tituloElegidoNumero: null,
    tituloElegidoTexto: "",
    tituloCorregido: "",
    observacion: "",
    coordinadorId: "",
    coordinadorNombre: ""
  };

  await db.collection(COLLECTIONS.estudiantes).doc(estudiante.id).set({ telegramUser, updatedAt: fecha }, { merge: true });
  await envio.ref.set(data, { merge: true });
  await db.collection(COLLECTIONS.historial).add({ tipo: "ENVIO_ESTUDIANTE", envioId: envio.id, cedula, periodoId: periodoActivo.id, periodoLabel: periodoActivo.label, intento, estado: ESTADOS.enviado, propuestas, creadoEn: fecha });

  return ok({ envio: data, mensaje: "Propuestas enviadas correctamente." });
}

export async function handler(event) {
  const options = handleOptions(event);
  if (options) return options;

  try {
    validarMetodoPost(event);
    const { action, payload } = parseBody(event);
    const db = getAdminDb();

    if (action === "buscarPorCedula") return await buscarPorCedula(db, payload);
    if (action === "guardarTelegram") return await guardarTelegram(db, payload);
    if (action === "consultarEstado") return await consultarEstado(db, payload);
    if (action === "enviarPropuestas") return await enviarPropuestas(db, payload);

    return badRequest("Acción de estudiante no reconocida.");
  } catch (error) {
    return serverError(error);
  }
}
