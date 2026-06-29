/*
  Nombre completo: ta-titulo-articulo-api-ia.js
  Ruta o ubicación: /Requisitos/Titulos/netlify/functions/ta-titulo-articulo-api-ia.js
  Función o funciones:
  - Probar conexiones de IA desde el administrador sin exponer claves al navegador.
  - Validar token administrativo antes de ejecutar diagnósticos o pruebas.
  - Verificar Gemini, Groq y motor local de respaldo.
*/

import {
  badRequest,
  cleanString,
  handleOptions,
  jsonResponse,
  ok,
  parseBody,
  requireAdminToken,
  serverError,
  unauthorized,
  validarMetodoPost
} from "./ta-titulo-articulo-api-security.js";
import { TaTituloArticuloMotorLocal } from "../../src/services/ta-titulo-articulo-motor-local.service.js";

const FILE_PATH = "Requisitos/Titulos/netlify/functions/ta-titulo-articulo-api-ia.js";
const GEMINI_MODEL = cleanString(process.env.GEMINI_MODEL || "gemini-2.5-flash");
const GROQ_MODEL = cleanString(process.env.GROQ_MODEL || "llama-3.1-8b-instant");

const SAMPLE_PAYLOAD = Object.freeze({
  carrera: "Administración de Empresas",
  temaGeneral: "captación de clientes",
  problemaNecesidad: "baja captación de clientes",
  lugarContexto: "Quito",
  grupoEstudio: "microemprendimientos",
  anioPeriodoDatos: "2026",
  objetivoArticulo: "Analizar la captación de clientes para proponer una mejora comercial.",
  resultadoEsperado: "Estrategia de mejora comercial para fortalecer la captación de clientes.",
  numeroTitulo: 1,
  titulosYaGenerados: []
});

function tieneEnv(nombre) {
  return Boolean(cleanString(process.env[nombre]));
}

function estadoBase() {
  return {
    archivo: FILE_PATH,
    seguridad: {
      tokenAdmin: tieneEnv("TA_TITULO_ARTICULO_ADMIN_TOKEN") ? "configurado" : "no configurado",
      clavesEnFrontend: "no expuestas"
    },
    motores: {
      gemini: {
        disponible: tieneEnv("GEMINI_API_KEY"),
        modelo: GEMINI_MODEL,
        clave: tieneEnv("GEMINI_API_KEY") ? "configurada" : "no configurada"
      },
      groq: {
        disponible: tieneEnv("GROQ_API_KEY"),
        modelo: GROQ_MODEL,
        clave: tieneEnv("GROQ_API_KEY") ? "configurada" : "no configurada"
      },
      local: {
        disponible: true,
        modelo: "motor-local-inteligente",
        clave: "no requiere clave"
      }
    }
  };
}

function depurarTitulo(value) {
  return cleanString(value)
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```$/g, "")
    .replace(/^RESPUESTA:\s*/i, "")
    .replace(/^Título:\s*/i, "")
    .replace(/^[-•\d.)\s]+/, "")
    .replace(/^['"]+|['"]+$/g, "")
    .replace(/[.;]+$/g, "")
    .trim();
}

function promptPrueba() {
  return `Genera un solo título académico breve y claro para un artículo de la carrera Administración de Empresas sobre baja captación de clientes en microemprendimientos de Quito, 2026. Devuelve solo el título.`;
}

function textoGemini(data = {}) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return cleanString(parts.map((part) => part.text || "").join(" "));
}

async function probarGemini() {
  const apiKey = cleanString(process.env.GEMINI_API_KEY);
  if (!apiKey) return badRequest("GEMINI_API_KEY no está configurada en Netlify.", estadoBase());

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: promptPrueba() }] }],
      generationConfig: { temperature: 0.25, topP: 0.9, maxOutputTokens: 80 }
    })
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) return jsonResponse(response.status, { ok: false, error: data?.error?.message || `Gemini HTTP ${response.status}`, ...estadoBase() });

  const titulo = depurarTitulo(textoGemini(data));
  if (!titulo) return badRequest("Gemini respondió, pero no devolvió un título válido.", estadoBase());
  return ok({ ...estadoBase(), prueba: { motor: "gemini", exito: true, titulo } });
}

function textoGroq(data = {}) {
  return cleanString(data?.choices?.[0]?.message?.content || "");
}

async function probarGroq() {
  const apiKey = cleanString(process.env.GROQ_API_KEY);
  if (!apiKey) return badRequest("GROQ_API_KEY no está configurada en Netlify.", estadoBase());

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "user", content: promptPrueba() }],
      temperature: 0.25,
      max_tokens: 80
    })
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) return jsonResponse(response.status, { ok: false, error: data?.error?.message || `Groq HTTP ${response.status}`, ...estadoBase() });

  const titulo = depurarTitulo(textoGroq(data));
  if (!titulo) return badRequest("Groq respondió, pero no devolvió un título válido.", estadoBase());
  return ok({ ...estadoBase(), prueba: { motor: "groq", exito: true, titulo } });
}

async function probarLocal() {
  const resultado = TaTituloArticuloMotorLocal.generarSugerenciasTitulo(SAMPLE_PAYLOAD);
  return ok({ ...estadoBase(), prueba: { motor: "local", exito: true, sugerencias: resultado.sugerencias || [] } });
}

export async function handler(event) {
  const options = handleOptions(event);
  if (options) return options;

  try {
    validarMetodoPost(event);
    requireAdminToken(event);
    const { action } = parseBody(event);

    if (action === "estadoIA") return ok(estadoBase());
    if (action === "probarGemini") return await probarGemini();
    if (action === "probarGroq") return await probarGroq();
    if (action === "probarLocal") return await probarLocal();
    return badRequest("Acción IA no reconocida.", { archivo: FILE_PATH });
  } catch (error) {
    if (error.statusCode === 401) return unauthorized(error.message);
    return serverError(error);
  }
}
