/*
  Nombre completo: ta-titulo-articulo-api-security.js
  Ruta o ubicación: /Requisitos/Titulos/netlify/functions/ta-titulo-articulo-api-security.js
  Función o funciones:
  - Centralizar utilidades privadas para Netlify Functions.
  - Inicializar Firebase Admin sin exponer credenciales al frontend.
  - Validar entradas básicas, limpiar textos y devolver respuestas JSON uniformes.
  - Proteger acciones administrativas mediante token interno cuando corresponda.
  - Normalizar estudiantes, períodos e identificadores institucionales.
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

export function normalizarPeriodoId(value) {
  return cleanString(value)
    .replace(/\s+/g, "")
    .replace(/_+/g, "_")
    .replace(/-/g, "-")
    .toUpperCase();
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

export async function getPeriodoActivo(db) {
  const snap = await db.collection(COLLECTIONS.config).doc(DOCUMENTS.appConfig).get();
  const config = snap.exists ? snap.data() : {};
  const periodoActivoId = cleanString(config.periodoActivoId || config.periodoActivo || config.activePeriodId);

  if (!periodoActivoId) return null;

  const candidatos = [periodoActivoId, normalizarPeriodoId(periodoActivoId)].filter(Boolean);
  let periodoSnap = null;

  for (const candidato of candidatos) {
    periodoSnap = await db.collection(COLLECTIONS.periodos).doc(candidato).get();
    if (periodoSnap.exists) break;
  }

  const periodo = periodoSnap && periodoSnap.exists ? periodoSnap.data() : { id: periodoActivoId, label: periodoActivoId };
  const id = cleanString(periodo.id || periodo.periodoId || periodoActivoId);

  return {
    id,
    idNormalizado: normalizarPeriodoId(id),
    label: cleanString(periodo.label || periodo.nombre || periodo.periodoLabel || id)
  };
}

export async function buscarEstudiantePorCedula(db, cedula) {
  const cedulaLimpia = onlyDigits(cedula);
  if (!cedulaLimpia) return null;

  const directo = await db.collection(COLLECTIONS.estudiantes).doc(cedulaLimpia).get();
  if (directo.exists) return { id: directo.id, ...directo.data() };

  const campos = ["numeroIdentificacion", "cedula"];

  for (const campo of campos) {
    const snap = await db.collection(COLLECTIONS.estudiantes).where(campo, "==", cedulaLimpia).limit(1).get();
    if (!snap.empty) {
      const doc = snap.docs[0];
      return { id: doc.id, ...doc.data() };
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
