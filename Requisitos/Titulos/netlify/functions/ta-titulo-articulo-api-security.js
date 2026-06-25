/*
  Nombre completo: ta-titulo-articulo-api-security.js
  Ruta o ubicación: /Requisitos/Titulos/netlify/functions/ta-titulo-articulo-api-security.js
  Función o funciones:
  - Centralizar utilidades privadas para Netlify Functions.
  - Inicializar Firebase Admin sin exponer credenciales al frontend.
  - Validar entradas básicas, limpiar textos y devolver respuestas JSON uniformes.
  - Proteger acciones administrativas mediante token interno cuando corresponda.
  - Normalizar estudiantes, períodos e identificadores institucionales.
  - Conectar por defecto con Primer semestre de 2026 si aún no existe período activo configurado.
*/

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const COLLECTIONS = Object.freeze({
  estudiantes: "Estudiantes",
  periodos: "periodos",
  config: "ta_titulo_articulo_config",
  coordinadores: "ta_titulo_articulo_coordinadores",
  envios: "ta_titulo_articulo_envios",
  historial: "ta_titulo_articulo_historial",
  alertas: "ta_titulo_articulo_alertas"
});

export const DOCUMENTS = Object.freeze({ appConfig: "app" });

export const DEFAULT_PERIODO_ACTIVO = Object.freeze({
  id: "PRIMER_SEMESTRE_2026",
  idNormalizado: "2026_1",
  label: "Primer semestre de 2026"
});

export const ESTADOS = Object.freeze({
  borrador: "BORRADOR",
  enviado: "ENVIADO",
  enRevision: "EN_REVISION",
  aprobado: "APROBADO",
  aprobadoConCorrecciones: "APROBADO_CON_CORRECCIONES",
  devuelto: "DEVUELTO"
});

export const DECISIONES_COORDINADOR = Object.freeze([
  ESTADOS.aprobado,
  ESTADOS.aprobadoConCorrecciones,
  ESTADOS.devuelto
]);

export function nowIso() {
  return new Date().toISOString();
}

export function cleanString(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function upperClean(value) {
  return cleanString(value).toUpperCase();
}

export function onlyDigits(value) {
  return String(value ?? "").replace(/\D+/g, "").trim();
}

export function normalizeText(value) {
  return cleanString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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

export function normalizarPeriodoId(value) {
  const canonico = detectarPeriodoCanonico(value);
  if (canonico) return canonico;

  return normalizeText(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export function periodoEquivalente(a, b) {
  const pa = normalizarPeriodoId(a);
  const pb = normalizarPeriodoId(b);
  return Boolean(pa && pb && pa === pb);
}

export function obtenerPeriodoEstudiante(estudiante = {}) {
  return cleanString(
    estudiante.periodoId ||
    estudiante.ultimoPeriodoId ||
    estudiante.UltimoPeriodoId ||
    estudiante.periodo ||
    estudiante.Periodo ||
    ""
  );
}

export function estudiantePertenecePeriodo(estudiante = {}, periodoId = "") {
  return [
    estudiante.periodoId,
    estudiante.ultimoPeriodoId,
    estudiante.UltimoPeriodoId,
    estudiante.periodo,
    estudiante.Periodo
  ].some((value) => periodoEquivalente(value, periodoId));
}

export function createEnvioId(periodoId, cedula) {
  return `${normalizarPeriodoId(periodoId)}_${onlyDigits(cedula)}`;
}

export function jsonResponse(statusCode, data) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, x-ta-admin-token",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    },
    body: JSON.stringify(data)
  };
}

export function ok(data = {}) {
  return jsonResponse(200, { ok: true, ...data });
}

export function badRequest(error, extra = {}) {
  return jsonResponse(400, { ok: false, error: cleanString(error), ...extra });
}

export function unauthorized(error = "Acceso no autorizado.") {
  return jsonResponse(401, { ok: false, error });
}

export function serverError(error) {
  return jsonResponse(500, {
    ok: false,
    error: error && error.message ? error.message : String(error)
  });
}

export function handleOptions(event) {
  if (event.httpMethod === "OPTIONS") return jsonResponse(204, {});
  return null;
}

export function parseBody(event) {
  if (!event.body) return { action: "", payload: {} };

  try {
    const parsed = JSON.parse(event.body);
    return {
      action: cleanString(parsed.action),
      payload: parsed.payload && typeof parsed.payload === "object" ? parsed.payload : {}
    };
  } catch (error) {
    throw new Error("El cuerpo de la solicitud no es JSON válido.");
  }
}

export function requireAdminToken(event) {
  const expected = cleanString(process.env.TA_TITULO_ARTICULO_ADMIN_TOKEN);
  const received = cleanString(event.headers["x-ta-admin-token"] || event.headers["X-TA-ADMIN-TOKEN"]);

  if (!expected) throw new Error("No está configurado TA_TITULO_ARTICULO_ADMIN_TOKEN.");

  if (!received || received !== expected) {
    const error = new Error("Token administrativo inválido.");
    error.statusCode = 401;
    throw error;
  }
}

export function getAdminDb() {
  if (!getApps().length) {
    const projectId = cleanString(process.env.FIREBASE_ADMIN_PROJECT_ID);
    const clientEmail = cleanString(process.env.FIREBASE_ADMIN_CLIENT_EMAIL);
    const privateKey = String(process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error("Faltan variables FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL o FIREBASE_ADMIN_PRIVATE_KEY.");
    }

    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }

  return getFirestore();
}

function periodoDesdeDoc(doc) {
  const data = doc.exists ? (doc.data() || {}) : {};
  const id = doc.id;
  const texto = [id, data.id, data.periodoId, data.label, data.nombre, data.periodoLabel].map(cleanString).join(" ");
  return {
    ...data,
    id,
    idNormalizado: normalizarPeriodoId(texto || id),
    label: cleanString(data.label || data.nombre || data.periodoLabel || id)
  };
}

async function buscarPeriodoPorCanonico(db, canonico) {
  const snap = await db.collection(COLLECTIONS.periodos).get();
  const encontrado = snap.docs
    .map(periodoDesdeDoc)
    .find((periodo) => normalizarPeriodoId([periodo.id, periodo.label, periodo.nombre, periodo.periodoId].join(" ")) === canonico);

  return encontrado || null;
}

export async function getPeriodoActivo(db) {
  const snap = await db.collection(COLLECTIONS.config).doc(DOCUMENTS.appConfig).get();
  const config = snap.exists ? snap.data() : {};
  const periodoActivoId = cleanString(config.periodoActivoId || config.periodoActivo || config.activePeriodId);

  if (periodoActivoId) {
    const candidatos = [periodoActivoId, normalizarPeriodoId(periodoActivoId)].filter(Boolean);

    for (const candidato of candidatos) {
      const periodoSnap = await db.collection(COLLECTIONS.periodos).doc(candidato).get();
      if (periodoSnap.exists) return periodoDesdeDoc(periodoSnap);
    }

    const periodoPorAlias = await buscarPeriodoPorCanonico(db, normalizarPeriodoId(periodoActivoId));
    if (periodoPorAlias) return periodoPorAlias;

    return {
      id: periodoActivoId,
      idNormalizado: normalizarPeriodoId(periodoActivoId),
      label: cleanString(config.periodoActivoLabel || periodoActivoId)
    };
  }

  const fallback = await buscarPeriodoPorCanonico(db, DEFAULT_PERIODO_ACTIVO.idNormalizado);
  if (fallback) return fallback;

  return { ...DEFAULT_PERIODO_ACTIVO };
}

function withFirestoreDocId(doc) {
  return { ...(doc.data() || {}), id: doc.id };
}

export async function buscarEstudiantePorCedula(db, cedula) {
  const cedulaLimpia = onlyDigits(cedula);
  if (!cedulaLimpia) return null;

  const directo = await db.collection(COLLECTIONS.estudiantes).doc(cedulaLimpia).get();
  if (directo.exists) return withFirestoreDocId(directo);

  const campos = ["numeroIdentificacion", "cedula"];

  for (const campo of campos) {
    const snap = await db.collection(COLLECTIONS.estudiantes).where(campo, "==", cedulaLimpia).limit(1).get();
    if (!snap.empty) {
      return withFirestoreDocId(snap.docs[0]);
    }
  }

  return null;
}

export function estudiantePublico(estudiante, periodoLabel) {
  const cedula = cleanString(estudiante.numeroIdentificacion || estudiante.cedula || estudiante.id);
  return {
    cedula,
    numeroIdentificacion: cedula,
    nombres: cleanString(estudiante.Nombres || estudiante.nombres),
    carrera: cleanString(estudiante.NombreCarrera || estudiante.nombreCarrera || estudiante.carrera),
    codigoCarrera: cleanString(estudiante.CodigoCarrera || estudiante.codigoCarrera),
    periodoId: cleanString(estudiante.periodoId),
    ultimoPeriodoId: cleanString(estudiante.ultimoPeriodoId || estudiante.UltimoPeriodoId),
    periodoNormalizado: normalizarPeriodoId(obtenerPeriodoEstudiante(estudiante)),
    periodoLabel: cleanString(periodoLabel || estudiante.periodoId || estudiante.ultimoPeriodoId),
    telegramUser: cleanString(estudiante.telegramUser || estudiante.telegramUsuario),
    telegramUsuario: cleanString(estudiante.telegramUsuario || estudiante.telegramUser),
    telegramChatId: cleanString(estudiante.telegramChatId)
  };
}

export function validarMetodoPost(event) {
  if (event.httpMethod !== "POST") {
    throw new Error("Método no permitido. Use POST.");
  }
}

export function fieldValueServerTimestamp() {
  return FieldValue.serverTimestamp();
}
