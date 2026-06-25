/*
  Nombre completo: ta-titulo-articulo-api-coordinador.js
  Ruta o ubicación: /Requisitos/Titulos/netlify/functions/ta-titulo-articulo-api-coordinador.js
  Función o funciones:
  - Atender acciones públicas del coordinador desde Netlify.
  - Listar coordinadores activos, cargar envíos asignados y guardar revisiones.
  - Unir envío + datos mínimos del estudiante para no duplicar datos en el envío.
  - Conectar envíos por equivalencia de período para Primer semestre de 2026.
*/

import {
  COLLECTIONS,
  DECISIONES_COORDINADOR,
  ESTADOS,
  badRequest,
  buscarEstudiantePorCedula,
  cleanString,
  getAdminDb,
  getPeriodoActivo,
  handleOptions,
  nowIso,
  ok,
  parseBody,
  periodoEquivalente,
  serverError,
  validarMetodoPost
} from "./ta-titulo-articulo-api-security.js";

function limpiarCoordinador(id, data) {
  return {
    id,
    nombre: cleanString(data.nombre),
    carrerasAsignadas: Array.isArray(data.carrerasAsignadas) ? data.carrerasAsignadas : []
  };
}

async function limpiarEnvio(db, id, data) {
  const estudiante = await buscarEstudiantePorCedula(db, data.cedula);
  const codigoCarrera = cleanString(data.codigoCarrera || estudiante?.CodigoCarrera || estudiante?.codigoCarrera);
  const carrera = cleanString(data.carrera || estudiante?.NombreCarrera || estudiante?.nombreCarrera || estudiante?.carrera);
  const nombres = cleanString(data.nombres || estudiante?.Nombres || estudiante?.nombres);

  return {
    envioId: id,
    cedula: cleanString(data.cedula),
    nombres,
    carrera,
    codigoCarrera,
    periodoId: cleanString(data.periodoId || estudiante?.periodoId || estudiante?.ultimoPeriodoId),
    estado: cleanString(data.estado),
    enviadoEn: cleanString(data.enviadoEn),
    telegramUser: cleanString(data.telegramUser || estudiante?.telegramUser || estudiante?.telegramUsuario),
    tituloPreferidoNumero: Number(data.tituloPreferidoNumero || 0),
    propuestas: Array.isArray(data.propuestas) ? data.propuestas.map((p) => ({
      numero: Number(p.numero),
      preferido: Boolean(p.preferido),
      tituloFinal: cleanString(p.tituloFinal),
      coherencia: p.coherencia || null
    })) : []
  };
}

async function obtenerCoordinador(db, coordinadorId) {
  const id = cleanString(coordinadorId);
  if (!id) return null;
  const snap = await db.collection(COLLECTIONS.coordinadores).doc(id).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  if (data.activo === false) return null;
  return { ...data, id: snap.id };
}

async function listarCoordinadores(db) {
  const snap = await db.collection(COLLECTIONS.coordinadores).where("activo", "==", true).get();
  const coordinadores = snap.docs.map((doc) => limpiarCoordinador(doc.id, doc.data())).sort((a, b) => a.nombre.localeCompare(b.nombre));
  return ok({ coordinadores });
}

async function cargarEstudiantes(db, payload) {
  const coordinador = await obtenerCoordinador(db, payload.coordinadorId);
  if (!coordinador) return badRequest("Seleccione un coordinador válido.");

  const periodoActivo = await getPeriodoActivo(db);
  if (!periodoActivo) return badRequest("No existe un período activo configurado.");

  const carrerasAsignadas = Array.isArray(coordinador.carrerasAsignadas) ? coordinador.carrerasAsignadas : [];
  const codigos = carrerasAsignadas.map((c) => cleanString(c.codigoCarrera)).filter(Boolean);

  const snap = await db.collection(COLLECTIONS.envios).get();
  const docsPeriodo = snap.docs.filter((doc) => periodoEquivalente(doc.data()?.periodoId || doc.data()?.periodoLabel, periodoActivo.id));
  const envios = await Promise.all(docsPeriodo.map((doc) => limpiarEnvio(db, doc.id, doc.data())));
  const estudiantes = envios.filter((envio) => codigos.includes(envio.codigoCarrera));

  return ok({ coordinador: limpiarCoordinador(coordinador.id, coordinador), periodoActivo, estudiantes });
}

async function iniciarRevision(db, payload) {
  const envioId = cleanString(payload.envioId);
  const coordinador = await obtenerCoordinador(db, payload.coordinadorId);
  if (!envioId) return badRequest("No se recibió el envío a revisar.");
  if (!coordinador) return badRequest("Seleccione un coordinador válido.");

  const ref = db.collection(COLLECTIONS.envios).doc(envioId);
  const snap = await ref.get();
  if (!snap.exists) return badRequest("No se encontró el envío seleccionado.");

  const envio = snap.data();
  if (envio.estado === ESTADOS.enviado) {
    await ref.set({ estado: ESTADOS.enRevision, revisionIniciadaEn: nowIso(), coordinadorId: coordinador.id, coordinadorNombre: cleanString(coordinador.nombre), actualizadoEn: nowIso() }, { merge: true });
  }

  return ok({ mensaje: "Revisión iniciada." });
}

async function guardarRevision(db, payload) {
  const envioId = cleanString(payload.envioId);
  const coordinador = await obtenerCoordinador(db, payload.coordinadorId);
  const estado = cleanString(payload.estado);
  const tituloElegidoNumero = Number(payload.tituloElegidoNumero);
  const tituloCorregido = cleanString(payload.tituloCorregido);
  const observacion = cleanString(payload.observacion);

  if (!envioId) return badRequest("No se recibió el envío a revisar.");
  if (!coordinador) return badRequest("Seleccione un coordinador válido.");
  if (!DECISIONES_COORDINADOR.includes(estado)) return badRequest("Seleccione una decisión válida.");
  if (![1, 2, 3].includes(tituloElegidoNumero)) return badRequest("Seleccione uno de los 3 títulos.");
  if (estado === ESTADOS.devuelto && !observacion) return badRequest("La observación es obligatoria cuando se devuelve al estudiante.");
  if (estado === ESTADOS.aprobadoConCorrecciones && !tituloCorregido) return badRequest("Debe escribir el título corregido.");

  const ref = db.collection(COLLECTIONS.envios).doc(envioId);
  const snap = await ref.get();
  if (!snap.exists) return badRequest("No se encontró el envío seleccionado.");

  const envio = snap.data();
  const propuestaElegida = Array.isArray(envio.propuestas) ? envio.propuestas.find((p) => Number(p.numero) === tituloElegidoNumero) : null;
  if (!propuestaElegida) return badRequest("No se encontró el título elegido.");

  const fecha = nowIso();
  const revision = {
    estado,
    tituloElegidoNumero,
    tituloElegidoTexto: cleanString(propuestaElegida.tituloFinal),
    tituloCorregido,
    observacion,
    coordinadorId: coordinador.id,
    coordinadorNombre: cleanString(coordinador.nombre),
    revisadoEn: fecha,
    actualizadoEn: fecha,
    notificacionPendiente: true
  };

  await ref.set(revision, { merge: true });
  await db.collection(COLLECTIONS.historial).add({ tipo: "REVISION_COORDINADOR", envioId, cedula: cleanString(envio.cedula), periodoId: cleanString(envio.periodoId), intento: Number(envio.intento || 1), ...revision, creadoEn: fecha });

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
