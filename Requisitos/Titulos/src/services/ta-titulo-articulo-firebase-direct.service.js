/*
  Nombre completo: ta-titulo-articulo-firebase-direct.service.js
  Ruta o ubicación: /Requisitos/Titulos/src/services/ta-titulo-articulo-firebase-direct.service.js
  Función o funciones:
  - Conectar el módulo Títulos directamente con Firebase/Firestore desde el cliente.
  - Leer estudiantes, períodos y coordinadores sin depender de Netlify Functions.
  - Escribir únicamente datos propios del proceso de títulos: envíos, revisiones e historial.
  - Mantener el resto de la base institucional en modo solo lectura.
*/

import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";

import { obtenerFirestore, firebaseDisponible } from "../firebase/ta-titulo-articulo-firebase-client.js";
import {
  TA_TITULO_ARTICULO_COLLECTIONS as COLLECTIONS,
  TA_TITULO_ARTICULO_DOCUMENTS as DOCUMENTS,
  TA_TITULO_ARTICULO_ESTADOS as ESTADOS,
  TA_TITULO_ARTICULO_DECISIONES_COORDINADOR as DECISIONES_COORDINADOR
} from "../firebase/ta-titulo-articulo-collections.js";

const DEFAULT_PERIODO_ACTIVO = Object.freeze({
  id: "PRIMER_SEMESTRE_2026",
  idNormalizado: "2026_1",
  label: "Primer semestre de 2026"
});

const CAMPOS_CEDULA = [
  "numeroIdentificacion",
  "NumeroIdentificacion",
  "cedula",
  "Cedula",
  "Identificacion",
  "identificacion"
];

function db() {
  const firestore = obtenerFirestore();
  if (!firebaseDisponible() || !firestore) {
    throw new Error("Firebase no está configurado para el módulo de Títulos.");
  }
  return firestore;
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function onlyDigits(value) {
  return String(value ?? "").replace(/\D+/g, "").trim();
}

function normalizeText(value) {
  return clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function textoPeriodo(value) {
  return normalizeText(value).toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
}

function compactPeriodo(value) {
  return textoPeriodo(value).replace(/\s+/g, "");
}

function detectarPeriodoCanonico(value) {
  const texto = textoPeriodo(value);
  const compact = compactPeriodo(value);
  const yearMatch = texto.match(/\b(20\d{2})\b/);
  if (!yearMatch) return "";

  const year = yearMatch[1];
  const esPrimero =
    texto.includes("PRIMER") ||
    texto.includes("PRIMERO") ||
    texto.includes("1ER") ||
    texto.includes("SEMESTRE 1") ||
    texto.includes("1 SEMESTRE") ||
    texto.includes("SEMESTRE I") ||
    texto.includes("I SEMESTRE") ||
    compact === year ||
    compact === `${year}1` ||
    compact === `${year}I` ||
    compact === `1${year}` ||
    compact === `I${year}`;

  const esSegundo =
    texto.includes("SEGUNDO") ||
    texto.includes("2DO") ||
    texto.includes("SEMESTRE 2") ||
    texto.includes("2 SEMESTRE") ||
    texto.includes("SEMESTRE II") ||
    texto.includes("II SEMESTRE") ||
    compact === `${year}2` ||
    compact === `${year}II` ||
    compact === `2${year}` ||
    compact === `II${year}`;

  if (esSegundo) return `${year}_2`;
  if (esPrimero) return `${year}_1`;
  return "";
}

function normalizarPeriodoId(value) {
  const canonico = detectarPeriodoCanonico(value);
  if (canonico) return canonico;
  return normalizeText(value).toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").replace(/_+/g, "_");
}

function periodoEquivalente(a, b) {
  const pa = normalizarPeriodoId(a);
  const pb = normalizarPeriodoId(b);
  return Boolean(pa && pb && pa === pb);
}

function nowIso() {
  return new Date().toISOString();
}

function withId(snap) {
  return { ...(snap.data() || {}), id: snap.id };
}

function obtenerCedulaEstudiante(estudiante = {}) {
  return clean(estudiante.numeroIdentificacion || estudiante.NumeroIdentificacion || estudiante.cedula || estudiante.Cedula || estudiante.Identificacion || estudiante.identificacion || estudiante.id);
}

function obtenerPeriodoEstudiante(estudiante = {}) {
  return clean(estudiante.periodoId || estudiante.ultimoPeriodoId || estudiante.UltimoPeriodoId || estudiante.periodo || estudiante.Periodo || estudiante.PeriodoAcademico || estudiante.periodoAcademico || "");
}

function estudiantePertenecePeriodo(estudiante = {}, periodoId = "") {
  const valores = [
    estudiante.periodoId,
    estudiante.ultimoPeriodoId,
    estudiante.UltimoPeriodoId,
    estudiante.periodo,
    estudiante.Periodo,
    estudiante.PeriodoAcademico,
    estudiante.periodoAcademico
  ].map(clean).filter(Boolean);

  if (!valores.length) return true;
  return valores.some((value) => periodoEquivalente(value, periodoId));
}

function periodoDesdeSnap(snap) {
  const data = snap.exists() ? (snap.data() || {}) : {};
  const texto = [snap.id, data.id, data.periodoId, data.label, data.nombre, data.periodoLabel].map(clean).join(" ");
  return {
    ...data,
    id: snap.id,
    idNormalizado: normalizarPeriodoId(texto || snap.id),
    label: clean(data.label || data.nombre || data.periodoLabel || snap.id)
  };
}

async function listarPeriodosInterno(firestore) {
  const snap = await getDocs(collection(firestore, COLLECTIONS.periodos));
  const periodos = snap.docs
    .map(periodoDesdeSnap)
    .sort((a, b) => clean(a.label || a.nombre || a.id).localeCompare(clean(b.label || b.nombre || b.id)));

  const existeDefault = periodos.some((periodo) => periodoEquivalente(periodo.id, DEFAULT_PERIODO_ACTIVO.id) || periodoEquivalente(periodo.label, DEFAULT_PERIODO_ACTIVO.label));
  return existeDefault ? periodos : [{ ...DEFAULT_PERIODO_ACTIVO }, ...periodos];
}

async function getPeriodoActivo(firestore) {
  const configSnap = await getDoc(doc(firestore, COLLECTIONS.config, DOCUMENTS.appConfig));
  const config = configSnap.exists() ? (configSnap.data() || {}) : {};
  const periodoActivoId = clean(config.periodoActivoId || config.periodoActivo || config.activePeriodId);
  const periodos = await listarPeriodosInterno(firestore);

  if (periodoActivoId) {
    const encontrado = periodos.find((periodo) => periodo.id === periodoActivoId || periodoEquivalente(periodo.id, periodoActivoId) || periodoEquivalente(periodo.label, periodoActivoId));
    if (encontrado) return encontrado;
    return {
      id: periodoActivoId,
      idNormalizado: normalizarPeriodoId(periodoActivoId),
      label: clean(config.periodoActivoLabel || periodoActivoId)
    };
  }

  return periodos[0] || { ...DEFAULT_PERIODO_ACTIVO };
}

async function buscarEstudiantePorCedula(firestore, cedula) {
  const cedulaLimpia = onlyDigits(cedula);
  if (!cedulaLimpia) return null;

  const directo = await getDoc(doc(firestore, COLLECTIONS.estudiantes, cedulaLimpia));
  if (directo.exists()) return withId(directo);

  for (const campo of CAMPOS_CEDULA) {
    const snap = await getDocs(query(collection(firestore, COLLECTIONS.estudiantes), where(campo, "==", cedulaLimpia), limit(1)));
    if (!snap.empty) return withId(snap.docs[0]);
  }

  return null;
}

function estudiantePublico(estudiante, periodoLabel) {
  const cedula = obtenerCedulaEstudiante(estudiante);
  return {
    cedula,
    numeroIdentificacion: cedula,
    nombres: clean(estudiante.Nombres || estudiante.nombres || estudiante.Nombre || estudiante.nombre),
    carrera: clean(estudiante.NombreCarrera || estudiante.nombreCarrera || estudiante.carrera),
    codigoCarrera: clean(estudiante.CodigoCarrera || estudiante.codigoCarrera),
    periodoId: clean(estudiante.periodoId),
    ultimoPeriodoId: clean(estudiante.ultimoPeriodoId || estudiante.UltimoPeriodoId),
    periodoNormalizado: normalizarPeriodoId(obtenerPeriodoEstudiante(estudiante)),
    periodoLabel: clean(periodoLabel || estudiante.periodoId || estudiante.ultimoPeriodoId || estudiante.Periodo),
    telegramUser: clean(estudiante.telegramUser || estudiante.telegramUsuario),
    telegramUsuario: clean(estudiante.telegramUsuario || estudiante.telegramUser)
  };
}

function createEnvioId(periodoId, cedula) {
  return `${normalizarPeriodoId(periodoId)}_${onlyDigits(cedula)}`;
}

async function buscarEnvioEstudiante(firestore, periodoActivo, cedula) {
  const envioId = createEnvioId(periodoActivo.id, cedula);
  const directoRef = doc(firestore, COLLECTIONS.envios, envioId);
  const directoSnap = await getDoc(directoRef);

  if (directoSnap.exists()) return { ref: directoRef, id: directoSnap.id, data: directoSnap.data() || {}, exists: true };

  const snap = await getDocs(query(collection(firestore, COLLECTIONS.envios), where("cedula", "==", cedula)));
  const encontrado = snap.docs.find((item) => periodoEquivalente(item.data()?.periodoId || item.data()?.periodoLabel, periodoActivo.id));
  if (encontrado) return { ref: encontrado.ref, id: encontrado.id, data: encontrado.data() || {}, exists: true };

  return { ref: directoRef, id: envioId, data: null, exists: false };
}

function validarPropuestasBasicas(propuestas, tituloPreferidoNumero) {
  if (!Array.isArray(propuestas) || propuestas.length !== 3) return "Debe enviar exactamente 3 propuestas.";
  if (![1, 2, 3].includes(Number(tituloPreferidoNumero))) return "Debe seleccionar cuál de los 3 títulos prefiere.";

  const campos = ["temaGeneral", "lugarContexto", "problemaNecesidad", "grupoEstudio", "anioPeriodoDatos", "objetivoArticulo", "resultadoEsperado", "tituloFinal"];
  const titulos = [];

  for (let i = 0; i < propuestas.length; i += 1) {
    const numero = i + 1;
    const propuesta = propuestas[i] || {};
    for (const campo of campos) {
      if (!clean(propuesta[campo])) return `La propuesta ${numero} tiene incompleto el campo ${campo}.`;
    }
    const titulo = normalizeText(propuesta.tituloFinal);
    if (titulos.includes(titulo)) return "Los 3 títulos no pueden ser iguales.";
    titulos.push(titulo);
  }

  return "";
}

function limpiarPropuestas(propuestas, tituloPreferidoNumero) {
  const preferido = Number(tituloPreferidoNumero);
  return propuestas.map((propuesta, index) => {
    const numero = index + 1;
    return {
      numero,
      preferido: numero === preferido,
      temaGeneral: clean(propuesta.temaGeneral),
      lugarContexto: clean(propuesta.lugarContexto),
      problemaNecesidad: clean(propuesta.problemaNecesidad),
      grupoEstudio: clean(propuesta.grupoEstudio),
      anioPeriodoDatos: clean(propuesta.anioPeriodoDatos),
      objetivoArticulo: clean(propuesta.objetivoArticulo),
      resultadoEsperado: clean(propuesta.resultadoEsperado),
      tituloFinal: clean(propuesta.tituloFinal),
      coherencia: propuesta.coherencia || { validadoEnCliente: true, actualizadoEn: nowIso() }
    };
  });
}

async function buscarPorCedula(cedula) {
  const firestore = db();
  const cedulaLimpia = onlyDigits(cedula);
  if (!cedulaLimpia) throw new Error("Ingrese una cédula válida.");

  const periodoActivo = await getPeriodoActivo(firestore);
  const estudiante = await buscarEstudiantePorCedula(firestore, cedulaLimpia);
  if (!estudiante) throw new Error("No se encontró un estudiante con esa cédula.");
  if (!estudiantePertenecePeriodo(estudiante, periodoActivo.id)) throw new Error("El estudiante no pertenece al período activo.");

  const envio = await buscarEnvioEstudiante(firestore, periodoActivo, cedulaLimpia);
  return { ok: true, estudiante: estudiantePublico(estudiante, periodoActivo.label), periodoActivo, envio: envio.exists ? envio.data : null };
}

async function guardarTelegram(cedula, telegramUser) {
  const firestore = db();
  const cedulaLimpia = onlyDigits(cedula);
  const usuario = clean(telegramUser);
  if (!cedulaLimpia) throw new Error("Ingrese una cédula válida.");
  if (!usuario) throw new Error("Ingrese su usuario de Telegram.");

  const periodoActivo = await getPeriodoActivo(firestore);
  const envio = await buscarEnvioEstudiante(firestore, periodoActivo, cedulaLimpia);
  await setDoc(envio.ref, { envioId: envio.id, periodoId: periodoActivo.id, periodoLabel: periodoActivo.label, cedula: cedulaLimpia, telegramUser: usuario, actualizadoEn: nowIso() }, { merge: true });
  return { ok: true, mensaje: "Usuario de Telegram guardado correctamente." };
}

async function consultarEstado(cedula) {
  const firestore = db();
  const cedulaLimpia = onlyDigits(cedula);
  if (!cedulaLimpia) throw new Error("Ingrese una cédula válida.");
  const periodoActivo = await getPeriodoActivo(firestore);
  const envio = await buscarEnvioEstudiante(firestore, periodoActivo, cedulaLimpia);
  return { ok: true, envio: envio.exists ? envio.data : null, periodoActivo };
}

async function enviarPropuestas(datosEnvio) {
  const firestore = db();
  const cedula = onlyDigits(datosEnvio.cedula);
  const telegramUser = clean(datosEnvio.telegramUser || datosEnvio.telegramUsuario);
  if (!cedula) throw new Error("Ingrese una cédula válida.");
  if (!telegramUser) throw new Error("Ingrese su usuario de Telegram.");

  const periodoActivo = await getPeriodoActivo(firestore);
  const estudiante = await buscarEstudiantePorCedula(firestore, cedula);
  if (!estudiante) throw new Error("No se encontró el estudiante.");
  if (!estudiantePertenecePeriodo(estudiante, periodoActivo.id)) throw new Error("El estudiante no pertenece al período activo.");

  const errorPropuestas = validarPropuestasBasicas(datosEnvio.propuestas, datosEnvio.tituloPreferidoNumero);
  if (errorPropuestas) throw new Error(errorPropuestas);

  const envio = await buscarEnvioEstudiante(firestore, periodoActivo, cedula);
  const envioActual = envio.exists ? envio.data : null;
  if (envioActual && [ESTADOS.enviado, ESTADOS.enRevision, ESTADOS.aprobado, ESTADOS.aprobadoConCorrecciones].includes(envioActual.estado)) {
    throw new Error("El envío ya fue registrado y no puede editarse en este estado.");
  }

  const intento = Number(envioActual?.intento || 0) + 1;
  const propuestas = limpiarPropuestas(datosEnvio.propuestas, datosEnvio.tituloPreferidoNumero);
  const fecha = nowIso();
  const estudianteBase = estudiantePublico(estudiante, periodoActivo.label);

  const data = {
    envioId: envio.id,
    periodoId: periodoActivo.id,
    periodoLabel: periodoActivo.label,
    cedula,
    telegramUser,
    codigoCarrera: estudianteBase.codigoCarrera,
    carrera: estudianteBase.carrera,
    nombres: estudianteBase.nombres,
    propuestas,
    tituloPreferidoNumero: Number(datosEnvio.tituloPreferidoNumero),
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

  await setDoc(envio.ref, data, { merge: true });
  await addDoc(collection(firestore, COLLECTIONS.historial), { tipo: "ENVIO_ESTUDIANTE", envioId: envio.id, cedula, periodoId: periodoActivo.id, periodoLabel: periodoActivo.label, intento, estado: ESTADOS.enviado, propuestas, creadoEn: fecha });
  return { ok: true, envio: data, mensaje: "Propuestas enviadas correctamente." };
}

function limpiarCoordinador(id, data = {}) {
  return {
    id,
    nombre: clean(data.nombre),
    activo: data.activo !== false,
    carrerasAsignadas: Array.isArray(data.carrerasAsignadas) ? data.carrerasAsignadas : []
  };
}

async function listarCoordinadores() {
  const firestore = db();
  const snap = await getDocs(collection(firestore, COLLECTIONS.coordinadores));
  const coordinadores = snap.docs
    .map((item) => limpiarCoordinador(item.id, item.data()))
    .filter((coord) => coord.activo !== false)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
  return { ok: true, coordinadores };
}

async function obtenerCoordinador(firestore, coordinadorId) {
  const id = clean(coordinadorId);
  if (!id) return null;
  const snap = await getDoc(doc(firestore, COLLECTIONS.coordinadores, id));
  if (!snap.exists()) return null;
  const data = snap.data() || {};
  if (data.activo === false) return null;
  return { ...data, id: snap.id };
}

async function limpiarEnvio(firestore, id, data = {}) {
  const estudiante = await buscarEstudiantePorCedula(firestore, data.cedula);
  const codigoCarrera = clean(data.codigoCarrera || estudiante?.CodigoCarrera || estudiante?.codigoCarrera);
  const carrera = clean(data.carrera || estudiante?.NombreCarrera || estudiante?.nombreCarrera || estudiante?.carrera);
  const nombres = clean(data.nombres || estudiante?.Nombres || estudiante?.nombres || estudiante?.Nombre || estudiante?.nombre);
  return {
    envioId: id,
    cedula: clean(data.cedula),
    nombres,
    carrera,
    codigoCarrera,
    periodoId: clean(data.periodoId || estudiante?.periodoId || estudiante?.ultimoPeriodoId || estudiante?.UltimoPeriodoId),
    estado: clean(data.estado),
    enviadoEn: clean(data.enviadoEn),
    telegramUser: clean(data.telegramUser || estudiante?.telegramUser || estudiante?.telegramUsuario),
    tituloPreferidoNumero: Number(data.tituloPreferidoNumero || 0),
    propuestas: Array.isArray(data.propuestas) ? data.propuestas.map((p) => ({
      numero: Number(p.numero),
      preferido: Boolean(p.preferido),
      tituloFinal: clean(p.tituloFinal),
      coherencia: p.coherencia || null
    })) : []
  };
}

async function cargarEstudiantes(coordinadorId) {
  const firestore = db();
  const coordinador = await obtenerCoordinador(firestore, coordinadorId);
  if (!coordinador) throw new Error("Seleccione un coordinador válido.");

  const periodoActivo = await getPeriodoActivo(firestore);
  const carrerasAsignadas = Array.isArray(coordinador.carrerasAsignadas) ? coordinador.carrerasAsignadas : [];
  const codigos = carrerasAsignadas.map((c) => clean(c.codigoCarrera)).filter(Boolean);

  const snap = await getDocs(collection(firestore, COLLECTIONS.envios));
  const docsPeriodo = snap.docs.filter((item) => periodoEquivalente(item.data()?.periodoId || item.data()?.periodoLabel, periodoActivo.id));
  const envios = await Promise.all(docsPeriodo.map((item) => limpiarEnvio(firestore, item.id, item.data())));
  const estudiantes = codigos.length ? envios.filter((envio) => codigos.includes(envio.codigoCarrera)) : envios;

  return { ok: true, coordinador: limpiarCoordinador(coordinador.id, coordinador), periodoActivo, estudiantes };
}

async function iniciarRevision(envioId, coordinadorId) {
  const firestore = db();
  const id = clean(envioId);
  const coordinador = await obtenerCoordinador(firestore, coordinadorId);
  if (!id) throw new Error("No se recibió el envío a revisar.");
  if (!coordinador) throw new Error("Seleccione un coordinador válido.");

  const ref = doc(firestore, COLLECTIONS.envios, id);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("No se encontró el envío seleccionado.");
  const envio = snap.data() || {};
  if (envio.estado === ESTADOS.enviado) {
    await setDoc(ref, { estado: ESTADOS.enRevision, revisionIniciadaEn: nowIso(), coordinadorId: coordinador.id, coordinadorNombre: clean(coordinador.nombre), actualizadoEn: nowIso() }, { merge: true });
  }
  return { ok: true, mensaje: "Revisión iniciada." };
}

async function guardarRevision(revision) {
  const firestore = db();
  const envioId = clean(revision.envioId);
  const coordinador = await obtenerCoordinador(firestore, revision.coordinadorId);
  const estado = clean(revision.estado);
  const tituloElegidoNumero = Number(revision.tituloElegidoNumero);
  const tituloCorregido = clean(revision.tituloCorregido);
  const observacion = clean(revision.observacion);

  if (!envioId) throw new Error("No se recibió el envío a revisar.");
  if (!coordinador) throw new Error("Seleccione un coordinador válido.");
  if (!DECISIONES_COORDINADOR.includes(estado)) throw new Error("Seleccione una decisión válida.");
  if (![1, 2, 3].includes(tituloElegidoNumero)) throw new Error("Seleccione uno de los 3 títulos.");
  if (estado === ESTADOS.devuelto && !observacion) throw new Error("La observación es obligatoria cuando se devuelve al estudiante.");
  if (estado === ESTADOS.aprobadoConCorrecciones && !tituloCorregido) throw new Error("Debe escribir el título corregido.");

  const ref = doc(firestore, COLLECTIONS.envios, envioId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("No se encontró el envío seleccionado.");
  const envio = snap.data() || {};
  const propuestaElegida = Array.isArray(envio.propuestas) ? envio.propuestas.find((p) => Number(p.numero) === tituloElegidoNumero) : null;
  if (!propuestaElegida) throw new Error("No se encontró el título elegido.");

  const fecha = nowIso();
  const data = {
    estado,
    tituloElegidoNumero,
    tituloElegidoTexto: clean(propuestaElegida.tituloFinal),
    tituloCorregido,
    observacion,
    coordinadorId: coordinador.id,
    coordinadorNombre: clean(coordinador.nombre),
    revisadoEn: fecha,
    actualizadoEn: fecha,
    notificacionPendiente: true
  };

  await setDoc(ref, data, { merge: true });
  await addDoc(collection(firestore, COLLECTIONS.historial), { tipo: "REVISION_COORDINADOR", envioId, cedula: clean(envio.cedula), periodoId: clean(envio.periodoId), intento: Number(envio.intento || 1), ...data, creadoEn: fecha });
  return { ok: true, revision: data, mensaje: "Revisión guardada correctamente." };
}

function crearIdCoordinador(nombre) {
  return normalizeText(nombre).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || `coord_${Date.now()}`;
}

function contarPorEstado(envios) {
  return envios.reduce((acc, envio) => {
    const estado = clean(envio.estado || "SIN_ENVIO");
    acc[estado] = (acc[estado] || 0) + 1;
    return acc;
  }, {});
}

function carrerasDesdeEstudiantes(estudiantes, coordinadores) {
  const mapaCoordinador = new Map();
  coordinadores.forEach((coord) => {
    (coord.carrerasAsignadas || []).forEach((carrera) => {
      mapaCoordinador.set(clean(carrera.codigoCarrera), { id: coord.id, nombre: coord.nombre });
    });
  });

  const carreras = new Map();
  estudiantes.forEach((est) => {
    const codigo = clean(est.CodigoCarrera || est.codigoCarrera);
    const nombre = clean(est.NombreCarrera || est.nombreCarrera || est.carrera);
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
  const cedula = obtenerCedulaEstudiante(est);
  const envio = enviosPorCedula.get(cedula) || null;
  return {
    cedula,
    nombres: clean(est.Nombres || est.nombres || est.Nombre || est.nombre),
    carrera: clean(est.NombreCarrera || est.nombreCarrera || est.carrera),
    codigoCarrera: clean(est.CodigoCarrera || est.codigoCarrera),
    periodoId: clean(est.periodoId || est.ultimoPeriodoId || est.UltimoPeriodoId || est.Periodo),
    periodoNormalizado: normalizarPeriodoId(obtenerPeriodoEstudiante(est)),
    telegramUser: clean(envio?.telegramUser || est.telegramUser || est.telegramUsuario),
    envioId: envio?.envioId || envio?.id || "",
    estado: envio?.estado || "SIN_ENVIO",
    enviadoEn: envio?.enviadoEn || "",
    coordinadorId: envio?.coordinadorId || "",
    coordinadorNombre: envio?.coordinadorNombre || ""
  };
}

async function listarResumen() {
  const firestore = db();
  const periodoActivo = await getPeriodoActivo(firestore);
  const periodos = await listarPeriodosInterno(firestore);

  const coordinadoresSnap = await getDocs(collection(firestore, COLLECTIONS.coordinadores));
  const coordinadores = coordinadoresSnap.docs.map((item) => ({ ...(item.data() || {}), id: item.id })).sort((a, b) => clean(a.nombre).localeCompare(clean(b.nombre)));

  const estudiantesSnap = await getDocs(collection(firestore, COLLECTIONS.estudiantes));
  const estudiantes = estudiantesSnap.docs.map(withId).filter((estudiante) => estudiantePertenecePeriodo(estudiante, periodoActivo.id));

  const enviosSnap = await getDocs(collection(firestore, COLLECTIONS.envios));
  const envios = enviosSnap.docs.map((item) => ({ ...(item.data() || {}), id: item.id })).filter((envio) => periodoEquivalente(envio.periodoId || envio.periodoLabel, periodoActivo.id));

  const enviosPorCedula = new Map(envios.map((envio) => [clean(envio.cedula), envio]));
  const carreras = carrerasDesdeEstudiantes(estudiantes, coordinadores);
  const codigosConCoordinador = new Set(carreras.filter((c) => c.coordinadorId).map((c) => c.codigoCarrera));
  const estudiantesSinCoordinador = estudiantes.filter((est) => !codigosConCoordinador.has(clean(est.CodigoCarrera || est.codigoCarrera))).length;

  return {
    ok: true,
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
  };
}

async function activarPeriodo(periodoId) {
  const firestore = db();
  const id = clean(periodoId);
  if (!id) throw new Error("Seleccione un período válido.");
  const fecha = nowIso();
  await setDoc(doc(firestore, COLLECTIONS.config, DOCUMENTS.appConfig), { periodoActivoId: id, periodoActivoIdNormalizado: normalizarPeriodoId(id), periodoActivoLabel: id, actualizadoEn: fecha }, { merge: true });
  return { ok: true, periodoActivoId: id, mensaje: "Período activado correctamente." };
}

async function guardarCoordinador(nombre) {
  const firestore = db();
  const nombreLimpio = clean(nombre);
  if (!nombreLimpio) throw new Error("Ingrese el nombre del coordinador.");
  const id = crearIdCoordinador(nombreLimpio);
  const fecha = nowIso();
  await setDoc(doc(firestore, COLLECTIONS.coordinadores, id), { nombre: nombreLimpio, activo: true, carrerasAsignadas: [], actualizadoEn: fecha, creadoEn: fecha }, { merge: true });
  return { ok: true, coordinador: { id, nombre: nombreLimpio, activo: true }, mensaje: "Coordinador guardado correctamente." };
}

async function asignarCoordinadorCarrera(datos) {
  const firestore = db();
  const coordinadorId = clean(datos.coordinadorId);
  const codigoCarrera = clean(datos.codigoCarrera);
  const nombreCarrera = clean(datos.nombreCarrera);
  if (!coordinadorId || !codigoCarrera || !nombreCarrera) throw new Error("Complete coordinador, código de carrera y nombre de carrera.");

  const snap = await getDocs(collection(firestore, COLLECTIONS.coordinadores));
  await Promise.all(snap.docs.map(async (item) => {
    const data = item.data() || {};
    const carreras = Array.isArray(data.carrerasAsignadas) ? data.carrerasAsignadas : [];
    const filtradas = carreras.filter((c) => clean(c.codigoCarrera) !== codigoCarrera);
    if (item.id === coordinadorId) filtradas.push({ codigoCarrera, nombreCarrera });
    await setDoc(item.ref, { carrerasAsignadas: filtradas, actualizadoEn: nowIso() }, { merge: true });
  }));

  return { ok: true, mensaje: "Carrera asignada correctamente." };
}

export const TaTituloArticuloFirebaseDirect = Object.freeze({
  disponible: firebaseDisponible,
  estudiante: {
    buscarPorCedula,
    consultarEstado,
    guardarTelegram,
    enviarPropuestas
  },
  coordinador: {
    listarCoordinadores,
    cargarEstudiantes,
    iniciarRevision,
    guardarRevision
  },
  admin: {
    listarResumen,
    activarPeriodo,
    guardarCoordinador,
    asignarCoordinadorCarrera
  }
});
