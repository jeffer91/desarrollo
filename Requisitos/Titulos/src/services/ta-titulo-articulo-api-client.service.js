/*
  Nombre completo: ta-titulo-articulo-api-client.service.js
  Ruta o ubicación: /Requisitos/Titulos/src/services/ta-titulo-articulo-api-client.service.js
  Función o funciones:
  - Mantener la interfaz histórica TaTituloArticuloApi usada por estudiante, coordinador y administrador.
  - Elegir automáticamente el origen de datos según el entorno.
  - En modo local intentar Firebase directo.
  - En Netlify usar Netlify Functions.
  - Cargar Firebase directo de forma diferida para no romper doble click o Live Server al abrir la pantalla.
*/

import { TaTituloArticuloRuntime } from "./ta-titulo-articulo-runtime.service.js";

const BASE_FUNCTIONS_PATH = "/.netlify/functions";
const BASE_FUNCTIONS_URL_KEY = "ta.titulo.articulo.baseFunctionsUrl";
const ADMIN_TOKEN_KEY = "ta.titulo.articulo.adminToken";
const LOCAL_FUNCTIONS_URL_DEFAULT = "http://127.0.0.1:8888/.netlify/functions";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
const ADMIN_ENDPOINTS = new Set(["admin", "telegram"]);

let firebaseDirectPromise = null;

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

async function cargarFirebaseDirect() {
  if (!firebaseDirectPromise) {
    firebaseDirectPromise = import("./ta-titulo-articulo-firebase-direct.service.js").then((mod) => mod.TaTituloArticuloFirebaseDirect);
  }
  return firebaseDirectPromise;
}

function errorFirebaseDirecto(error) {
  const mensaje = clean(error?.message || error) || "Firebase directo no está disponible.";
  const necesitaSdk = mensaje.includes("Failed to resolve module specifier") || mensaje.includes("firebase/firestore") || mensaje.includes("import.meta.env");
  if (necesitaSdk) {
    return new Error(`${mensaje} Falta el Bloque 3 para dejar el SDK de Firebase compatible con doble click y Live Server.`);
  }
  return new Error(mensaje);
}

async function ejecutarLocal(namespace, metodo, args) {
  try {
    const firebaseDirect = await cargarFirebaseDirect();
    if (typeof firebaseDirect.disponible === "function" && !firebaseDirect.disponible()) {
      throw new Error("Firebase directo no está configurado.");
    }

    const grupo = firebaseDirect?.[namespace];
    const fn = grupo?.[metodo];
    if (typeof fn !== "function") throw new Error(`No existe ${namespace}.${metodo} en Firebase directo.`);

    const resultado = await fn(...args);
    return { ...(resultado || {}), origenDatos: "firebase-direct" };
  } catch (error) {
    throw errorFirebaseDirecto(error);
  }
}

async function ejecutarFunctions(namespace, metodo, args) {
  const mapa = {
    estudiante: {
      buscarPorCedula: () => llamarFuncion("estudiante", "buscarPorCedula", { cedula: args[0] }),
      consultarEstado: () => llamarFuncion("estudiante", "consultarEstado", { cedula: args[0] }),
      guardarTelegram: () => llamarFuncion("estudiante", "guardarTelegram", { cedula: args[0], telegramUser: args[1] }),
      enviarPropuestas: () => llamarFuncion("estudiante", "enviarPropuestas", args[0])
    },
    coordinador: {
      listarCoordinadores: () => llamarFuncion("coordinador", "listarCoordinadores"),
      cargarEstudiantes: () => llamarFuncion("coordinador", "cargarEstudiantes", { coordinadorId: args[0] }),
      iniciarRevision: () => llamarFuncion("coordinador", "iniciarRevision", { envioId: args[0], coordinadorId: args[1] }),
      guardarRevision: () => llamarFuncion("coordinador", "guardarRevision", args[0])
    },
    admin: {
      listarResumen: () => llamarFuncion("admin", "listarResumen", {}, { adminToken: args[0] }),
      activarPeriodo: () => llamarFuncion("admin", "activarPeriodo", { periodoId: args[0] }, { adminToken: args[1] }),
      guardarCoordinador: () => llamarFuncion("admin", "guardarCoordinador", { nombre: args[0] }, { adminToken: args[1] }),
      asignarCoordinadorCarrera: () => llamarFuncion("admin", "asignarCoordinadorCarrera", args[0], { adminToken: args[1] })
    },
    telegram: {
      enviarMensaje: () => llamarFuncion("telegram", "enviarMensaje", { chatId: args[0], mensaje: args[1] }, { adminToken: args[2] })
    }
  };

  const fn = mapa?.[namespace]?.[metodo];
  if (typeof fn !== "function") throw new Error(`No existe ${namespace}.${metodo} en Netlify Functions.`);
  const resultado = await fn();
  return { ...(resultado || {}), origenDatos: "netlify-functions" };
}

async function ejecutar(namespace, metodo, args) {
  const origen = TaTituloArticuloRuntime.obtenerOrigenDatos();
  if (origen === "netlify-functions") return ejecutarFunctions(namespace, metodo, args);
  return ejecutarLocal(namespace, metodo, args);
}

export const TaTituloArticuloApi = Object.freeze({
  estudiante: {
    buscarPorCedula(cedula) {
      return ejecutar("estudiante", "buscarPorCedula", [cedula]);
    },
    consultarEstado(cedula) {
      return ejecutar("estudiante", "consultarEstado", [cedula]);
    },
    guardarTelegram(cedula, telegramUser) {
      return ejecutar("estudiante", "guardarTelegram", [cedula, telegramUser]);
    },
    enviarPropuestas(datosEnvio) {
      return ejecutar("estudiante", "enviarPropuestas", [datosEnvio]);
    }
  },

  coordinador: {
    listarCoordinadores() {
      return ejecutar("coordinador", "listarCoordinadores", []);
    },
    cargarEstudiantes(coordinadorId) {
      return ejecutar("coordinador", "cargarEstudiantes", [coordinadorId]);
    },
    iniciarRevision(envioId, coordinadorId) {
      return ejecutar("coordinador", "iniciarRevision", [envioId, coordinadorId]);
    },
    guardarRevision(revision) {
      return ejecutar("coordinador", "guardarRevision", [revision]);
    }
  },

  admin: {
    listarResumen(adminToken) {
      return ejecutar("admin", "listarResumen", [adminToken]);
    },
    activarPeriodo(periodoId, adminToken) {
      return ejecutar("admin", "activarPeriodo", [periodoId, adminToken]);
    },
    guardarCoordinador(nombre, adminToken) {
      return ejecutar("admin", "guardarCoordinador", [nombre, adminToken]);
    },
    asignarCoordinadorCarrera(datos, adminToken) {
      return ejecutar("admin", "asignarCoordinadorCarrera", [datos, adminToken]);
    }
  },

  telegram: {
    enviarMensaje(chatId, mensaje, adminToken) {
      return ejecutar("telegram", "enviarMensaje", [chatId, mensaje, adminToken]);
    }
  },

  diagnostico: {
    obtenerOrigenDatos() {
      return TaTituloArticuloRuntime.obtenerOrigenDatos();
    },
    obtenerRuntime() {
      return TaTituloArticuloRuntime.detectarRuntime();
    },
    limpiarConfiguracionLocal() {
      setLocalStorageValue(BASE_FUNCTIONS_URL_KEY, "");
      setLocalStorageValue(ADMIN_TOKEN_KEY, "");
      TaTituloArticuloRuntime.limpiarConfiguracion();
    }
  }
});
