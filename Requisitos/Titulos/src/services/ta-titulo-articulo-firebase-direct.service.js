/*
  Nombre completo: ta-titulo-articulo-firebase-direct.service.js
  Ruta o ubicación: /Requisitos/Titulos/src/services/ta-titulo-articulo-firebase-direct.service.js
  Función o funciones:
  - Conectar el módulo Títulos directamente con Firebase/Firestore desde el cliente.
  - Leer estudiantes, períodos y coordinadores sin depender de Netlify Functions.
  - Escribir en Firebase solo datos mínimos del proceso de títulos.
  - Usar las colecciones reales: Estudiantes, periodos, titulos, titulos_coordinadores y titulos_logs.
  - Mantener compatibilidad temporal con documentos viejos de prueba.
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
  where
} from "firebase/firestore";

import { obtenerFirestore, firebaseDisponible } from "../firebase/ta-titulo-articulo-firebase-client.js";
import {
  TA_TITULO_ARTICULO_COLLECTIONS as COLLECTIONS,
  TA_TITULO_ARTICULO_DOCUMENTS as DOCUMENTS,
  TA_TITULO_ARTICULO_ESTADOS as ESTADOS,
  TA_TITULO_ARTICULO_DECISIONES_COORDINADOR as DECISIONES_COORDINADOR,
  TA_TITULO_ARTICULO_LIMITES as LIMITES,
  TA_TITULO_ARTICULO_LOG_TIPOS as LOG_TIPOS,
  crearEnvioId,
  crearEnvioIdLegacyCedula,
  normalizarEstadoTitulo
} from "../firebase/ta-titulo-articulo-collections.js";

const DEFAULT_PERIODO_ACTIVO = Object.freeze({
  id: "2026-02__2026-08",
  idNormalizado: "2026_02_2026_08",
  label: "Febrero 2026 a Agosto 2026"
});

const CAMPOS_CEDULA = Object.freeze([
  "numeroIdentificacion",
  "NumeroIdentificacion",
  "cedula",
  "Cedula",
  "Identificacion",
  "identificacion"
]);

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
  return normalizeText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
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
  return onlyDigits(estudiante.numeroIdentificacion || estudiante.NumeroIdentificacion || estudiante.cedula || estudiante.Cedula || estudiante.Identificacion || estudiante.identificacion || estudiante.id);
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
  const id = clean(data.id || data.periodoId || snap.id);
  const label = clean(data.label || data.nombre || data.periodoLabel || id);
  const texto = [id, label].join(" ");
  return {
    ...data,
    id,
    idNormalizado: normalizarPeriodoId(texto || id),
    label,
    creadoEn: clean(data.creadoEn)
  };
}

function ordenarPeriodos(periodos = []) {
  return [...periodos].sort((a, b) => {
    const fechaA = Date.parse(a.creadoEn || "") || 0;
    const fechaB = Date.parse(b.creadoEn || "") || 0;
    if (fechaA !== fechaB) return fechaB - fechaA;
    return clean(b.label || b.id).localeCompare(clean(a.label || a.id));
  });
}

async function listarPeriodosInterno(firestore) {
  const snap = await getDocs(collection(firestore, COLLECTIONS.periodos));
  const periodos = ordenarPeriodos(snap.docs.map(periodoDesdeSnap));
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

function limpiarTitulo(value) {
  let texto = clean(value).replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  while (texto.length > 1 && ((texto.startsWith('"') && texto.endsWith('"')) || (texto.startsWith("'") && texto.endsWith("'")))) {
    texto = texto.slice(1, -1).trim();
  }
  return texto.replace(/\s+/g, " ").trim();
}

function tituloDesdeItem(item = {}) {
  if (typeof item === "string") return limpiarTitulo(item);
  return limpiarTitulo(item.titulo || item.tituloFinal || item.texto || item.value || item.nombre || "");
}

function titulosDesdeData(data = {}) {
  const fuentes = [data.titulosEnviados, data.propuestas, data.titulosFinales, data.finales].find(Array.isArray) || [];
  let titulos = fuentes.map((item, index) => ({
    numero: Number(item?.numero || index + 1),
    titulo: tituloDesdeItem(item),
    preferido: Boolean(item?.preferido)
  })).filter((item) => item.numero && item.titulo);

  if (!titulos.length) {
    titulos = [data.titulo1, data.titulo2, data.titulo3].map((item, index) => ({
      numero: index + 1,
      titulo: tituloDesdeItem(item),
      preferido: Number(data.propuestaPreferidaNumero || data.tituloPreferidoNumero) === index + 1
    })).filter((item) => item.titulo);
  }

  const preferido = Number(data.tituloPreferidoNumero || data.propuestaPreferidaNumero || 0);
  return titulos
    .slice(0, LIMITES.titulosPorEnvio)
    .map((item) => ({
      numero: Number(item.numero),
      titulo: limpiarTitulo(item.titulo),
      preferido: Boolean(item.preferido || Number(item.numero) === preferido)
    }));
}

function normalizarEnvio(id, data = {}) {
  if (!data) return null;
  const estado = normalizarEstadoTitulo(data.estado);
  const titulosEnviados = titulosDesdeData(data);
  const tituloPreferidoNumero = Number(data.tituloPreferidoNumero || data.propuestaPreferidaNumero || titulosEnviados.find((t) => t.preferido)?.numero || 0);
  const intentosUsados = Number(data.intentosUsados || data.intento || 0);
  const maxIntentos = Number(data.maxIntentos || LIMITES.maxIntentos);
  const tituloCorregidoCoordinador = limpiarTitulo(data.tituloCorregidoCoordinador || data.tituloCorregido || "");
  const observacionCoordinador = clean(data.observacionCoordinador || data.observacion || data.comentarioCoordinador || "");
  const tituloElegidoTexto = limpiarTitulo(data.tituloElegidoTexto || data.tituloElegido || data.tituloAprobado || "");

  return {
    ...data,
    docId: clean(data.docId || data._docId || data.envioId || id),
    envioId: clean(data.envioId || data.docId || data._docId || id),
    estado,
    titulosEnviados,
    tituloPreferidoNumero,
    tituloElegidoNumero: data.tituloElegidoNumero || "",
    tituloElegidoTexto,
    tituloCorregidoCoordinador,
    observacionCoordinador,
    intentosUsados,
    maxIntentos,
    reenvioDisponible: estado === ESTADOS.devuelto && intentosUsados < maxIntentos,
    enviadoEn: clean(data.enviadoEn || data.fechaEnvio || ""),
    revisadoEn: clean(data.revisadoEn || data.fechaRevision || data.fechaAprobacion || ""),
    actualizadoEn: clean(data.actualizadoEn || ""),
    propuestas: titulosEnviados.map((titulo) => ({
      numero: titulo.numero,
      preferido: titulo.preferido,
      tituloFinal: titulo.titulo,
      titulo: titulo.titulo
    })),
    tituloCorregido: tituloCorregidoCoordinador,
    observacion: observacionCoordinador
  };
}

async function buscarEnvioEstudiante(firestore, periodoActivo, cedula) {
  const envioId = crearEnvioId(periodoActivo.id, cedula);
  const directoRef = doc(firestore, COLLECTIONS.envios, envioId);
  const directoSnap = await getDoc(directoRef);

  if (directoSnap.exists()) {
    return { ref: directoRef, id: directoSnap.id, data: normalizarEnvio(directoSnap.id, directoSnap.data() || {}), exists: true };
  }

  const legacyId = crearEnvioIdLegacyCedula(cedula);
  if (legacyId) {
    const legacyRef = doc(firestore, COLLECTIONS.envios, legacyId);
    const legacySnap = await getDoc(legacyRef);
    if (legacySnap.exists()) {
      const legacyData = normalizarEnvio(envioId, legacySnap.data() || {});
      return { ref: directoRef, id: envioId, data: legacyData, exists: true, legacyRef, legacyId };
    }
  }

  const snap = await getDocs(query(collection(firestore, COLLECTIONS.envios), where("cedula", "==", onlyDigits(cedula))));
  const encontrado = snap.docs.find((item) => periodoEquivalente(item.data()?.periodoId || item.data()?.periodoLabel, periodoActivo.id));
  if (encontrado) {
    return { ref: directoRef, id: envioId, data: normalizarEnvio(envioId, encontrado.data() || {}), exists: true, legacyRef: encontrado.ref, legacyId: encontrado.id };
  }

  return { ref: directoRef, id: envioId, data: null, exists: false };
}

function validarTitulos(datosEnvio = {}) {
  const tituloPreferidoNumero = Number(datosEnvio.tituloPreferidoNumero || datosEnvio.propuestaPreferidaNumero || 0);
  if (![1, 2, 3].includes(tituloPreferidoNumero)) return { error: "Debe seleccionar cuál de los 3 títulos prefiere.", titulos: [] };

  const titulos = titulosDesdeData({
    titulosEnviados: datosEnvio.titulosEnviados,
    propuestas: datosEnvio.propuestas,
    titulosFinales: datosEnvio.titulosFinales,
    finales: datosEnvio.finales,
    titulo1: datosEnvio.titulo1,
    titulo2: datosEnvio.titulo2,
    titulo3: datosEnvio.titulo3,
    tituloPreferidoNumero
  });

  if (titulos.length !== LIMITES.titulosPorEnvio) return { error: "Debe enviar exactamente 3 títulos.", titulos: [] };

  const normalizados = [];
  for (const titulo of titulos) {
    if (!titulo.titulo) return { error: `El título ${titulo.numero} está vacío.`, titulos: [] };
    const normalizado = normalizeText(titulo.titulo);
    if (normalizados.includes(normalizado)) return { error: "Los 3 títulos deben ser diferentes.", titulos: [] };
    normalizados.push(normalizado);
  }

  return {
    error: "",
    titulos: titulos.map((titulo) => ({
      numero: titulo.numero,
      titulo: titulo.titulo,
      preferido: titulo.numero === tituloPreferidoNumero
    }))
  };
}

async function registrarLog(firestore, data) {
  await addDoc(collection(firestore, COLLECTIONS.historial), {
    ...data,
    creadoEn: data.creadoEn || nowIso()
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
  const fecha = nowIso();
  await setDoc(envio.ref, {
    docId: envio.id,
    envioId: envio.id,
    periodoId: periodoActivo.id,
    periodoLabel: periodoActivo.label,
    cedula: cedulaLimpia,
    estado: envio.data?.estado || ESTADOS.sinEnvio,
    telegramUser: usuario,
    actualizadoEn: fecha,
    creadoEn: envio.data?.creadoEn || fecha
  }, { merge: true });
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
  if (!cedula) throw new Error("Ingrese una cédula válida.");

  const periodoActivo = await getPeriodoActivo(firestore);
  const estudiante = await buscarEstudiantePorCedula(firestore, cedula);
  if (!estudiante) throw new Error("No se encontró el estudiante.");
  if (!estudiantePertenecePeriodo(estudiante, periodoActivo.id)) throw new Error("El estudiante no pertenece al período activo.");

  const validacion = validarTitulos(datosEnvio);
  if (validacion.error) throw new Error(validacion.error);

  const envio = await buscarEnvioEstudiante(firestore, periodoActivo, cedula);
  const envioActual = envio.exists ? normalizarEnvio(envio.id, envio.data || {}) : null;
  const estadoActual = envioActual?.estado || ESTADOS.sinEnvio;

  if ([ESTADOS.enviado, ESTADOS.enRevision, ESTADOS.aprobado, ESTADOS.aprobadoConCorrecciones].includes(estadoActual)) {
    throw new Error("El envío ya fue registrado y no puede editarse en este estado.");
  }

  const intentosPrevios = Number(envioActual?.intentosUsados || 0);
  if (estadoActual === ESTADOS.devuelto && intentosPrevios >= LIMITES.maxIntentos) {
    throw new Error("Ya utilizó su única oportunidad de reenvío después de la devolución.");
  }

  const intentosUsados = Math.max(intentosPrevios, 0) + 1;
  const fecha = nowIso();
  const estudianteBase = estudiantePublico(estudiante, periodoActivo.label);
  const telegramUser = clean(datosEnvio.telegramUser || datosEnvio.telegramUsuario || envioActual?.telegramUser || "");

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
    tituloPreferidoNumero: Number(datosEnvio.tituloPreferidoNumero || datosEnvio.propuestaPreferidaNumero),
    tituloElegidoNumero: "",
    tituloElegidoTexto: "",
    tituloCorregidoCoordinador: "",
    observacionCoordinador: "",
    coordinadorId: "",
    coordinadorNombre: "",
    intentosUsados,
    maxIntentos: LIMITES.maxIntentos,
    reenvioDisponible: false,
    creadoEn: envioActual?.creadoEn || fecha,
    enviadoEn: fecha,
    revisadoEn: "",
    actualizadoEn: fecha,
    ...(telegramUser ? { telegramUser } : {})
  };

  await setDoc(envio.ref, data, { merge: false });
  await registrarLog(firestore, {
    tipo: intentosUsados > 1 ? LOG_TIPOS.reenvioEstudiante : LOG_TIPOS.envioEstudiante,
    docId: envio.id,
    envioId: envio.id,
    cedula,
    periodoId: periodoActivo.id,
    periodoLabel: periodoActivo.label,
    estado: ESTADOS.enviado,
    intentosUsados,
    titulosEnviados: validacion.titulos,
    creadoEn: fecha
  });

  return { ok: true, envio: normalizarEnvio(envio.id, data), mensaje: intentosUsados > 1 ? "Títulos reenviados correctamente." : "Títulos enviados correctamente." };
}

function carreraDesdeEntrada(item) {
  if (typeof item === "string") {
    return { codigoCarrera: "", nombreCarrera: clean(item) };
  }
  return {
    codigoCarrera: clean(item?.codigoCarrera || item?.CodigoCarrera || item?.id || ""),
    nombreCarrera: clean(item?.nombreCarrera || item?.NombreCarrera || item?.nombre || item?.carrera || "")
  };
}

function carrerasCoordinador(data = {}) {
  const directas = Array.isArray(data.carreras) ? data.carreras : [];
  const asignadas = Array.isArray(data.carrerasAsignadas) ? data.carrerasAsignadas : [];
  const mapa = new Map();

  [...directas, ...asignadas].forEach((item) => {
    const carrera = carreraDesdeEntrada(item);
    const key = clean(carrera.codigoCarrera) || normalizeText(carrera.nombreCarrera);
    if (key) mapa.set(key, carrera);
  });

  return Array.from(mapa.values());
}

function limpiarCoordinador(id, data = {}) {
  const carrerasAsignadas = carrerasCoordinador(data);
  return {
    id,
    nombre: clean(data.nombre || data.Nombres || id),
    activo: data.activo !== false,
    carreras: carrerasAsignadas.map((item) => item.nombreCarrera).filter(Boolean),
    carrerasAsignadas
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
  return limpiarCoordinador(snap.id, data);
}

function envioParaCoordinador(id, data = {}) {
  const envio = normalizarEnvio(id, data);
  return {
    envioId: envio.envioId,
    docId: envio.docId,
    cedula: clean(envio.cedula || envio.numeroIdentificacion),
    nombres: clean(envio.nombres || envio.Nombres),
    carrera: clean(envio.carrera || envio.nombreCarrera),
    codigoCarrera: clean(envio.codigoCarrera),
    periodoId: clean(envio.periodoId),
    periodoLabel: clean(envio.periodoLabel),
    estado: envio.estado,
    enviadoEn: envio.enviadoEn,
    actualizadoEn: envio.actualizadoEn,
    coordinadorId: clean(envio.coordinadorId),
    coordinadorNombre: clean(envio.coordinadorNombre),
    tituloPreferidoNumero: envio.tituloPreferidoNumero,
    tituloElegidoNumero: envio.tituloElegidoNumero,
    tituloElegidoTexto: envio.tituloElegidoTexto,
    tituloCorregidoCoordinador: envio.tituloCorregidoCoordinador,
    observacionCoordinador: envio.observacionCoordinador,
    intentosUsados: envio.intentosUsados,
    maxIntentos: envio.maxIntentos,
    reenvioDisponible: envio.reenvioDisponible,
    titulosEnviados: envio.titulosEnviados,
    propuestas: envio.propuestas,
    tituloCorregido: envio.tituloCorregido,
    observacion: envio.observacion
  };
}

function coordinadorPuedeVerEnvio(coordinador, envio) {
  const carreras = coordinador?.carrerasAsignadas || [];
  if (!carreras.length) return true;

  const codigoEnvio = clean(envio.codigoCarrera);
  const nombreEnvio = normalizeText(envio.carrera);

  return carreras.some((carrera) => {
    const codigo = clean(carrera.codigoCarrera);
    const nombre = normalizeText(carrera.nombreCarrera);
    return Boolean((codigo && codigo === codigoEnvio) || (nombre && nombre === nombreEnvio));
  });
}

async function cargarEstudiantes(coordinadorId) {
  const firestore = db();
  const coordinador = await obtenerCoordinador(firestore, coordinadorId);
  if (!coordinador) throw new Error("Seleccione un coordinador válido.");

  const periodoActivo = await getPeriodoActivo(firestore);
  const snap = await getDocs(collection(firestore, COLLECTIONS.envios));
  const envios = snap.docs
    .map((item) => envioParaCoordinador(item.id, item.data()))
    .filter((envio) => periodoEquivalente(envio.periodoId || envio.periodoLabel, periodoActivo.id))
    .filter((envio) => envio.estado !== ESTADOS.sinEnvio)
    .filter((envio) => coordinadorPuedeVerEnvio(coordinador, envio));

  return { ok: true, coordinador, periodoActivo, estudiantes: envios };
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
  const envio = normalizarEnvio(snap.id, snap.data() || {});
  if (envio.estado === ESTADOS.enviado) {
    const fecha = nowIso();
    await setDoc(ref, {
      estado: ESTADOS.enRevision,
      revisionIniciadaEn: fecha,
      coordinadorId: coordinador.id,
      coordinadorNombre: clean(coordinador.nombre),
      actualizadoEn: fecha
    }, { merge: true });
    await registrarLog(firestore, {
      tipo: LOG_TIPOS.inicioRevision,
      docId: id,
      envioId: id,
      cedula: clean(envio.cedula),
      periodoId: clean(envio.periodoId),
      estado: ESTADOS.enRevision,
      coordinadorId: coordinador.id,
      coordinadorNombre: clean(coordinador.nombre),
      creadoEn: fecha
    });
  }
  return { ok: true, mensaje: "Revisión iniciada." };
}

function tituloElegido(envio, numero) {
  return (envio.titulosEnviados || []).find((item) => Number(item.numero) === Number(numero)) || null;
}

async function guardarRevision(revision) {
  const firestore = db();
  const envioId = clean(revision.envioId);
  const coordinador = await obtenerCoordinador(firestore, revision.coordinadorId);
  const estado = normalizarEstadoTitulo(revision.estado);
  const tituloElegidoNumero = Number(revision.tituloElegidoNumero);
  const tituloCorregidoCoordinador = limpiarTitulo(revision.tituloCorregidoCoordinador || revision.tituloCorregido || "");
  const observacionCoordinador = clean(revision.observacionCoordinador || revision.observacion || "");

  if (!envioId) throw new Error("No se recibió el envío a revisar.");
  if (!coordinador) throw new Error("Seleccione un coordinador válido.");
  if (!DECISIONES_COORDINADOR.includes(estado)) throw new Error("Seleccione una decisión válida.");
  if (![1, 2, 3].includes(tituloElegidoNumero)) throw new Error("Seleccione uno de los 3 títulos.");
  if (estado === ESTADOS.devuelto && !observacionCoordinador) throw new Error("La observación es obligatoria cuando se devuelve al estudiante.");
  if (estado === ESTADOS.aprobadoConCorrecciones && !tituloCorregidoCoordinador) throw new Error("Debe escribir el título corregido.");

  const ref = doc(firestore, COLLECTIONS.envios, envioId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("No se encontró el envío seleccionado.");
  const envio = normalizarEnvio(snap.id, snap.data() || {});
  const elegido = tituloElegido(envio, tituloElegidoNumero);
  if (!elegido) throw new Error("No se encontró el título elegido.");

  const fecha = nowIso();
  const data = {
    estado,
    tituloElegidoNumero,
    tituloElegidoTexto: limpiarTitulo(elegido.titulo),
    tituloCorregidoCoordinador,
    observacionCoordinador,
    coordinadorId: coordinador.id,
    coordinadorNombre: clean(coordinador.nombre),
    revisadoEn: fecha,
    actualizadoEn: fecha,
    reenvioDisponible: estado === ESTADOS.devuelto && Number(envio.intentosUsados || 0) < Number(envio.maxIntentos || LIMITES.maxIntentos)
  };

  await setDoc(ref, data, { merge: true });
  await registrarLog(firestore, {
    tipo: LOG_TIPOS.revisionCoordinador,
    docId: envioId,
    envioId,
    cedula: clean(envio.cedula),
    periodoId: clean(envio.periodoId),
    periodoLabel: clean(envio.periodoLabel),
    intentosUsados: Number(envio.intentosUsados || 1),
    ...data,
    creadoEn: fecha
  });

  return { ok: true, revision: data, mensaje: "Revisión guardada correctamente." };
}

function crearIdCoordinador(nombre) {
  return normalizeText(nombre).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || `coord_${Date.now()}`;
}

function contarPorEstado(envios) {
  return envios.reduce((acc, envio) => {
    const estado = normalizarEstadoTitulo(envio.estado || ESTADOS.sinEnvio);
    acc[estado] = (acc[estado] || 0) + 1;
    return acc;
  }, {});
}

function carrerasDesdeEstudiantes(estudiantes, coordinadores) {
  const mapaCoordinadorCodigo = new Map();
  const mapaCoordinadorNombre = new Map();
  coordinadores.forEach((coord) => {
    (coord.carrerasAsignadas || []).forEach((carrera) => {
      if (clean(carrera.codigoCarrera)) mapaCoordinadorCodigo.set(clean(carrera.codigoCarrera), { id: coord.id, nombre: coord.nombre });
      if (clean(carrera.nombreCarrera)) mapaCoordinadorNombre.set(normalizeText(carrera.nombreCarrera), { id: coord.id, nombre: coord.nombre });
    });
  });

  const carreras = new Map();
  estudiantes.forEach((est) => {
    const codigo = clean(est.CodigoCarrera || est.codigoCarrera);
    const nombre = clean(est.NombreCarrera || est.nombreCarrera || est.carrera);
    if (!codigo && !nombre) return;
    const key = codigo || normalizeText(nombre);
    if (!carreras.has(key)) {
      const coord = mapaCoordinadorCodigo.get(codigo) || mapaCoordinadorNombre.get(normalizeText(nombre)) || null;
      carreras.set(key, { codigoCarrera: codigo, nombreCarrera: nombre, totalEstudiantes: 0, coordinadorId: coord?.id || "", coordinadorNombre: coord?.nombre || "" });
    }
    carreras.get(key).totalEstudiantes += 1;
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

async function listarResumen() {
  const firestore = db();
  const periodoActivo = await getPeriodoActivo(firestore);
  const periodos = await listarPeriodosInterno(firestore);

  const coordinadoresSnap = await getDocs(collection(firestore, COLLECTIONS.coordinadores));
  const coordinadores = coordinadoresSnap.docs
    .map((item) => limpiarCoordinador(item.id, item.data()))
    .sort((a, b) => clean(a.nombre).localeCompare(clean(b.nombre)));

  const estudiantesSnap = await getDocs(collection(firestore, COLLECTIONS.estudiantes));
  const estudiantes = estudiantesSnap.docs.map(withId).filter((estudiante) => estudiantePertenecePeriodo(estudiante, periodoActivo.id));

  const enviosSnap = await getDocs(collection(firestore, COLLECTIONS.envios));
  const envios = enviosSnap.docs
    .map((item) => envioParaCoordinador(item.id, item.data()))
    .filter((envio) => periodoEquivalente(envio.periodoId || envio.periodoLabel, periodoActivo.id));

  const enviosPorCedula = new Map(envios.map((envio) => [clean(envio.cedula), envio]));
  const carreras = carrerasDesdeEstudiantes(estudiantes, coordinadores);
  const codigosConCoordinador = new Set(carreras.filter((c) => c.coordinadorId && c.codigoCarrera).map((c) => c.codigoCarrera));
  const nombresConCoordinador = new Set(carreras.filter((c) => c.coordinadorId && c.nombreCarrera).map((c) => normalizeText(c.nombreCarrera)));
  const estudiantesSinCoordinador = estudiantes.filter((est) => {
    const codigo = clean(est.CodigoCarrera || est.codigoCarrera);
    const nombre = normalizeText(est.NombreCarrera || est.nombreCarrera || est.carrera);
    return !(codigo && codigosConCoordinador.has(codigo)) && !(nombre && nombresConCoordinador.has(nombre));
  }).length;

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
      totalEnvios: envios.filter((envio) => envio.estado !== ESTADOS.sinEnvio).length,
      porEstado: contarPorEstado(envios),
      sinCoordinador: estudiantesSinCoordinador
    }
  };
}

async function activarPeriodo(periodoId) {
  const firestore = db();
  const id = clean(periodoId);
  if (!id) throw new Error("Seleccione un período válido.");
  const periodos = await listarPeriodosInterno(firestore);
  const periodo = periodos.find((item) => item.id === id || periodoEquivalente(item.id, id) || periodoEquivalente(item.label, id));
  const fecha = nowIso();
  await setDoc(doc(firestore, COLLECTIONS.config, DOCUMENTS.appConfig), {
    periodoActivoId: periodo?.id || id,
    periodoActivoIdNormalizado: normalizarPeriodoId(periodo?.id || id),
    periodoActivoLabel: clean(periodo?.label || id),
    actualizadoEn: fecha
  }, { merge: true });
  return { ok: true, periodoActivoId: periodo?.id || id, mensaje: "Período activado correctamente." };
}

async function guardarCoordinador(nombre) {
  const firestore = db();
  const nombreLimpio = clean(nombre);
  if (!nombreLimpio) throw new Error("Ingrese el nombre del coordinador.");
  const id = crearIdCoordinador(nombreLimpio);
  const fecha = nowIso();
  await setDoc(doc(firestore, COLLECTIONS.coordinadores, id), {
    _docId: id,
    id,
    nombre: nombreLimpio,
    activo: true,
    carreras: [],
    carrerasAsignadas: [],
    origen: "admin_titulos",
    actualizadoEn: fecha,
    creadoEn: fecha
  }, { merge: true });
  return { ok: true, coordinador: { id, nombre: nombreLimpio, activo: true }, mensaje: "Coordinador guardado correctamente." };
}

async function asignarCoordinadorCarrera(datos) {
  const firestore = db();
  const coordinadorId = clean(datos.coordinadorId);
  const codigoCarrera = clean(datos.codigoCarrera);
  const nombreCarrera = clean(datos.nombreCarrera);
  if (!coordinadorId || (!codigoCarrera && !nombreCarrera)) throw new Error("Complete coordinador y carrera.");

  const snap = await getDocs(collection(firestore, COLLECTIONS.coordinadores));
  await Promise.all(snap.docs.map(async (item) => {
    const data = item.data() || {};
    const actuales = carrerasCoordinador(data).filter((carrera) => {
      const mismoCodigo = codigoCarrera && clean(carrera.codigoCarrera) === codigoCarrera;
      const mismoNombre = nombreCarrera && normalizeText(carrera.nombreCarrera) === normalizeText(nombreCarrera);
      return !mismoCodigo && !mismoNombre;
    });

    if (item.id === coordinadorId) {
      actuales.push({ codigoCarrera, nombreCarrera });
    }

    await setDoc(item.ref, {
      carreras: actuales.map((carrera) => carrera.nombreCarrera).filter(Boolean),
      carrerasAsignadas: actuales,
      actualizadoEn: nowIso()
    }, { merge: true });
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
