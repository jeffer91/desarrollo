/*
  Nombre completo: ta-titulo-articulo-api-estudiante.js
  Ruta o ubicación: /Requisitos/Titulos/netlify/functions/ta-titulo-articulo-api-estudiante.js
  Función o funciones:
  - Atender acciones públicas del estudiante desde Netlify si se fuerza el modo functions.
  - Alinear el guardado servidor con la estructura limpia de la colección titulos.
  - Mantener compatibilidad con documentos viejos por cédula.
*/

import {
  COLLECTIONS,
  ESTADOS,
  badRequest,
  buscarEstudiantePorCedula,
  cleanString,
  createEnvioId,
  createEnvioIdLegacyCedula,
  estudiantePertenecePeriodo,
  estudiantePublico,
  getAdminDb,
  getPeriodoActivo,
  handleOptions,
  normalizeText,
  normalizarEstadoTitulo,
  nowIso,
  ok,
  onlyDigits,
  parseBody,
  periodoEquivalente,
  serverError,
  validarMetodoPost
} from "./ta-titulo-articulo-api-security.js";

const TOTAL_TITULOS = 3;
const MAX_INTENTOS = 2;

function tituloDesdeItem(item = {}) {
  if (typeof item === "string") return cleanString(item);
  return cleanString(item.titulo || item.tituloFinal || item.texto || "");
}

function titulosDesdePayload(payload = {}) {
  const preferido = Number(payload.tituloPreferidoNumero || payload.propuestaPreferidaNumero || 0);
  const fuente = Array.isArray(payload.titulosEnviados) ? payload.titulosEnviados : (Array.isArray(payload.propuestas) ? payload.propuestas : []);
  return fuente.slice(0, TOTAL_TITULOS).map((item, index) => ({
    numero: Number(item.numero || index + 1),
    titulo: tituloDesdeItem(item),
    preferido: Number(item.numero || index + 1) === preferido || Boolean(item.preferido)
  })).filter((item) => item.numero && item.titulo);
}

function validarTitulos(payload = {}) {
  const preferido = Number(payload.tituloPreferidoNumero || payload.propuestaPreferidaNumero || 0);
  if (![1, 2, 3].includes(preferido)) return { error: "Debe seleccionar cuál de los 3 títulos prefiere.", titulos: [] };
  const titulos = titulosDesdePayload({ ...payload, tituloPreferidoNumero: preferido });
  if (titulos.length !== TOTAL_TITULOS) return { error: "Debe enviar exactamente 3 títulos.", titulos: [] };
  const vistos = [];
  for (const item of titulos) {
    const key = normalizeText(item.titulo);
    if (!key) return { error: `El título ${item.numero} está vacío.`, titulos: [] };
    if (vistos.includes(key)) return { error: "Los 3 títulos deben ser diferentes.", titulos: [] };
    vistos.push(key);
  }
  return { error: "", titulos: titulos.map((item) => ({ ...item, preferido: item.numero === preferido })) };
}

async function obtenerEstudiantePeriodo(db, cedula) {
  const periodoActivo = await getPeriodoActivo(db);
  if (!periodoActivo) return { error: badRequest("No existe un período activo configurado.") };
  const estudiante = await buscarEstudiantePorCedula(db, cedula);
  if (!estudiante) return { error: badRequest("No se encontró un estudiante con esa cédula.") };
  if (!estudiantePertenecePeriodo(estudiante, periodoActivo.id)) {
    return { error: badRequest("El estudiante no pertenece al período activo.", { periodoActivoId: periodoActivo.id, periodoActivoLabel: periodoActivo.label }) };
  }
  return { estudiante, periodoActivo };
}

function normalizarEnvio(id, data = {}) {
  const titulos = Array.isArray(data.titulosEnviados)
    ? data.titulosEnviados
    : (Array.isArray(data.propuestas) ? data.propuestas.map((item) => ({ numero: item.numero, titulo: item.titulo || item.tituloFinal, preferido: item.preferido })) : []);
  const estado = normalizarEstadoTitulo(data.estado);
  const intentosUsados = Number(data.intentosUsados || data.intento || 0);
  const maxIntentos = Number(data.maxIntentos || MAX_INTENTOS);
  return {
    ...data,
    docId: cleanString(data.docId || data.envioId || id),
    envioId: cleanString(data.envioId || data.docId || id),
    estado,
    titulosEnviados: titulos,
    tituloPreferidoNumero: Number(data.tituloPreferidoNumero || data.propuestaPreferidaNumero || 0),
    tituloCorregidoCoordinador: cleanString(data.tituloCorregidoCoordinador || data.tituloCorregido || ""),
    observacionCoordinador: cleanString(data.observacionCoordinador || data.observacion || ""),
    tituloElegidoTexto: cleanString(data.tituloElegidoTexto || data.tituloElegido || ""),
    intentosUsados,
    maxIntentos,
    reenvioDisponible: estado === ESTADOS.devuelto && intentosUsados < maxIntentos
  };
}

async function buscarEnvioEstudiante(db, periodoActivo, cedula) {
  const envioId = createEnvioId(periodoActivo.id, cedula);
  const ref = db.collection(COLLECTIONS.envios).doc(envioId);
  const snap = await ref.get();
  if (snap.exists) return { ref, id: snap.id, data: normalizarEnvio(snap.id, snap.data() || {}), exists: true };

  const legacyId = createEnvioIdLegacyCedula(cedula);
  const legacyRef = db.collection(COLLECTIONS.envios).doc(legacyId);
  const legacySnap = await legacyRef.get();
  if (legacySnap.exists) return { ref, id: envioId, data: normalizarEnvio(envioId, legacySnap.data() || {}), exists: true, legacyRef };

  const querySnap = await db.collection(COLLECTIONS.envios).where("cedula", "==", cedula).get();
  const encontrado = querySnap.docs.find((doc) => periodoEquivalente(doc.data()?.periodoId || doc.data()?.periodoLabel, periodoActivo.id));
  if (encontrado) return { ref, id: envioId, data: normalizarEnvio(envioId, encontrado.data() || {}), exists: true, legacyRef: encontrado.ref };
  return { ref, id: envioId, data: null, exists: false };
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
  await envio.ref.set({ docId: envio.id, envioId: envio.id, periodoId: periodoActivo.id, periodoLabel: periodoActivo.label, cedula, estado: envio.data?.estado || ESTADOS.sinEnvio, telegramUser, actualizadoEn: fecha, creadoEn: envio.data?.creadoEn || fecha }, { merge: true });
  return ok({ mensaje: "Usuario de Telegram guardado correctamente." });
}

async function consultarEstado(db, payload) {
  const cedula = onlyDigits(payload.cedula);
  if (!cedula) return badRequest("Ingrese una cédula válida.");
  const periodoActivo = await getPeriodoActivo(db);
  const envio = await buscarEnvioEstudiante(db, periodoActivo, cedula);
  return ok({ envio: envio.exists ? envio.data : null, periodoActivo });
}

async function enviarPropuestas(db, payload) {
  const cedula = onlyDigits(payload.cedula);
  if (!cedula) return badRequest("Ingrese una cédula válida.");
  const { estudiante, periodoActivo, error } = await obtenerEstudiantePeriodo(db, cedula);
  if (error) return error;

  const validacion = validarTitulos(payload);
  if (validacion.error) return badRequest(validacion.error);

  const envio = await buscarEnvioEstudiante(db, periodoActivo, cedula);
  const envioActual = envio.exists ? normalizarEnvio(envio.id, envio.data || {}) : null;
  const estadoActual = envioActual?.estado || ESTADOS.sinEnvio;
  if ([ESTADOS.enviado, ESTADOS.enRevision, ESTADOS.aprobado, ESTADOS.aprobadoConCorrecciones].includes(estadoActual)) return badRequest("El envío ya fue registrado y no puede editarse en este estado.");
  if (estadoActual === ESTADOS.devuelto && Number(envioActual?.intentosUsados || 0) >= MAX_INTENTOS) return badRequest("Ya utilizó su única oportunidad de reenvío después de la devolución.");

  const fecha = nowIso();
  const estudianteBase = estudiantePublico(estudiante, periodoActivo.label);
  const intentosUsados = Number(envioActual?.intentosUsados || 0) + 1;
  const telegramUser = cleanString(payload.telegramUser || payload.telegramUsuario || envioActual?.telegramUser || "");
  const data = {
    docId: envio.id,
    envioId: envio.id,
    periodoId: periodoActivo.id,
    periodoLabel: periodoActivo.label,
    cedula,
    nombres: estudianteBase.nombres,
    codigoCarrera: estudianteBase.codigoCarrera,
    carrera: estudianteBase.carrera,
    estado: ESTADOS.enviado,
    titulosEnviados: validacion.titulos,
    tituloPreferidoNumero: Number(payload.tituloPreferidoNumero || payload.propuestaPreferidaNumero),
    tituloElegidoNumero: "",
    tituloElegidoTexto: "",
    tituloCorregidoCoordinador: "",
    observacionCoordinador: "",
    coordinadorId: "",
    coordinadorNombre: "",
    intentosUsados,
    maxIntentos: MAX_INTENTOS,
    reenvioDisponible: false,
    creadoEn: envioActual?.creadoEn || fecha,
    enviadoEn: fecha,
    revisadoEn: "",
    actualizadoEn: fecha,
    ...(telegramUser ? { telegramUser } : {})
  };
  await envio.ref.set(data, { merge: false });
  await db.collection(COLLECTIONS.historial).add({ tipo: intentosUsados > 1 ? "REENVIO_ESTUDIANTE" : "ENVIO_ESTUDIANTE", docId: envio.id, envioId: envio.id, cedula, periodoId: periodoActivo.id, periodoLabel: periodoActivo.label, estado: ESTADOS.enviado, intentosUsados, titulosEnviados: validacion.titulos, creadoEn: fecha });
  return ok({ envio: normalizarEnvio(envio.id, data), mensaje: intentosUsados > 1 ? "Títulos reenviados correctamente." : "Títulos enviados correctamente." });
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
