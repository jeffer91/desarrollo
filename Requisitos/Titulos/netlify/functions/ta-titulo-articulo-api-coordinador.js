/*
  Nombre completo: ta-titulo-articulo-api-coordinador.js
  Ruta o ubicación: /Requisitos/Titulos/netlify/functions/ta-titulo-articulo-api-coordinador.js
  Función o funciones:
  - Atender acciones del coordinador desde Netlify si se fuerza el modo functions.
  - Leer coordinadores con estructura real carreras/carrerasAsignadas.
  - Revisar documentos de la colección titulos con estructura limpia.
*/

import {
  COLLECTIONS,
  DECISIONES_COORDINADOR,
  ESTADOS,
  badRequest,
  cleanString,
  getAdminDb,
  getPeriodoActivo,
  handleOptions,
  normalizeText,
  normalizarEstadoTitulo,
  nowIso,
  ok,
  parseBody,
  periodoEquivalente,
  serverError,
  validarMetodoPost
} from "./ta-titulo-articulo-api-security.js";

const MAX_INTENTOS = 2;

function carreraDesdeEntrada(item) {
  if (typeof item === "string") return { codigoCarrera: "", nombreCarrera: cleanString(item) };
  return {
    codigoCarrera: cleanString(item?.codigoCarrera || item?.CodigoCarrera || item?.id || ""),
    nombreCarrera: cleanString(item?.nombreCarrera || item?.NombreCarrera || item?.nombre || item?.carrera || "")
  };
}

function carrerasCoordinador(data = {}) {
  const directas = Array.isArray(data.carreras) ? data.carreras : [];
  const asignadas = Array.isArray(data.carrerasAsignadas) ? data.carrerasAsignadas : [];
  const mapa = new Map();
  [...directas, ...asignadas].forEach((item) => {
    const carrera = carreraDesdeEntrada(item);
    const key = cleanString(carrera.codigoCarrera) || normalizeText(carrera.nombreCarrera);
    if (key) mapa.set(key, carrera);
  });
  return Array.from(mapa.values());
}

function limpiarCoordinador(id, data = {}) {
  const carrerasAsignadas = carrerasCoordinador(data);
  return {
    id,
    nombre: cleanString(data.nombre || data.Nombres || id),
    activo: data.activo !== false,
    carreras: carrerasAsignadas.map((item) => item.nombreCarrera).filter(Boolean),
    carrerasAsignadas
  };
}

function titulosEnvio(data = {}) {
  const fuente = Array.isArray(data.titulosEnviados)
    ? data.titulosEnviados
    : (Array.isArray(data.propuestas) ? data.propuestas.map((item) => ({ numero: item.numero, titulo: item.titulo || item.tituloFinal, preferido: item.preferido })) : []);
  return fuente.map((item, index) => ({
    numero: Number(item.numero || index + 1),
    titulo: cleanString(item.titulo || item.tituloFinal || item.texto || ""),
    preferido: Boolean(item.preferido)
  })).filter((item) => item.numero && item.titulo).slice(0, 3);
}

function envioParaCoordinador(id, data = {}) {
  const estado = normalizarEstadoTitulo(data.estado);
  const intentosUsados = Number(data.intentosUsados || data.intento || 0);
  const maxIntentos = Number(data.maxIntentos || MAX_INTENTOS);
  return {
    envioId: cleanString(data.envioId || data.docId || id),
    docId: cleanString(data.docId || data.envioId || id),
    cedula: cleanString(data.cedula || data.numeroIdentificacion),
    nombres: cleanString(data.nombres || data.Nombres),
    carrera: cleanString(data.carrera || data.nombreCarrera),
    codigoCarrera: cleanString(data.codigoCarrera),
    periodoId: cleanString(data.periodoId),
    periodoLabel: cleanString(data.periodoLabel),
    estado,
    enviadoEn: cleanString(data.enviadoEn || data.fechaEnvio),
    actualizadoEn: cleanString(data.actualizadoEn),
    coordinadorId: cleanString(data.coordinadorId),
    coordinadorNombre: cleanString(data.coordinadorNombre),
    tituloPreferidoNumero: Number(data.tituloPreferidoNumero || data.propuestaPreferidaNumero || 0),
    tituloElegidoNumero: data.tituloElegidoNumero || "",
    tituloElegidoTexto: cleanString(data.tituloElegidoTexto || data.tituloElegido || ""),
    tituloCorregidoCoordinador: cleanString(data.tituloCorregidoCoordinador || data.tituloCorregido || ""),
    observacionCoordinador: cleanString(data.observacionCoordinador || data.observacion || ""),
    intentosUsados,
    maxIntentos,
    reenvioDisponible: estado === ESTADOS.devuelto && intentosUsados < maxIntentos,
    titulosEnviados: titulosEnvio(data),
    propuestas: titulosEnvio(data).map((item) => ({ numero: item.numero, preferido: item.preferido, tituloFinal: item.titulo, titulo: item.titulo }))
  };
}

async function obtenerCoordinador(db, coordinadorId) {
  const id = cleanString(coordinadorId);
  if (!id) return null;
  const snap = await db.collection(COLLECTIONS.coordinadores).doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  if (data.activo === false) return null;
  return limpiarCoordinador(snap.id, data);
}

function coordinadorPuedeVerEnvio(coordinador, envio) {
  const carreras = coordinador?.carrerasAsignadas || [];
  if (!carreras.length) return true;
  const codigoEnvio = cleanString(envio.codigoCarrera);
  const nombreEnvio = normalizeText(envio.carrera);
  return carreras.some((carrera) => {
    const codigo = cleanString(carrera.codigoCarrera);
    const nombre = normalizeText(carrera.nombreCarrera);
    return Boolean((codigo && codigo === codigoEnvio) || (nombre && nombre === nombreEnvio));
  });
}

async function listarCoordinadores(db) {
  const snap = await db.collection(COLLECTIONS.coordinadores).get();
  const coordinadores = snap.docs.map((doc) => limpiarCoordinador(doc.id, doc.data() || {})).filter((item) => item.activo !== false).sort((a, b) => a.nombre.localeCompare(b.nombre));
  return ok({ coordinadores });
}

async function cargarEstudiantes(db, payload) {
  const coordinador = await obtenerCoordinador(db, payload.coordinadorId);
  if (!coordinador) return badRequest("Seleccione un coordinador válido.");
  const periodoActivo = await getPeriodoActivo(db);
  if (!periodoActivo) return badRequest("No existe un período activo configurado.");
  const snap = await db.collection(COLLECTIONS.envios).get();
  const estudiantes = snap.docs
    .map((doc) => envioParaCoordinador(doc.id, doc.data() || {}))
    .filter((envio) => periodoEquivalente(envio.periodoId || envio.periodoLabel, periodoActivo.id))
    .filter((envio) => envio.estado !== ESTADOS.sinEnvio)
    .filter((envio) => coordinadorPuedeVerEnvio(coordinador, envio));
  return ok({ coordinador, periodoActivo, estudiantes });
}

async function iniciarRevision(db, payload) {
  const envioId = cleanString(payload.envioId);
  const coordinador = await obtenerCoordinador(db, payload.coordinadorId);
  if (!envioId) return badRequest("No se recibió el envío a revisar.");
  if (!coordinador) return badRequest("Seleccione un coordinador válido.");
  const ref = db.collection(COLLECTIONS.envios).doc(envioId);
  const snap = await ref.get();
  if (!snap.exists) return badRequest("No se encontró el envío seleccionado.");
  const envio = envioParaCoordinador(snap.id, snap.data() || {});
  if (envio.estado === ESTADOS.enviado) {
    const fecha = nowIso();
    await ref.set({ estado: ESTADOS.enRevision, revisionIniciadaEn: fecha, coordinadorId: coordinador.id, coordinadorNombre: cleanString(coordinador.nombre), actualizadoEn: fecha }, { merge: true });
    await db.collection(COLLECTIONS.historial).add({ tipo: "INICIO_REVISION", docId: envioId, envioId, cedula: envio.cedula, periodoId: envio.periodoId, estado: ESTADOS.enRevision, coordinadorId: coordinador.id, coordinadorNombre: cleanString(coordinador.nombre), creadoEn: fecha });
  }
  return ok({ mensaje: "Revisión iniciada." });
}

async function guardarRevision(db, payload) {
  const envioId = cleanString(payload.envioId);
  const coordinador = await obtenerCoordinador(db, payload.coordinadorId);
  const estado = normalizarEstadoTitulo(payload.estado);
  const tituloElegidoNumero = Number(payload.tituloElegidoNumero);
  const tituloCorregidoCoordinador = cleanString(payload.tituloCorregidoCoordinador || payload.tituloCorregido || "");
  const observacionCoordinador = cleanString(payload.observacionCoordinador || payload.observacion || "");
  if (!envioId) return badRequest("No se recibió el envío a revisar.");
  if (!coordinador) return badRequest("Seleccione un coordinador válido.");
  if (!DECISIONES_COORDINADOR.includes(estado)) return badRequest("Seleccione una decisión válida.");
  if (![1, 2, 3].includes(tituloElegidoNumero)) return badRequest("Seleccione uno de los 3 títulos.");
  if (estado === ESTADOS.devuelto && !observacionCoordinador) return badRequest("La observación es obligatoria cuando se devuelve al estudiante.");
  if (estado === ESTADOS.aprobadoConCorrecciones && !tituloCorregidoCoordinador) return badRequest("Debe escribir el título corregido.");

  const ref = db.collection(COLLECTIONS.envios).doc(envioId);
  const snap = await ref.get();
  if (!snap.exists) return badRequest("No se encontró el envío seleccionado.");
  const envio = envioParaCoordinador(snap.id, snap.data() || {});
  const elegido = envio.titulosEnviados.find((item) => Number(item.numero) === tituloElegidoNumero);
  if (!elegido) return badRequest("No se encontró el título elegido.");
  const fecha = nowIso();
  const revision = {
    estado,
    tituloElegidoNumero,
    tituloElegidoTexto: cleanString(elegido.titulo),
    tituloCorregidoCoordinador,
    observacionCoordinador,
    coordinadorId: coordinador.id,
    coordinadorNombre: cleanString(coordinador.nombre),
    revisadoEn: fecha,
    actualizadoEn: fecha,
    reenvioDisponible: estado === ESTADOS.devuelto && Number(envio.intentosUsados || 0) < Number(envio.maxIntentos || MAX_INTENTOS)
  };
  await ref.set(revision, { merge: true });
  await db.collection(COLLECTIONS.historial).add({ tipo: "REVISION_COORDINADOR", docId: envioId, envioId, cedula: envio.cedula, periodoId: envio.periodoId, periodoLabel: envio.periodoLabel, intentosUsados: Number(envio.intentosUsados || 1), ...revision, creadoEn: fecha });
  return ok({ revision, mensaje: "Revisión guardada correctamente." });
}

export async function handler(event) {
  const options = handleOptions(event);
  if (options) return options;
  try {
    validarMetodoPost(event);
    const { action, payload } = parseBody(event);
    const db = getAdminDb();
    if (action === "listarCoordinadores") return await listarCoordinadores(db);
    if (action === "cargarEstudiantes") return await cargarEstudiantes(db, payload);
    if (action === "iniciarRevision") return await iniciarRevision(db, payload);
    if (action === "guardarRevision") return await guardarRevision(db, payload);
    return badRequest("Acción de coordinador no reconocida.");
  } catch (error) {
    return serverError(error);
  }
}
