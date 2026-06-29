/*
  Nombre completo: ta-titulo-articulo-gemini-client.service.js
  Ruta o ubicación: /Requisitos/Titulos/src/services/ta-titulo-articulo-gemini-client.service.js
  Función o funciones:
  - Solicitar sugerencias de títulos académicos a Gemini cuando esté disponible.
  - En Electron, llamar al puente seguro IPC o al protocolo interno seguro sin exponer GEMINI_API_KEY al navegador.
  - En Netlify, llamar a la Netlify Function segura.
  - Activar fallbackLocal con motor inteligente sin IA cuando Gemini no responda.
  - Mostrar advertencias claras sin bloquear al estudiante.
  Se conecta con:
  - Requisitos/Titulos/src/estudiante/ta-titulo-articulo-estudiante.app.js
  - Requisitos/Titulos/src/services/ta-titulo-articulo-motor-local.service.js
  - Requisitos/Titulos/electron/ta-titulo-articulo-preload.cjs
  - Requisitos/Titulos/electron/ta-titulo-articulo-main.js
  - Requisitos/Titulos/electron/ta-titulo-articulo-gemini.service.js
  - Requisitos/Titulos/netlify/functions/ta-titulo-articulo-gemini.js
*/

import { TaTituloArticuloMotorLocal } from "./ta-titulo-articulo-motor-local.service.js";

const ENDPOINT = "/.netlify/functions/ta-titulo-articulo-gemini";
const ELECTRON_PROTOCOL_ENDPOINT = "ta-titulos://gemini/generar-sugerencias";
const FILE_PATH = "Requisitos/Titulos/src/services/ta-titulo-articulo-gemini-client.service.js";
const MAIN_PATH = "Requisitos/Titulos/electron/ta-titulo-articulo-main.js";
const ORIGENES_GEMINI_VALIDOS = new Set(["gemini-netlify", "gemini-electron"]);

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizar(value) {
  return clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function errorEnArchivo(message) {
  return new Error(`[Archivo: ${FILE_PATH}] ${message}`);
}

function getWindow() {
  return typeof window !== "undefined" ? window : null;
}

function estaEnElectronFile() {
  const win = getWindow();
  if (!win?.location) return false;
  return win.location.protocol === "file:" || new URLSearchParams(win.location.search).get("taRuntime")?.startsWith("electron");
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

function buildBody(payload = {}) {
  return {
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
}

function validarRespuestaGemini(data, body) {
  if (!data || data.ok === false) {
    throw errorEnArchivo(data?.error || data?.motivo || "Gemini no pudo generar sugerencias.");
  }

  if (!ORIGENES_GEMINI_VALIDOS.has(data.origen)) {
    throw errorEnArchivo(`Las sugerencias no fueron generadas por Gemini. Origen recibido: ${clean(data.origen) || "sin origen"}.`);
  }

  const sugerencias = dedupeTitulos(data.sugerencias || [], body.titulosYaGenerados);
  if (sugerencias.length < 2) {
    throw errorEnArchivo("Gemini no generó dos sugerencias diferentes. Ajuste la información ingresada.");
  }

  return {
    ok: true,
    origen: data.origen,
    archivo: data.archivo || FILE_PATH,
    sugerencias,
    advertencia: clean(data.advertencia),
    bloqueado: Boolean(data.bloqueado),
    motivo: clean(data.motivo)
  };
}

function fallbackLocal(body, error) {
  const detalle = clean(error?.message || error);
  console.warn(`[Títulos Gemini] Se activa fallbackLocal. ${detalle}`);
  return TaTituloArticuloMotorLocal.generarSugerenciasTitulo(body, {
    errorOriginal: detalle
  });
}

async function llamarPorProtocoloElectron(body) {
  let response;
  try {
    response = await fetch(ELECTRON_PROTOCOL_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch (error) {
    throw errorEnArchivo(`No se pudo conectar con el protocolo interno ${ELECTRON_PROTOCOL_ENDPOINT}. Revise ${MAIN_PATH}. Detalle: ${error.message || error}`);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw errorEnArchivo(data?.error || data?.motivo || `Error HTTP ${response.status} en protocolo interno de Electron. Revise ${MAIN_PATH}.`);
  }

  return validarRespuestaGemini(data, body);
}

async function llamarPorNetlify(body) {
  let response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch (error) {
    throw errorEnArchivo(`No se pudo conectar con ${ENDPOINT}. Si está en Electron, use npm run electron:estudiante. Detalle: ${error.message || error}`);
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw errorEnArchivo(data?.error || data?.motivo || `Error HTTP ${response.status}`);
  }

  return validarRespuestaGemini(data, body);
}

async function generarSugerenciasTitulo(payload = {}) {
  const body = buildBody(payload);

  try {
    const win = getWindow();
    if (win?.taTituloArticuloElectron?.generarSugerenciasTitulo) {
      const data = await win.taTituloArticuloElectron.generarSugerenciasTitulo(body);
      return validarRespuestaGemini(data, body);
    }

    if (estaEnElectronFile()) {
      return await llamarPorProtocoloElectron(body);
    }

    return await llamarPorNetlify(body);
  } catch (error) {
    return fallbackLocal(body, error);
  }
}

export const TaTituloArticuloGemini = Object.freeze({
  generarSugerenciasTitulo
});
