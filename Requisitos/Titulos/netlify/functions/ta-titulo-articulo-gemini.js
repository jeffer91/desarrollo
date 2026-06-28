/*
  Nombre completo: ta-titulo-articulo-gemini.js
  Ruta o ubicación: /Requisitos/Titulos/netlify/functions/ta-titulo-articulo-gemini.js
  Función o funciones:
  - Entregar dos sugerencias de título por etapa sin romper la pantalla del estudiante.
  - Mantener respuesta JSON limpia para Netlify.
  - Servir como respaldo estable mientras se valida la conexión externa de IA.
  Se conecta con:
  - Requisitos/Titulos/src/services/ta-titulo-articulo-gemini-client.service.js
  - Requisitos/Titulos/src/estudiante/ta-titulo-articulo-estudiante.app.js
*/

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

function depurarTitulo(value) {
  return clean(value)
    .replace(/^['"]+|['"]+$/g, "")
    .replace(/[.;]+$/g, "")
    .trim();
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

function construirSugerencias(payload) {
  const carrera = clean(payload.carrera);
  const tema = clean(payload.temaGeneral).toLowerCase();
  const problema = clean(payload.problemaNecesidad).toLowerCase();
  const contexto = clean(payload.lugarContexto);
  const grupo = clean(payload.grupoEstudio).toLowerCase();
  const resultado = clean(payload.resultadoEsperado).toLowerCase();
  const manual = clean(payload.tituloManual);

  const candidatos = [
    manual ? `Análisis de ${manual} desde el enfoque de ${carrera}` : "",
    `Análisis de ${tema} frente a ${problema} en ${grupo} de ${contexto}`,
    `Propuesta de mejora para ${tema} en ${grupo} de ${contexto}`,
    `Evaluación de ${tema} y su relación con ${resultado} en ${contexto}`,
    `Diseño de una propuesta relacionada con ${tema} para ${grupo} de ${contexto}`
  ];

  return depurarSugerencias(candidatos, payload.titulosYaGenerados || []);
}

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return jsonResponse(200, { ok: true });
  if (event.httpMethod !== "POST") return jsonResponse(405, { ok: false, error: "Método no permitido." });

  const payload = parsePayload(event);
  if (!payload) return jsonResponse(400, { ok: false, error: "El cuerpo de la solicitud no es JSON válido." });

  const errorPayload = validarPayload(payload);
  if (errorPayload) return jsonResponse(400, { ok: false, error: errorPayload });

  const sugerencias = construirSugerencias(payload);
  if (sugerencias.length < 2) {
    return jsonResponse(422, {
      ok: false,
      error: "No se pudieron generar dos sugerencias diferentes. Ajuste la información ingresada."
    });
  }

  return jsonResponse(200, {
    ok: true,
    bloqueado: false,
    motivo: "",
    advertencia: "Sugerencias generadas como respaldo estable del servidor.",
    sugerencias
  });
}
