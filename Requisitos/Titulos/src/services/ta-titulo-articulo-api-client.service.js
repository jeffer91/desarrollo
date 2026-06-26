/*
  Nombre completo: ta-titulo-articulo-api-client.service.js
  Ruta o ubicación: /src/services/ta-titulo-articulo-api-client.service.js
  Función o funciones:
  - Centralizar llamadas del frontend hacia Netlify Functions.
  - Enviar acciones de estudiante, coordinador, administrador y Telegram sin repetir código.
  - Normalizar respuestas correctas y errores para las pantallas públicas y la pantalla local.
  - Permitir que Electron/local use una URL base real de Netlify Functions.
*/

const BASE_FUNCTIONS_PATH = "/.netlify/functions";
const BASE_FUNCTIONS_URL_KEY = "ta.titulo.articulo.baseFunctionsUrl";

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizarBaseFunctionsUrl(value) {
  const url = clean(value).replace(/\/+$/, "");
  if (!url) return "";

  if (url.endsWith("/.netlify/functions")) return url;

  if (url.includes("/.netlify/functions/")) {
    return url.split("/.netlify/functions/")[0] + "/.netlify/functions";
  }

  return url + "/.netlify/functions";
}

function estaEnElectronLocal() {
  return typeof window !== "undefined" && window.location?.protocol === "file:";
}

function obtenerBaseFunctionsPath() {
  if (!estaEnElectronLocal()) return BASE_FUNCTIONS_PATH;

  const guardada = normalizarBaseFunctionsUrl(localStorage.getItem(BASE_FUNCTIONS_URL_KEY));
  if (guardada) return guardada;

  const ingresada = normalizarBaseFunctionsUrl(
    prompt(
      "Ingrese la URL base de Netlify Functions.\n\nEjemplo local:\nhttp://127.0.0.1:8888/.netlify/functions\n\nEjemplo publicado:\nhttps://tu-sitio.netlify.app/.netlify/functions"
    ) || ""
  );

  if (ingresada) {
    localStorage.setItem(BASE_FUNCTIONS_URL_KEY, ingresada);
    return ingresada;
  }

  throw new Error("No se configuró la URL base de Netlify Functions para el panel local.");
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

  if (options.adminToken) {
    headers["x-ta-admin-token"] = options.adminToken;
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
  }
});
