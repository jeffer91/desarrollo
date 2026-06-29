/*
  Nombre completo: ta-titulo-articulo-gemini-client.service.js
  Ruta o ubicación: /Requisitos/Titulos/src/services/ta-titulo-articulo-gemini-client.service.js
  Función o funciones:
  - Solicitar sugerencias de títulos académicos exclusivamente a la Netlify Function segura de Gemini.
  - No exponer GEMINI_API_KEY en el navegador.
  - Enviar a la función segura todos los datos necesarios para armar los prompts de IA.
  - No generar sugerencias locales cuando Gemini no esté disponible.
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

async function generarSugerenciasTitulo(payload = {}) {
  const body = {
    carrera: clean(payload.carrera),
    materia: clean(payload.materia || payload.nombreMateria || payload.asignatura || payload.nombreAsignatura),
    codigoCarrera: clean(payload.codigoCarrera),
    temaGeneral: clean(payload.temaGeneral),
    problemaNecesidad: clean(payload.problemaNecesidad),
    lugarContexto: clean(payload.lugarContexto),
    grupoEstudio: clean(payload.grupoEstudio),
    anioPeriodoDatos: clean(payload.anioPeriodoDatos || payload.anioPeriodo),
    objetivoArticulo: clean(payload.objetivoArticulo),
    resultadoEsperado: clean(payload.resultadoEsperado),
    tituloManual: clean(payload.tituloManual),
    numeroTitulo: Number(payload.numeroTitulo || 0),
    titulosYaGenerados: Array.isArray(payload.titulosYaGenerados) ? payload.titulosYaGenerados.map(clean).filter(Boolean) : []
  };

  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.ok === false) {
    throw new Error(data?.error || data?.motivo || `Error HTTP ${response.status}`);
  }

  if (data.origen !== "gemini-netlify") {
    throw new Error("Las sugerencias no fueron generadas por Gemini. Revise GEMINI_API_KEY en Netlify.");
  }

  const sugerencias = dedupeTitulos(data.sugerencias || [], body.titulosYaGenerados);
  if (sugerencias.length < 2) {
    throw new Error("Gemini no generó dos sugerencias diferentes. Ajuste la información ingresada.");
  }

  return {
    ok: true,
    origen: "gemini-netlify",
    sugerencias,
    advertencia: clean(data.advertencia),
    bloqueado: Boolean(data.bloqueado),
    motivo: clean(data.motivo)
  };
}

export const TaTituloArticuloGemini = Object.freeze({
  generarSugerenciasTitulo
});
