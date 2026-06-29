/*
  Nombre completo: ta-titulo-articulo-gemini.js
  Ruta o ubicación: /Requisitos/Titulos/netlify/functions/ta-titulo-articulo-gemini.js
  Función o funciones:
  - Recibir datos de la pantalla del estudiante.
  - Construir dos prompts académicos separados en servidor.
  - Enviar los dos prompts a Gemini usando GEMINI_API_KEY.
  - Devolver error si Gemini no está configurado o no responde, sin generar sugerencias locales.
  Se conecta con:
  - Requisitos/Titulos/src/services/ta-titulo-articulo-gemini-client.service.js
  - Requisitos/Titulos/src/estudiante/ta-titulo-articulo-estudiante.app.js
*/

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalize(value) {
  return clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "POST, OPTIONS"
    },
    body: JSON.stringify(body)
  };
}

function parsePayload(event) {
  try {
    return JSON.parse(event.body || "{}");
  } catch {
    return null;
  }
}

function validarPayload(payload) {
  const campos = [
    ["carrera", payload?.carrera],
    ["tema general", payload?.temaGeneral],
    ["problema o necesidad", payload?.problemaNecesidad],
    ["lugar o contexto", payload?.lugarContexto],
    ["grupo de estudio", payload?.grupoEstudio],
    ["objetivo del artículo", payload?.objetivoArticulo],
    ["resultado esperado", payload?.resultadoEsperado]
  ];

  const faltante = campos.find(([, value]) => !clean(value));
  if (faltante) return `Complete el campo ${faltante[0]} antes de generar sugerencias.`;

  if (![1, 2, 3].includes(Number(payload.numeroTitulo || 0))) return "Número de título inválido.";
  return "";
}

function datosPrompt(payload = {}, sugerenciaTitulo1 = "") {
  return {
    carrera: clean(payload.carrera) || "No especificada",
    materia: clean(payload.materia || payload.nombreMateria || payload.asignatura || payload.nombreAsignatura) || "No especificada",
    temaGeneral: clean(payload.temaGeneral),
    lugarContexto: clean(payload.lugarContexto),
    problemaNecesidad: clean(payload.problemaNecesidad),
    grupoEstudio: clean(payload.grupoEstudio),
    anioPeriodo: clean(payload.anioPeriodo || payload.anioPeriodoDatos),
    objetivoArticulo: clean(payload.objetivoArticulo),
    resultadoEsperado: clean(payload.resultadoEsperado),
    sugerenciaTitulo1: clean(sugerenciaTitulo1)
  };
}

function promptSugerencia1(payload = {}) {
  const data = datosPrompt(payload);
  return `Actúa como experto en investigación académica y formulación de títulos de artículos científicos.

Genera UNA sola sugerencia de título académico, clara, bien escrita, viable y alineada obligatoriamente con la carrera del estudiante.

INFORMACIÓN DEL ESTUDIANTE:
Carrera: ${data.carrera}
Materia: ${data.materia}
Tema general: ${data.temaGeneral}
Lugar o contexto: ${data.lugarContexto}
Problema o necesidad: ${data.problemaNecesidad}
Grupo de estudio: ${data.grupoEstudio}
Año o período de datos: ${data.anioPeriodo}
Objetivo del artículo: ${data.objetivoArticulo}
Resultado esperado: ${data.resultadoEsperado}

REGLAS:
1. Alinea el título directamente con la carrera del estudiante.
2. Si el tema está mal enfocado, toma la idea importante y adáptala a la carrera.
3. Si el tema es ajeno a la carrera y no puede adaptarse claramente, genera el título más cercano a la carrera usando el problema base, sin inventar datos externos.
4. El título debe tener estructura académica clara.
5. Debe permitir entender qué se investiga, en quiénes, dónde y en qué año o período.
6. Evita temas demasiado amplios, históricos o imposibles de terminar en poco tiempo.
7. Puedes usar enfoque de diagnóstico, análisis, identificación de factores, evaluación, propuesta, estrategia, diseño o plan de mejora, siempre que sea viable.
8. No uses lenguaje informal; conviértelo en lenguaje académico.
9. No generes explicación, lista, comentario ni justificación.
10. Devuelve únicamente el título final.

ESTRUCTURA RECOMENDADA:
Acción investigativa + tema específico + grupo de estudio + contexto/institución + año o período.

RESPUESTA:`;
}

function promptSugerencia2(payload = {}, sugerenciaTitulo1 = "") {
  const data = datosPrompt(payload, sugerenciaTitulo1);
  return `Actúa como experto en investigación académica y formulación de títulos de artículos científicos.

Genera UNA sola segunda sugerencia de título académico, clara, bien escrita, viable y alineada obligatoriamente con la carrera del estudiante.

La segunda sugerencia NO debe estar en la misma etapa o enfoque que la primera sugerencia.

INFORMACIÓN DEL ESTUDIANTE:
Carrera: ${data.carrera}
Materia: ${data.materia}
Tema general: ${data.temaGeneral}
Lugar o contexto: ${data.lugarContexto}
Problema o necesidad: ${data.problemaNecesidad}
Grupo de estudio: ${data.grupoEstudio}
Año o período de datos: ${data.anioPeriodo}
Objetivo del artículo: ${data.objetivoArticulo}
Resultado esperado: ${data.resultadoEsperado}

PRIMERA SUGERENCIA GENERADA:
${data.sugerenciaTitulo1}

REGLAS:
1. Alinea el título directamente con la carrera del estudiante.
2. Si el tema está mal enfocado, toma la idea importante y adáptala a la carrera.
3. Trabaja una etapa diferente a la primera sugerencia.
4. Si la primera es de diagnóstico, análisis o identificación de factores, la segunda puede ser de propuesta, estrategia, diseño, plan de mejora, evaluación o implementación viable.
5. Si la primera es de propuesta, estrategia, diseño, plan de mejora o implementación, la segunda puede ser de diagnóstico, análisis, identificación de factores o evaluación.
6. No repitas la misma idea con otras palabras.
7. Debe permitir entender qué se investiga, en quiénes, dónde y en qué año o período.
8. Evita temas demasiado amplios, históricos o imposibles de terminar en poco tiempo.
9. La implementación solo es válida si es viable para un artículo corto.
10. No uses lenguaje informal; conviértelo en lenguaje académico.
11. No generes explicación, lista, comentario ni justificación.
12. Devuelve únicamente el título final.

ESTRUCTURA RECOMENDADA:
Acción investigativa + tema específico + grupo de estudio + contexto/institución + año o período.

RESPUESTA:`;
}

function depurarTitulo(value) {
  return clean(value)
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```$/g, "")
    .replace(/^RESPUESTA:\s*/i, "")
    .replace(/^Título:\s*/i, "")
    .replace(/^['"]+|['"]+$/g, "")
    .replace(/^[-•\d.)\s]+/, "")
    .replace(/[.;]+$/g, "")
    .trim();
}

function extraerTextoGemini(data = {}) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  return clean(parts.map((part) => part.text || "").join(" "));
}

async function llamarGemini(prompt) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY no está configurada en Netlify.");

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.35,
        topP: 0.9,
        maxOutputTokens: 120
      }
    })
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error?.message || `Gemini HTTP ${response.status}`);

  const titulo = depurarTitulo(extraerTextoGemini(data));
  if (!titulo) throw new Error("Gemini no devolvió un título válido.");
  return titulo;
}

function depurarSugerencias(sugerencias = [], previos = []) {
  const usados = new Set((previos || []).map(normalize).filter(Boolean));
  const salida = [];

  sugerencias.forEach((item) => {
    const titulo = depurarTitulo(item);
    const key = normalize(titulo);
    if (!titulo || usados.has(key) || salida.some((actual) => normalize(actual) === key)) return;
    salida.push(titulo);
  });

  return salida.slice(0, 2);
}

async function generarConGemini(payload = {}) {
  const sugerenciaTitulo1 = await llamarGemini(promptSugerencia1(payload));
  const sugerenciaTitulo2 = await llamarGemini(promptSugerencia2(payload, sugerenciaTitulo1));
  return depurarSugerencias([sugerenciaTitulo1, sugerenciaTitulo2], payload.titulosYaGenerados || []);
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return jsonResponse(200, { ok: true });
  if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Método no permitido." });

  const payload = parsePayload(event);
  if (!payload) return jsonResponse(400, { ok: false, error: "El cuerpo de la solicitud no es JSON válido." });

  const errorPayload = validarPayload(payload);
  if (errorPayload) return jsonResponse(400, { ok: false, error: errorPayload });

  try {
    const sugerencias = await generarConGemini(payload);
    if (sugerencias.length < 2) throw new Error("Gemini no generó dos sugerencias diferentes.");

    return jsonResponse(200, {
      ok: true,
      origen: "gemini-netlify",
      bloqueado: false,
      motivo: "",
      advertencia: "Sugerencias generadas únicamente por Gemini.",
      sugerencias
    });
  } catch (error) {
    return jsonResponse(502, {
      ok: false,
      origen: "gemini-error",
      bloqueado: true,
      motivo: error.message || "Gemini no pudo generar sugerencias.",
      error: error.message || "Gemini no pudo generar sugerencias."
    });
  }
}
