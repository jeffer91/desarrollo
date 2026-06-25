/*
  Nombre completo: ta-titulo-articulo-api-admin.js
  Ruta o ubicación: /Requisitos/Titulos/netlify/functions/ta-titulo-articulo-api-admin.js
  Función o funciones:
  - Atender acciones administrativas desde Electron/local.
  - Activar período, crear coordinadores, asignar carreras y generar resumen general.
  - Validar períodos normalizados desde configuración administrativa.
  - Conectar envíos y estudiantes por equivalencia de período, no solo por texto exacto.
*/

import {
  COLLECTIONS,
  DOCUMENTS,
  badRequest,
  cleanString,
  estudiantePertenecePeriodo,
  getAdminDb,
  getPeriodoActivo,
  handleOptions,
  normalizarPeriodoId,
  nowIso,
  ok,
  parseBody,
  periodoEquivalente,
  requireAdminToken,
  serverError,
  unauthorized,
  validarMetodoPost
} from "./ta-titulo-articulo-api-security.js";

function crearIdCoordinador(nombre) {
  return cleanString(nombre).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || `coord_${Date.now()}`;
}

function contarPorEstado(envios) {
  return envios.reduce((acc, envio) => {
    const estado = cleanString(envio.estado || "SIN_ENVIO");
    acc[estado] = (acc[estado] || 0) + 1;
    return acc;
  }, {});
}

function carrerasDesdeEstudiantes(estudiantes, coordinadores) {
  const mapaCoordinador = new Map();
  coordinadores.forEach((coord) => {
    (coord.carrerasAsignadas || []).forEach((carrera) => {
      mapaCoordinador.set(cleanString(carrera.codigoCarrera), { id: coord.id, nombre: coord.nombre });
    });
  });

  const carreras = new Map();
  estudiantes.forEach((est) => {
    const codigo = cleanString(est.CodigoCarrera || est.codigoCarrera);
    const nombre = cleanString(est.NombreCarrera || est.nombreCarrera || est.carrera);
    if (!codigo || !nombre) return;
    if (!carreras.has(codigo)) {
      const coord = mapaCoordinador.get(codigo) || null;
      carreras.set(codigo, { codigoCarrera: codigo, nombreCarrera: nombre, totalEstudiantes: 0, coordinadorId: coord?.id || "", coordinadorNombre: coord?.nombre || "" });
    }
    carreras.get(codigo).totalEstudiantes += 1;
  });

  return Array.from(carreras.values()).sort((a, b) => a.nombreCarrera.localeCompare(b.nombreCarrera));
}

function estudianteResumen(est, enviosPorCedula) {
  const cedula = cleanString(est.numeroIdentificacion || est.cedula || est.id);
  const envio = enviosPorCedula.get(cedula) || null;

  return {
    cedula,
    nombres: cleanString(est.Nombres || est.nombres),
    carrera: cleanString(est.NombreCarrera || est.nombreCarrera || est.carrera),
    codigoCarrera: cleanString(est.CodigoCarrera || est.codigoCarrera),
    periodoId: cleanString(est.periodoId || est.ultimoPeriodoId || est.UltimoPeriodoId),
    periodoNormalizado: normalizarPeriodoId(est.periodoId || est.ultimoPeriodoId || est.UltimoPeriodoId),
    telegramUser: cleanString(est.telegramUser || est.telegramUsuario),
    envioId: envio?.envioId || envio?.id || "",
    estado: envio?.estado || "SIN_ENVIO",
    enviadoEn: envio?.enviadoEn || "",
    coordinadorId: envio?.coordinadorId || "",
    coordinadorNombre: envio?.coordinadorNombre || ""
  };
}

async function listarResumen(db) {
  const periodoActivo = await getPeriodoActivo(db);
  const periodosSnap = await db.collection(COLLECTIONS.periodos).get();
  const periodos = periodosSnap.docs
    .map((doc) => {
      const data = doc.data() || {};
      return { ...data, id: doc.id, idNormalizado: normalizarPeriodoId([doc.id, data.id, data.periodoId, data.label, data.nombre].join(" ")) };
    })
    .sort((a, b) => cleanString(a.label || a.nombre || a.id).localeCompare(cleanString(b.label || b.nombre || b.id)));

  const coordinadoresSnap = await db.collection(COLLECTIONS.coordinadores).get();
  const coordinadores = coordinadoresSnap.docs
    .map((doc) => ({ ...(doc.data() || {}), id: doc.id }))
    .sort((a, b) => cleanString(a.nombre).localeCompare(cleanString(b.nombre)));

  let estudiantes = [];
  let envios = [];

  if (periodoActivo?.id) {
    const estudiantesSnap = await db.collection(COLLECTIONS.estudiantes).get();
    estudiantes = estudiantesSnap.docs
      .map((doc) => ({ ...(doc.data() || {}), id: doc.id }))
      .filter((estudiante) => estudiantePertenecePeriodo(estudiante, periodoActivo.id));

    const enviosSnap = await db.collection(COLLECTIONS.envios).get();
    envios = enviosSnap.docs
      .map((doc) => ({ ...(doc.data() || {}), id: doc.id }))
      .filter((envio) => periodoEquivalente(envio.periodoId || envio.periodoLabel, periodoActivo.id));
  }

  const enviosPorCedula = new Map(envios.map((envio) => [cleanString(envio.cedula), envio]));
  const carreras = carrerasDesdeEstudiantes(estudiantes, coordinadores);
  const codigosConCoordinador = new Set(carreras.filter((c) => c.coordinadorId).map((c) => c.codigoCarrera));
  const estudiantesSinCoordinador = estudiantes.filter((est) => !codigosConCoordinador.has(cleanString(est.CodigoCarrera || est.codigoCarrera))).length;

  return ok({
    periodoActivo,
    periodos,
    coordinadores,
    carreras,
    estudiantes: estudiantes.map((est) => estudianteResumen(est, enviosPorCedula)),
    envios,
    estadisticas: {
      totalEstudiantes: estudiantes.length,
      totalEnvios: envios.length,
      porEstado: contarPorEstado(envios),
      sinCoordinador: estudiantesSinCoordinador
    }
  });
}

async function activarPeriodo(db, payload) {
  const periodoId = cleanString(payload.periodoId);
  if (!periodoId) return badRequest("Seleccione un período válido.");

  const periodoSnap = await db.collection(COLLECTIONS.periodos).doc(periodoId).get();
  const periodo = periodoSnap.exists ? periodoSnap.data() : { label: periodoId };

  await db.collection(COLLECTIONS.config).doc(DOCUMENTS.appConfig).set({
    periodoActivoId: periodoId,
    periodoActivoIdNormalizado: normalizarPeriodoId([periodoId, periodo.label, periodo.nombre, periodo.periodoId].join(" ")),
    periodoActivoLabel: cleanString(periodo.label || periodo.nombre || periodoId),
    actualizadoEn: nowIso()
  }, { merge: true });

  return ok({ periodoActivoId: periodoId, mensaje: "Período activado correctamente." });
}

async function guardarCoordinador(db, payload) {
  const nombre = cleanString(payload.nombre);
  if (!nombre) return badRequest("Ingrese el nombre del coordinador.");

  const id = crearIdCoordinador(nombre);
  await db.collection(COLLECTIONS.coordinadores).doc(id).set({ nombre, activo: true, carrerasAsignadas: [], actualizadoEn: nowIso(), creadoEn: nowIso() }, { merge: true });

  return ok({ coordinador: { id, nombre, activo: true }, mensaje: "Coordinador guardado correctamente." });
}

async function asignarCoordinadorCarrera(db, payload) {
  const coordinadorId = cleanString(payload.coordinadorId);
  const codigoCarrera = cleanString(payload.codigoCarrera);
  const nombreCarrera = cleanString(payload.nombreCarrera);

  if (!coordinadorId || !codigoCarrera || !nombreCarrera) return badRequest("Complete coordinador, código de carrera y nombre de carrera.");

  const coordinadoresSnap = await db.collection(COLLECTIONS.coordinadores).get();
  const batch = db.batch();

  coordinadoresSnap.docs.forEach((doc) => {
    const data = doc.data();
    const carreras = Array.isArray(data.carrerasAsignadas) ? data.carrerasAsignadas : [];
    const filtradas = carreras.filter((c) => cleanString(c.codigoCarrera) !== codigoCarrera);
    if (doc.id === coordinadorId) filtradas.push({ codigoCarrera, nombreCarrera });
    batch.set(doc.ref, { carrerasAsignadas: filtradas, actualizadoEn: nowIso() }, { merge: true });
  });

  await batch.commit();
  return ok({ mensaje: "Carrera asignada correctamente." });
}

export async function handler(event) {
  const options = handleOptions(event);
  if (options) return options;

  try {
    validarMetodoPost(event);
    requireAdminToken(event);
    const { action, payload } = parseBody(event);
    const db = getAdminDb();

    if (action === "listarResumen") return await listarResumen(db);
    if (action === "activarPeriodo") return await activarPeriodo(db, payload);
    if (action === "guardarCoordinador") return await guardarCoordinador(db, payload);
    if (action === "asignarCoordinadorCarrera") return await asignarCoordinadorCarrera(db, payload);

    return badRequest("Acción administrativa no reconocida.");
  } catch (error) {
    if (error.statusCode === 401) return unauthorized(error.message);
    return serverError(error);
  }
}
