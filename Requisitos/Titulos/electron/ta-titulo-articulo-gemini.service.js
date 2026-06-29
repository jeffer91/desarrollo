/*
  Nombre completo: ta-titulo-articulo-gemini.service.js
  Ruta o ubicación: /Requisitos/Titulos/electron/ta-titulo-articulo-gemini.service.js
  Función o funciones:
  - Leer GEMINI_API_KEY desde variables de entorno o archivo .env local.
  - Generar sugerencias de títulos únicamente con Gemini en modo Electron.
  - Mantener la clave fuera del navegador y fuera de GitHub.
  - Devolver errores indicando el archivo responsable.
  Se conecta con:
  - Requisitos/Titulos/electron/ta-titulo-articulo-main.js
  - Requisitos/Titulos/electron/ta-titulo-articulo-preload.cjs
  - Requisitos/Titulos/src/services/ta-titulo-articulo-gemini-client.service.js
*/

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const FILE_PATH = "Requisitos/Titulos/electron/ta-titulo-articulo-gemini.service.js";

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalize(value) {
  return clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function errorEnArchivo(message) {
  return new Error(`[Archivo: ${FILE_PATH}] ${message}`);
}

function cargarEnvLocal(rootDir) {
  const envPath = join(rootDir, ".env");
  if (!existsSync(envPath)) return;

  const content = readFileSync(envPath, "utf8");
  content.split(/\r?\n/).forEach((line) => {
    const raw = line.trim();
    if (!raw || raw.startsWith("#") || !raw.includes("=")) return;
    const index = raw.indexOf("=");
    const key = raw.slice(0, index).trim();
    let value = raw.slice(index + 1).trim();
    value = value.replace(/^['"]|['"]$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  });
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
  if (faltante) throw errorEnArchivo(`Complete el campo ${faltante[0]} antes de generar sugerencias.`);
  if (![1, 2, 3].includes(Number(payload.numeroTitulo || 0))) throw errorEnArchivo("Número de título inválido.");
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

async function llamarGemini(prompt, rootDir) {
  cargarEnvLocal(rootDir);

  const apiKey = process.env.GEMINI_API_KEY || "";
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  if (!apiKey) throw errorEnArchivo("GEMINI_API_KEY no está configurada en Requisitos/Titulos/.env.");

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  let response;
  try {
    response = await fetch(endpoint, {
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
  } catch (error) {
    throw errorEnArchivo(`No se pudo conectar con Gemini: ${error.message || error}`);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) throw errorEnArchivo(data?.error?.message || `Gemini HTTP ${response.status}`);

  const titulo = depurarTitulo(extraerTextoGemini(data));
  if (!titulo) throw errorEnArchivo("Gemini no devolvió un título válido.");
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

export async function generarSugerenciasTituloElectron(payload = {}, rootDir) {
  validarPayload(payload);
  const sugerenciaTitulo1 = await llamarGemini(promptSugerencia1(payload), rootDir);
  const sugerenciaTitulo2 = await llamarGemini(promptSugerencia2(payload, sugerenciaTitulo1), rootDir);
  const sugerencias = depurarSugerencias([sugerenciaTitulo1, sugerenciaTitulo2], payload.titulosYaGenerados || []);

  if (sugerencias.length < 2) throw errorEnArchivo("Gemini no generó dos sugerencias diferentes.");

  return {
    ok: true,
    origen: "gemini-electron",
    bloqueado: false,
    archivo: FILE_PATH,
    motivo: "",
    advertencia: "Sugerencias generadas únicamente por Gemini en Electron.",
    sugerencias
  };
}
