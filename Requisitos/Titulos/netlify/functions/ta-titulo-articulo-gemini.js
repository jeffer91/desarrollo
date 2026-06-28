/*
  Nombre completo: ta-titulo-articulo-gemini.js
  Ruta o ubicación: /Requisitos/Titulos/netlify/functions/ta-titulo-articulo-gemini.js
  Función o funciones:
  - Entregar dos sugerencias de título por etapa sin romper la pantalla del estudiante.
  - Mantener respuesta JSON limpia para Netlify.
  - Servir como respaldo estable mientras se valida la conexión externa de IA.
  - Generar títulos en fases distintas: una diagnóstica y otra propositiva.
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

function depurarTemaBase(value) {
  const texto = clean(value || "tema seleccionado")
    .replace(/^(mejorar|mejora\s+de|mejora\s+del|fortalecer|optimizar|diseñar|implementar)\s+/i, "")
    .trim();
  return texto || clean(value || "tema seleccionado");
}

function conectorDe(value) {
  const texto = clean(value);
  const lower = normalize(texto);
  if (lower.startsWith("el ")) return `del ${texto.slice(3)}`;
  if (lower.startsWith("la ")) return `de la ${texto.slice(3)}`;
  if (lower.startsWith("los ")) return `de los ${texto.slice(4)}`;
  if (lower.startsWith("las ")) return `de las ${texto.slice(4)}`;
  return `de ${texto}`;
}

function tomarPrimeroValido(candidatos = [], usados = new Set()) {
  for (const candidato of candidatos) {
    const titulo = depurarTitulo(candidato);
    const key = normalize(titulo);
    if (titulo && !usados.has(key)) return titulo;
  }
  return "";
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
  const tema = depurarTemaBase(payload.temaGeneral).toLowerCase();
  const problema = clean(payload.problemaNecesidad || "la necesidad identificada").toLowerCase();
  const contexto = clean(payload.lugarContexto || "el contexto de estudio");
  const grupo = clean(payload.grupoEstudio || "el grupo de estudio").toLowerCase();
  const periodo = clean(payload.anioPeriodoDatos);
  const carrera = clean(payload.carrera || "la carrera del estudiante");
  const periodoTexto = periodo ? `, ${periodo}` : "";
  const usados = new Set((payload.titulosYaGenerados || []).map(normalize).filter(Boolean));

  const diagnostico = tomarPrimeroValido([
    `Diagnóstico de los factores asociados a ${problema} en ${grupo} de ${contexto}${periodoTexto}`,
    `Análisis de las causas que afectan ${tema} en ${grupo} de ${contexto}${periodoTexto}`,
    `Caracterización de la situación actual ${conectorDe(tema)} en ${contexto}${periodoTexto}`
  ], usados);

  if (diagnostico) usados.add(normalize(diagnostico));

  const propuesta = tomarPrimeroValido([
    `Propuesta de mejora ${conectorDe(tema)} en ${grupo} de ${contexto}${periodoTexto}`,
    `Diseño de una estrategia para atender ${problema} en ${grupo} de ${contexto}: enfoque desde ${carrera}`,
    `Plan de intervención para fortalecer ${tema} en ${contexto}${periodoTexto}`
  ], usados);

  return depurarSugerencias([diagnostico, propuesta], payload.titulosYaGenerados || []);
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
      error: "No se pudieron generar dos sugerencias en fases distintas. Ajuste la información ingresada."
    });
  }

  return jsonResponse(200, {
    ok: true,
    bloqueado: false,
    motivo: "",
    advertencia: "Sugerencias generadas en fases distintas: diagnóstico y propuesta.",
    sugerencias
  });
}
