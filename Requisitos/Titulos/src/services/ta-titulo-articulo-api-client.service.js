/*
  Nombre completo: ta-titulo-articulo-api-client.service.js
  Ruta o ubicación: /src/services/ta-titulo-articulo-api-client.service.js
  Función o funciones:
  - Centralizar llamadas del frontend hacia Netlify Functions.
  - Enviar acciones de estudiante, coordinador, administrador y Telegram sin repetir código.
  - Normalizar respuestas correctas y errores para las pantallas públicas y la pantalla local.
  - Resolver automáticamente el endpoint correcto para Netlify, Netlify Dev, Live Server, Vite, doble click y Electron.
  - Solicitar y recordar URL de funciones/token administrativo solo cuando el modo local lo necesita.
*/

const BASE_FUNCTIONS_PATH = "/.netlify/functions";
const BASE_FUNCTIONS_URL_KEY = "ta.titulo.articulo.baseFunctionsUrl";
const ADMIN_TOKEN_KEY = "ta.titulo.articulo.adminToken";
const LOCAL_FUNCTIONS_URL_DEFAULT = "http://127.0.0.1:8888/.netlify/functions";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
const ADMIN_ENDPOINTS = new Set(["admin", "telegram"]);

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizarBaseFunctionsUrl(value) {
  const url = clean(value).replace(/\/+$/, "");
  if (!url) return "";

  if (url.endsWith(BASE_FUNCTIONS_PATH)) return url;

  if (url.includes(`${BASE_FUNCTIONS_PATH}/`)) {
    return url.split(`${BASE_FUNCTIONS_PATH}/`)[0] + BASE_FUNCTIONS_PATH;
  }

  return url + BASE_FUNCTIONS_PATH;
}

function getWindow() {
  return typeof window !== "undefined" ? window : null;
}

function getLocation() {
  return getWindow()?.location || null;
}

function getLocalStorageValue(key) {
  try {
    return clean(getWindow()?.localStorage?.getItem(key));
  } catch (error) {
    console.warn(`[Títulos API] No se pudo leer localStorage: ${error.message}`);
    return "";
  }
}

function setLocalStorageValue(key, value) {
  try {
    getWindow()?.localStorage?.setItem(key, value);
  } catch (error) {
    console.warn(`[Títulos API] No se pudo guardar localStorage: ${error.message}`);
  }
}

function obtenerParametroUrl(...nombres) {
  const location = getLocation();
  if (!location?.search) return "";

  const params = new URLSearchParams(location.search);
  for (const nombre of nombres) {
    const value = clean(params.get(nombre));
    if (value) return value;
  }

  return "";
}

function estaEnArchivoLocal() {
  return getLocation()?.protocol === "file:";
}

function estaEnHttpLocal() {
  const location = getLocation();
  if (!location) return false;
  return ["http:", "https:"].includes(location.protocol) && LOCAL_HOSTS.has(location.hostname);
}

function estaEnNetlifyDev() {
  const location = getLocation();
  return estaEnHttpLocal() && clean(location?.port) === "8888";
}

function obtenerBaseConfigurada() {
  const desdeParametro = normalizarBaseFunctionsUrl(
    obtenerParametroUrl("taFunctionsUrl", "functionsUrl", "apiUrl", "baseFunctionsUrl")
  );

  if (desdeParametro) {
    setLocalStorageValue(BASE_FUNCTIONS_URL_KEY, desdeParametro);
    return desdeParametro;
  }

  const desdeGlobal = normalizarBaseFunctionsUrl(getWindow()?.TA_TITULO_ARTICULO_FUNCTIONS_URL);
  if (desdeGlobal) {
    setLocalStorageValue(BASE_FUNCTIONS_URL_KEY, desdeGlobal);
    return desdeGlobal;
  }

  return normalizarBaseFunctionsUrl(getLocalStorageValue(BASE_FUNCTIONS_URL_KEY));
}

function pedirBaseFunctionsUrl() {
  const ingresada = normalizarBaseFunctionsUrl(
    prompt(
      "Ingrese la URL base de Netlify Functions para conectar este modo local.\n\n" +
        "Use una de estas opciones:\n" +
        "1) Local con Netlify Dev: http://127.0.0.1:8888/.netlify/functions\n" +
        "2) Publicada: https://tu-sitio.netlify.app/.netlify/functions",
      LOCAL_FUNCTIONS_URL_DEFAULT
    ) || ""
  );

  if (ingresada) {
    setLocalStorageValue(BASE_FUNCTIONS_URL_KEY, ingresada);
    return ingresada;
  }

  throw new Error("No se configuró la URL base de Netlify Functions para este modo de apertura.");
}

function obtenerBaseFunctionsPath() {
  const location = getLocation();
  if (!location) return BASE_FUNCTIONS_PATH;

  if (estaEnNetlifyDev()) return BASE_FUNCTIONS_PATH;

  if (estaEnArchivoLocal() || estaEnHttpLocal()) {
    return obtenerBaseConfigurada() || pedirBaseFunctionsUrl();
  }

  return BASE_FUNCTIONS_PATH;
}

function obtenerAdminToken(options = {}) {
  const desdeOptions = clean(options.adminToken);
  if (desdeOptions) return desdeOptions;

  const desdeParametro = clean(obtenerParametroUrl("taAdminToken", "adminToken"));
  if (desdeParametro) {
    setLocalStorageValue(ADMIN_TOKEN_KEY, desdeParametro);
    return desdeParametro;
  }

  const guardado = clean(getLocalStorageValue(ADMIN_TOKEN_KEY));
  if (guardado) return guardado;

  const ingresado = clean(prompt("Ingrese el token administrativo de Títulos.") || "");
  if (ingresado) {
    setLocalStorageValue(ADMIN_TOKEN_KEY, ingresado);
    return ingresado;
  }

  throw new Error("No se configuró el token administrativo.");
}

function crearEndpoint(nombre) {
  return `${obtenerBaseFunctionsPath()}/ta-titulo-articulo-api-${nombre}`;
}

async function leerRespuestaJson(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (error) {
    return {
      ok: false,
      error: "La respuesta del servidor no tiene formato JSON válido.",
      detalle: error && error.message ? error.message : String(error)
    };
  }
}

async function llamarFuncion(nombreEndpoint, action, payload = {}, options = {}) {
  const headers = { "Content-Type": "application/json" };

  if (ADMIN_ENDPOINTS.has(nombreEndpoint)) {
    headers["x-ta-admin-token"] = obtenerAdminToken(options);
  }

  const response = await fetch(crearEndpoint(nombreEndpoint), {
    method: "POST",
    headers,
    body: JSON.stringify({ action, payload })
  });

  const data = await leerRespuestaJson(response);

  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `Error HTTP ${response.status}`);
  }

  return data;
}

export const TaTituloArticuloApi = Object.freeze({
  estudiante: {
    buscarPorCedula(cedula) {
      return llamarFuncion("estudiante", "buscarPorCedula", { cedula });
    },
    consultarEstado(cedula) {
      return llamarFuncion("estudiante", "consultarEstado", { cedula });
    },
    guardarTelegram(cedula, telegramUser) {
      return llamarFuncion("estudiante", "guardarTelegram", { cedula, telegramUser });
    },
    enviarPropuestas(datosEnvio) {
      return llamarFuncion("estudiante", "enviarPropuestas", datosEnvio);
    }
  },

  coordinador: {
    listarCoordinadores() {
      return llamarFuncion("coordinador", "listarCoordinadores");
    },
    cargarEstudiantes(coordinadorId) {
      return llamarFuncion("coordinador", "cargarEstudiantes", { coordinadorId });
    },
    iniciarRevision(envioId, coordinadorId) {
      return llamarFuncion("coordinador", "iniciarRevision", { envioId, coordinadorId });
    },
    guardarRevision(revision) {
      return llamarFuncion("coordinador", "guardarRevision", revision);
    }
  },

  admin: {
    listarResumen(adminToken) {
      return llamarFuncion("admin", "listarResumen", {}, { adminToken });
    },
    activarPeriodo(periodoId, adminToken) {
      return llamarFuncion("admin", "activarPeriodo", { periodoId }, { adminToken });
    },
    guardarCoordinador(nombre, adminToken) {
      return llamarFuncion("admin", "guardarCoordinador", { nombre }, { adminToken });
    },
    asignarCoordinadorCarrera(datos, adminToken) {
      return llamarFuncion("admin", "asignarCoordinadorCarrera", datos, { adminToken });
    }
  },

  telegram: {
    enviarMensaje(chatId, mensaje, adminToken) {
      return llamarFuncion("telegram", "enviarMensaje", { chatId, mensaje }, { adminToken });
    }
  },

  diagnostico: {
    obtenerBaseFunctionsPath,
    limpiarConfiguracionLocal() {
      setLocalStorageValue(BASE_FUNCTIONS_URL_KEY, "");
      setLocalStorageValue(ADMIN_TOKEN_KEY, "");
    }
  }
});
