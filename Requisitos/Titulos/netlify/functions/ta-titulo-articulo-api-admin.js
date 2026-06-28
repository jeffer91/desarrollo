/*
  Nombre completo: ta-titulo-articulo-api-admin.js
  Ruta o ubicación: /Requisitos/Titulos/netlify/functions/ta-titulo-articulo-api-admin.js
  Función o funciones:
  - Atender acciones administrativas desde Netlify si se fuerza el modo functions.
  - Activar período, crear coordinadores, asignar carreras y generar resumen general.
  - Alinear el resumen con las colecciones reales y el esquema limpio de titulos.
*/

import {
  COLLECTIONS,
  DOCUMENTS,
  DEFAULT_PERIODO_ACTIVO,
  ESTADOS,
  badRequest,
  cleanString,
  estudiantePertenecePeriodo,
  getAdminDb,
  getPeriodoActivo,
  handleOptions,
  normalizeText,
  normalizarEstadoTitulo,
  normalizarPeriodoId,
  nowIso,
  ok,
  onlyDigits,
  parseBody,
  periodoEquivalente,
  requireAdminToken,
  serverError,
  unauthorized,
  validarMetodoPost
} from "./ta-titulo-articulo-api-security.js";

const MAX_INTENTOS = 2;

function crearIdCoordinador(nombre) {
  return cleanString(nombre).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || `coord_${Date.now()}`;
}

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

function normalizarEnvio(id, data = {}) {
  const estado = normalizarEstadoTitulo(data.estado);
  const intentosUsados = Number(data.intentosUsados || data.intento || 0);
  const maxIntentos = Number(data.maxIntentos || MAX_INTENTOS);
  return {
    ...data,
    id,
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
    titulosEnviados: titulosEnvio(data)
  };
}

function contarPorEstado(envios) {
  return envios.reduce((acc, envio) => {
    const estado = normalizarEstadoTitulo(envio.estado || ESTADOS.sinEnvio);
    acc[estado] = (acc[estado] || 0) + 1;
    return acc;
  }, {});
}

function carrerasDesdeEstudiantes(estudiantes, coordinadores) {
  const mapaCodigo = new Map();
  const mapaNombre = new Map();
  coordinadores.forEach((coord) => {
    (coord.carrerasAsignadas || []).forEach((carrera) => {
      if (cleanString(carrera.codigoCarrera)) mapaCodigo.set(cleanString(carrera.codigoCarrera), { id: coord.id, nombre: coord.nombre });
      if (cleanString(carrera.nombreCarrera)) mapaNombre.set(normalizeText(carrera.nombreCarrera), { id: coord.id, nombre: coord.nombre });
    });
  });
  const carreras = new Map();
  estudiantes.forEach((est) => {
    const codigo = cleanString(est.CodigoCarrera || est.codigoCarrera);
    const nombre = cleanString(est.NombreCarrera || est.nombreCarrera || est.carrera);
    if (!codigo && !nombre) return;
    const key = codigo || normalizeText(nombre);
    if (!carreras.has(key)) {
      const coord = mapaCodigo.get(codigo) || mapaNombre.get(normalizeText(nombre)) || null;
      carreras.set(key, { codigoCarrera: codigo, nombreCarrera: nombre, totalEstudiantes: 0, coordinadorId: coord?.id || "", coordinadorNombre: coord?.nombre || "" });
    }
    carreras.get(key).totalEstudiantes += 1;
  });
  return Array.from(carreras.values()).sort((a, b) => a.nombreCarrera.localeCompare(b.nombreCarrera));
}

function estudianteResumen(est, enviosPorCedula) {
  const cedula = onlyDigits(est.numeroIdentificacion || est.NumeroIdentificacion || est.cedula || est.Cedula || est.Identificacion || est.identificacion || est.id);
  const envio = enviosPorCedula.get(cedula) || null;
  return {
    cedula,
    nombres: cleanString(est.Nombres || est.nombres || est.Nombre || est.nombre),
    carrera: cleanString(est.NombreCarrera || est.nombreCarrera || est.carrera),
    codigoCarrera: cleanString(est.CodigoCarrera || est.codigoCarrera),
    periodoId: cleanString(est.periodoId || est.ultimoPeriodoId || est.UltimoPeriodoId || est.Periodo),
    periodoNormalizado: normalizarPeriodoId(est.periodoId || est.ultimoPeriodoId || est.UltimoPeriodoId || est.Periodo),
    telegramUser: cleanString(envio?.telegramUser || est.telegramUser || est.telegramUsuario),
    envioId: envio?.envioId || envio?.docId || "",
    docId: envio?.docId || envio?.envioId || "",
    estado: envio?.estado || ESTADOS.sinEnvio,
    enviadoEn: envio?.enviadoEn || "",
    coordinadorId: envio?.coordinadorId || "",
    coordinadorNombre: envio?.coordinadorNombre || "",
    tituloPreferidoNumero: envio?.tituloPreferidoNumero || "",
    tituloElegidoTexto: envio?.tituloElegidoTexto || "",
    tituloCorregidoCoordinador: envio?.tituloCorregidoCoordinador || "",
    intentosUsados: envio?.intentosUsados || 0
  };
}

function normalizarPeriodoDoc(doc) {
  const data = doc.data() || {};
  const id = cleanString(data.id || data.periodoId || doc.id);
  return { ...data, id, idNormalizado: normalizarPeriodoId([id, data.label, data.nombre].join(" ")), label: cleanString(data.label || data.nombre || data.periodoLabel || id) };
}

function asegurarPeriodoDefault(periodos) {
  const existe = periodos.some((periodo) => periodoEquivalente(periodo.id, DEFAULT_PERIODO_ACTIVO.id) || periodoEquivalente(periodo.label, DEFAULT_PERIODO_ACTIVO.label));
  return existe ? periodos : [{ ...DEFAULT_PERIODO_ACTIVO }, ...periodos];
}

async function listarResumen(db) {
  const periodoActivo = await getPeriodoActivo(db);
  const periodosSnap = await db.collection(COLLECTIONS.periodos).get();
  const periodos = asegurarPeriodoDefault(periodosSnap.docs.map(normalizarPeriodoDoc).sort((a, b) => cleanString(b.label || b.id).localeCompare(cleanString(a.label || a.id))));
  const coordinadoresSnap = await db.collection(COLLECTIONS.coordinadores).get();
  const coordinadores = coordinadoresSnap.docs.map((doc) => limpiarCoordinador(doc.id, doc.data() || {})).sort((a, b) => cleanString(a.nombre).localeCompare(cleanString(b.nombre)));

  let estudiantes = [];
  let envios = [];
  if (periodoActivo?.id) {
    const estudiantesSnap = await db.collection(COLLECTIONS.estudiantes).get();
    estudiantes = estudiantesSnap.docs.map((doc) => ({ ...(doc.data() || {}), id: doc.id })).filter((estudiante) => estudiantePertenecePeriodo(estudiante, periodoActivo.id));
    const enviosSnap = await db.collection(COLLECTIONS.envios).get();
    envios = enviosSnap.docs.map((doc) => normalizarEnvio(doc.id, doc.data() || {})).filter((envio) => periodoEquivalente(envio.periodoId || envio.periodoLabel, periodoActivo.id));
  }

  const enviosPorCedula = new Map(envios.map((envio) => [cleanString(envio.cedula), envio]));
  const carreras = carrerasDesdeEstudiantes(estudiantes, coordinadores);
  const codigosConCoordinador = new Set(carreras.filter((c) => c.coordinadorId && c.codigoCarrera).map((c) => c.codigoCarrera));
  const nombresConCoordinador = new Set(carreras.filter((c) => c.coordinadorId && c.nombreCarrera).map((c) => normalizeText(c.nombreCarrera)));
  const estudiantesSinCoordinador = estudiantes.filter((est) => {
    const codigo = cleanString(est.CodigoCarrera || est.codigoCarrera);
    const nombre = normalizeText(est.NombreCarrera || est.nombreCarrera || est.carrera);
    return !(codigo && codigosConCoordinador.has(codigo)) && !(nombre && nombresConCoordinador.has(nombre));
  }).length;

  return ok({
    periodoActivo,
    periodos,
    coordinadores,
    carreras,
    estudiantes: estudiantes.map((est) => estudianteResumen(est, enviosPorCedula)),
    envios,
    estadisticas: { totalEstudiantes: estudiantes.length, totalEnvios: envios.filter((envio) => envio.estado !== ESTADOS.sinEnvio).length, porEstado: contarPorEstado(envios), sinCoordinador: estudiantesSinCoordinador }
  });
}

async function activarPeriodo(db, payload) {
  const periodoId = cleanString(payload.periodoId);
  if (!periodoId) return badRequest("Seleccione un período válido.");
  const periodoSnap = await db.collection(COLLECTIONS.periodos).doc(periodoId).get();
  const periodo = periodoSnap.exists ? periodoSnap.data() : { label: periodoId };
  await db.collection(COLLECTIONS.config).doc(DOCUMENTS.appConfig).set({ periodoActivoId: periodoId, periodoActivoIdNormalizado: normalizarPeriodoId([periodoId, periodo.label, periodo.nombre, periodo.periodoId].join(" ")), periodoActivoLabel: cleanString(periodo.label || periodo.nombre || periodoId), actualizadoEn: nowIso() }, { merge: true });
  return ok({ periodoActivoId: periodoId, mensaje: "Período activado correctamente." });
}

async function guardarCoordinador(db, payload) {
  const nombre = cleanString(payload.nombre);
  if (!nombre) return badRequest("Ingrese el nombre del coordinador.");
  const id = crearIdCoordinador(nombre);
  const fecha = nowIso();
  await db.collection(COLLECTIONS.coordinadores).doc(id).set({ _docId: id, id, nombre, activo: true, carreras: [], carrerasAsignadas: [], origen: "admin_titulos", actualizadoEn: fecha, creadoEn: fecha }, { merge: true });
  return ok({ coordinador: { id, nombre, activo: true }, mensaje: "Coordinador guardado correctamente." });
}

async function asignarCoordinadorCarrera(db, payload) {
  const coordinadorId = cleanString(payload.coordinadorId);
  const codigoCarrera = cleanString(payload.codigoCarrera);
  const nombreCarrera = cleanString(payload.nombreCarrera);
  if (!coordinadorId || (!codigoCarrera && !nombreCarrera)) return badRequest("Complete coordinador y carrera.");
  const coordinadoresSnap = await db.collection(COLLECTIONS.coordinadores).get();
  const batch = db.batch();
  coordinadoresSnap.docs.forEach((doc) => {
    const actuales = carrerasCoordinador(doc.data() || {}).filter((carrera) => {
      const mismoCodigo = codigoCarrera && cleanString(carrera.codigoCarrera) === codigoCarrera;
      const mismoNombre = nombreCarrera && normalizeText(carrera.nombreCarrera) === normalizeText(nombreCarrera);
      return !mismoCodigo && !mismoNombre;
    });
    if (doc.id === coordinadorId) actuales.push({ codigoCarrera, nombreCarrera });
    batch.set(doc.ref, { carreras: actuales.map((carrera) => carrera.nombreCarrera).filter(Boolean), carrerasAsignadas: actuales, actualizadoEn: nowIso() }, { merge: true });
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
