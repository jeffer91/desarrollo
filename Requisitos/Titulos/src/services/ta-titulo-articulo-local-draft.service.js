/*
  Nombre completo: ta-titulo-articulo-local-draft.service.js
  Ruta o ubicación: /Requisitos/Titulos/src/services/ta-titulo-articulo-local-draft.service.js
  Función o funciones:
  - Guardar borradores locales del formulario del estudiante sin escribirlos en Firebase.
  - Mantener tema, problema, contexto, objetivo, resultado, sugerencias y títulos temporales en el navegador/Electron.
  - Usar una clave separada por período y cédula.
  Se conecta con:
  - Requisitos/Titulos/src/estudiante/ta-titulo-articulo-estudiante.app.js
*/

const STORAGE_PREFIX = "ta.titulos.borrador";

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function safeSegment(value) {
  return clean(value).replace(/[^A-Za-z0-9_-]+/g, "_").replace(/^_+|_+$/g, "") || "sin_valor";
}

function getStorage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch (error) {
    console.warn(`[Títulos borrador local] localStorage no disponible: ${error.message}`);
    return null;
  }
}

function crearClave({ periodoId = "", cedula = "" } = {}) {
  return `${STORAGE_PREFIX}.${safeSegment(periodoId)}.${safeSegment(cedula)}`;
}

function guardar(contexto, data) {
  const storage = getStorage();
  if (!storage) return false;
  const clave = crearClave(contexto);
  const payload = {
    ...(data || {}),
    guardadoEn: new Date().toISOString()
  };
  storage.setItem(clave, JSON.stringify(payload));
  return true;
}

function cargar(contexto) {
  const storage = getStorage();
  if (!storage) return null;
  const clave = crearClave(contexto);
  const raw = storage.getItem(clave);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`[Títulos borrador local] Borrador inválido: ${error.message}`);
    storage.removeItem(clave);
    return null;
  }
}

function limpiar(contexto) {
  const storage = getStorage();
  if (!storage) return false;
  storage.removeItem(crearClave(contexto));
  return true;
}

function disponible() {
  return Boolean(getStorage());
}

export const TaTituloArticuloLocalDraft = Object.freeze({
  disponible,
  crearClave,
  guardar,
  cargar,
  limpiar
});
