/*
  Nombre completo: ta-titulo-articulo-admin-ia.app.js
  Ruta o ubicación: /Requisitos/Titulos/src/admin/ta-titulo-articulo-admin-ia.app.js
  Función o funciones:
  - Controlar el módulo IA y conexiones del administrador.
  - Probar Gemini, Groq y motor local mediante Netlify Functions protegidas con token admin.
  - No leer, mostrar ni guardar claves de IA en el navegador.
*/

const BASE_FUNCTIONS_PATH = "/.netlify/functions";
const BASE_FUNCTIONS_URL_KEY = "ta.titulo.articulo.baseFunctionsUrl";
const ADMIN_TOKEN_KEY = "ta.titulo.articulo.adminToken";
const LOCAL_FUNCTIONS_URL_DEFAULT = "http://127.0.0.1:8888/.netlify/functions";
const ENDPOINT_NAME = "ta-titulo-articulo-api-ia";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

function byId(id) {
  return document.getElementById(id);
}

function getLocalStorageValue(key) {
  try {
    return clean(window.localStorage.getItem(key));
  } catch {
    return "";
  }
}

function setLocalStorageValue(key, value) {
  try {
    if (value) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    // No bloquear el panel si el navegador impide localStorage.
  }
}

function normalizarBaseFunctionsUrl(value) {
  const url = clean(value).replace(/\/+$/g, "");
  if (!url) return "";
  if (url.endsWith(BASE_FUNCTIONS_PATH)) return url;
  if (url.includes(`${BASE_FUNCTIONS_PATH}/`)) return url.split(`${BASE_FUNCTIONS_PATH}/`)[0] + BASE_FUNCTIONS_PATH;
  return url + BASE_FUNCTIONS_PATH;
}

function estaEnHttpLocal() {
  return ["http:", "https:"].includes(window.location.protocol) && LOCAL_HOSTS.has(window.location.hostname);
}

function estaEnNetlifyDev() {
  return estaEnHttpLocal() && clean(window.location.port) === "8888";
}

function obtenerBaseFunctionsPath() {
  if (estaEnNetlifyDev()) return BASE_FUNCTIONS_PATH;
  if (window.location.protocol === "file:" || estaEnHttpLocal()) {
    const guardada = normalizarBaseFunctionsUrl(getLocalStorageValue(BASE_FUNCTIONS_URL_KEY));
    if (guardada) return guardada;

    const ingresada = normalizarBaseFunctionsUrl(prompt(
      "Ingrese la URL base de Netlify Functions para probar IA.\n\nEjemplo local: http://127.0.0.1:8888/.netlify/functions\nEjemplo Netlify: https://tu-sitio.netlify.app/.netlify/functions",
      LOCAL_FUNCTIONS_URL_DEFAULT
    ) || "");
    if (!ingresada) throw new Error("No se configuró la URL base de Netlify Functions.");
    setLocalStorageValue(BASE_FUNCTIONS_URL_KEY, ingresada);
    return ingresada;
  }
  return BASE_FUNCTIONS_PATH;
}

function obtenerAdminToken() {
  const guardado = getLocalStorageValue(ADMIN_TOKEN_KEY);
  if (guardado) return guardado;
  const ingresado = clean(prompt("Ingrese el token administrativo para probar IA.") || "");
  if (!ingresado) throw new Error("No se configuró el token administrativo.");
  setLocalStorageValue(ADMIN_TOKEN_KEY, ingresado);
  return ingresado;
}

function endpoint() {
  return `${obtenerBaseFunctionsPath()}/${ENDPOINT_NAME}`;
}

function setMensaje(texto, tipo = "") {
  const msg = byId("ta-admin-ia-mensaje");
  if (!msg) return;
  msg.textContent = clean(texto);
  msg.classList.remove("ta-message--error", "ta-message--ok", "ta-message--warning");
  if (tipo) msg.classList.add(`ta-message--${tipo}`);
  msg.hidden = !texto;
}

function setText(id, value) {
  const element = byId(id);
  if (element) element.textContent = clean(value) || "---";
}

function estadoTexto(motor = {}) {
  return motor.disponible ? `Configurado · ${motor.modelo || "modelo no definido"}` : "No configurado";
}

function pintarEstado(data = {}) {
  const motores = data.motores || {};
  setText("ta-admin-ia-token", data.seguridad?.tokenAdmin || "---");
  setText("ta-admin-ia-frontend", data.seguridad?.clavesEnFrontend || "---");
  setText("ta-admin-ia-gemini-estado", estadoTexto(motores.gemini));
  setText("ta-admin-ia-groq-estado", estadoTexto(motores.groq));
  setText("ta-admin-ia-local-estado", estadoTexto(motores.local));
}

function pintarResultado(data = {}) {
  const box = byId("ta-admin-ia-resultado");
  if (!box) return;
  box.replaceChildren();

  const prueba = data.prueba || null;
  if (!prueba) {
    box.className = "ta-empty-state";
    box.textContent = "Sin prueba ejecutada.";
    return;
  }

  box.className = "ta-state-box";
  const titulo = document.createElement("p");
  titulo.innerHTML = `<strong>Motor:</strong> ${clean(prueba.motor)}`;
  box.appendChild(titulo);

  if (prueba.titulo) {
    const p = document.createElement("p");
    p.innerHTML = `<strong>Resultado:</strong> ${clean(prueba.titulo)}`;
    box.appendChild(p);
  }

  if (Array.isArray(prueba.sugerencias)) {
    prueba.sugerencias.forEach((sugerencia, index) => {
      const p = document.createElement("p");
      p.innerHTML = `<strong>Sugerencia ${index + 1}:</strong> ${clean(sugerencia)}`;
      box.appendChild(p);
    });
  }
}

async function llamarIA(action) {
  const response = await fetch(endpoint(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-ta-admin-token": obtenerAdminToken()
    },
    body: JSON.stringify({ action, payload: {} })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    pintarEstado(data);
    throw new Error(data.error || `Error HTTP ${response.status}`);
  }
  return data;
}

async function ejecutar(action, mensaje) {
  try {
    setMensaje(mensaje, "warning");
    const data = await llamarIA(action);
    pintarEstado(data);
    pintarResultado(data);
    setMensaje("Prueba ejecutada correctamente.", "ok");
  } catch (error) {
    console.error("[Títulos admin IA]", error);
    setMensaje(error.message || "No se pudo ejecutar la prueba de IA.", "error");
  }
}

function registrarEventos() {
  byId("ta-admin-ia-estado-btn")?.addEventListener("click", () => ejecutar("estadoIA", "Consultando estado de IA..."));
  byId("ta-admin-ia-gemini-btn")?.addEventListener("click", () => ejecutar("probarGemini", "Probando Gemini..."));
  byId("ta-admin-ia-groq-btn")?.addEventListener("click", () => ejecutar("probarGroq", "Probando Groq..."));
  byId("ta-admin-ia-local-btn")?.addEventListener("click", () => ejecutar("probarLocal", "Probando motor local..."));
  byId("ta-admin-ia-limpiar-token-btn")?.addEventListener("click", () => {
    setLocalStorageValue(ADMIN_TOKEN_KEY, "");
    setMensaje("Token administrativo local eliminado de este navegador.", "ok");
  });
}

function init() {
  registrarEventos();
  pintarResultado({});
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
