/*
  Nombre completo: ta-titulo-articulo-gemini-client.service.js
  Ruta o ubicación: /Requisitos/Titulos/src/services/ta-titulo-articulo-gemini-client.service.js
  Función o funciones:
  - Solicitar sugerencias de títulos académicos a una Netlify Function segura.
  - No exponer GEMINI_API_KEY en el navegador.
  - Entregar fallback local cuando la función todavía no esté desplegada o no responda.
  - Garantizar que las dos sugerencias correspondan a fases distintas del análisis.
  Se conecta con:
  - Requisitos/Titulos/src/estudiante/ta-titulo-articulo-estudiante.app.js
  - Requisitos/Titulos/netlify/functions/ta-titulo-articulo-gemini.js
*/

const ENDPOINT = "/.netlify/functions/ta-titulo-articulo-gemini";

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizar(value) {
  return clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function depurarTemaBase(value) {
  const texto = clean(value || "tema seleccionado")
    .replace(/^(mejorar|mejora\s+de|mejora\s+del|fortalecer|optimizar|diseñar|implementar)\s+/i, "")
    .trim();
  return texto || clean(value || "tema seleccionado");
}

function conectorDe(value) {
  const texto = clean(value);
  const lower = normalizar(texto);
  if (lower.startsWith("el ")) return `del ${texto.slice(3)}`;
  if (lower.startsWith("la ")) return `de la ${texto.slice(3)}`;
  if (lower.startsWith("los ")) return `de los ${texto.slice(4)}`;
  if (lower.startsWith("las ")) return `de las ${texto.slice(4)}`;
  return `de ${texto}`;
}

function tomarPrimeroValido(candidatos = [], usados = new Set()) {
  for (const candidato of candidatos) {
    const titulo = clean(candidato).replace(/^['"]+|['"]+$/g, "");
    const key = normalizar(titulo);
    if (titulo && !usados.has(key)) return titulo;
  }
  return "";
}

function dedupeTitulos(titulos = [], titulosYaGenerados = []) {
  const usados = new Set(titulosYaGenerados.map(normalizar).filter(Boolean));
  const salida = [];

  titulos.forEach((titulo) => {
    const limpio = clean(titulo).replace(/^['"]+|['"]+$/g, "");
    const key = normalizar(limpio);
    if (!limpio || usados.has(key) || salida.some((item) => normalizar(item) === key)) return;
    salida.push(limpio);
  });

  return salida.slice(0, 2);
}

function sugerenciasPorFases(payload = {}) {
  const tema = depurarTemaBase(payload.temaGeneral).toLowerCase();
  const problema = clean(payload.problemaNecesidad || "la necesidad identificada").toLowerCase();
  const contexto = clean(payload.lugarContexto || "el contexto de estudio");
  const grupo = clean(payload.grupoEstudio || "el grupo de estudio").toLowerCase();
  const periodo = clean(payload.anioPeriodoDatos);
  const carrera = clean(payload.carrera || "la carrera del estudiante");
  const periodoTexto = periodo ? `, ${periodo}` : "";
  const usados = new Set((payload.titulosYaGenerados || []).map(normalizar).filter(Boolean));

  const diagnostico = tomarPrimeroValido([
    `Diagnóstico de los factores asociados a ${problema} en ${grupo} de ${contexto}${periodoTexto}`,
    `Análisis de las causas que afectan ${tema} en ${grupo} de ${contexto}${periodoTexto}`,
    `Caracterización de la situación actual ${conectorDe(tema)} en ${contexto}${periodoTexto}`
  ], usados);

  if (diagnostico) usados.add(normalizar(diagnostico));

  const propuesta = tomarPrimeroValido([
    `Propuesta de mejora ${conectorDe(tema)} en ${grupo} de ${contexto}${periodoTexto}`,
    `Diseño de una estrategia para atender ${problema} en ${grupo} de ${contexto}: enfoque desde ${carrera}`,
    `Plan de intervención para fortalecer ${tema} en ${contexto}${periodoTexto}`
  ], usados);

  return dedupeTitulos([diagnostico, propuesta], payload.titulosYaGenerados || []);
}

function fallbackLocal(payload = {}) {
  const sugerencias = sugerenciasPorFases(payload);
  return {
    ok: true,
    origen: "fallback-local",
    sugerencias,
    advertencia: "Sugerencias generadas localmente en fases distintas: diagnóstico y propuesta.",
    bloqueado: false,
    motivo: ""
  };
}

async function generarSugerenciasTitulo(payload = {}) {
  const body = {
    carrera: clean(payload.carrera),
    codigoCarrera: clean(payload.codigoCarrera),
    temaGeneral: clean(payload.temaGeneral),
    problemaNecesidad: clean(payload.problemaNecesidad),
    lugarContexto: clean(payload.lugarContexto),
    grupoEstudio: clean(payload.grupoEstudio),
    anioPeriodoDatos: clean(payload.anioPeriodoDatos),
    objetivoArticulo: clean(payload.objetivoArticulo),
    resultadoEsperado: clean(payload.resultadoEsperado),
    tituloManual: clean(payload.tituloManual),
    numeroTitulo: Number(payload.numeroTitulo || 0),
    titulosYaGenerados: Array.isArray(payload.titulosYaGenerados) ? payload.titulosYaGenerados.map(clean).filter(Boolean) : []
  };

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => null);
    if (!response.ok || !data || data.ok === false) {
      throw new Error(data?.error || `Error HTTP ${response.status}`);
    }

    return {
      ok: true,
      origen: "gemini-netlify",
      sugerencias: dedupeTitulos(data.sugerencias || [], body.titulosYaGenerados),
      advertencia: clean(data.advertencia),
      bloqueado: Boolean(data.bloqueado),
      motivo: clean(data.motivo)
    };
  } catch (error) {
    console.warn(`[Títulos Gemini] Se usará fallback local: ${error.message}`);
    return fallbackLocal(body);
  }
}

export const TaTituloArticuloGemini = Object.freeze({
  generarSugerenciasTitulo
});
