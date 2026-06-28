/*
  Nombre completo: ta-titulo-articulo-gemini-client.service.js
  Ruta o ubicación: /Requisitos/Titulos/src/services/ta-titulo-articulo-gemini-client.service.js
  Función o funciones:
  - Solicitar sugerencias de títulos académicos a una Netlify Function segura.
  - No exponer GEMINI_API_KEY en el navegador.
  - Entregar fallback local cuando la función todavía no esté desplegada o no responda.
  Se conecta con:
  - Requisitos/Titulos/src/estudiante/ta-titulo-articulo-estudiante.app.js
  - Requisitos/Titulos/netlify/functions/ta-titulo-articulo-gemini.js
*/

import { construirTitulo } from "./ta-titulo-articulo-coherencia.service.js";

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

function fallbackLocal(payload = {}) {
  const base = construirTitulo({
    temaGeneral: payload.temaGeneral,
    problemaNecesidad: payload.problemaNecesidad,
    lugarContexto: payload.lugarContexto,
    grupoEstudio: payload.grupoEstudio,
    anioPeriodoDatos: payload.anioPeriodoDatos,
    objetivoArticulo: payload.objetivoArticulo,
    resultadoEsperado: payload.resultadoEsperado,
    tituloFinal: payload.tituloManual
  }, payload.carrera);

  const tema = clean(payload.temaGeneral || "tema seleccionado").toLowerCase();
  const problema = clean(payload.problemaNecesidad || "necesidad identificada").toLowerCase();
  const contexto = clean(payload.lugarContexto || "el contexto de estudio");
  const grupo = clean(payload.grupoEstudio || "el grupo de estudio").toLowerCase();
  const carrera = clean(payload.carrera || "la carrera del estudiante");
  const manual = clean(payload.tituloManual);

  const candidatos = [
    manual ? `Análisis de ${manual} desde el enfoque de ${carrera}` : base,
    `Propuesta de mejora relacionada con ${tema} frente a ${problema} en ${grupo} de ${contexto}`,
    `Análisis de ${tema} en ${grupo} de ${contexto}: enfoque desde ${carrera}`
  ];

  const sugerencias = dedupeTitulos(candidatos, payload.titulosYaGenerados || []);
  return {
    ok: true,
    origen: "fallback-local",
    sugerencias,
    advertencia: "Sugerencias generadas localmente. Al desplegar Gemini en Netlify, se usarán sugerencias inteligentes seguras.",
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
