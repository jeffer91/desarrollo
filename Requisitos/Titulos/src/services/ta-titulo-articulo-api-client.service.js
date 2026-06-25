/*
  Nombre completo: ta-titulo-articulo-api-client.service.js
  Ruta o ubicación: /Requisitos/Titulos/src/services/ta-titulo-articulo-api-client.service.js
  Función o funciones:
  - Centralizar llamadas del frontend hacia Netlify Functions.
  - Enviar acciones de estudiante, coordinador, administrador y Telegram sin repetir código.
  - Normalizar respuestas correctas y errores para las pantallas públicas y la pantalla local.
  - Permitir configurar URL base de funciones cuando la pantalla se abre desde Electron o archivo local.
*/

const DEFAULT_FUNCTIONS_PATH = "/.netlify/functions";
const FUNCTIONS_BASE_KEY = "ta.titulo.articulo.functionsBase";

const FUNCTION_NAMES = Object.freeze({
  estudiante: "ta-titulo-articulo-api-estudiante",
  coordinador: "ta-titulo-articulo-api-coordinador",
  admin: "ta-titulo-articulo-api-admin",
  telegram: "ta-titulo-articulo-api-telegram"
});

function clean(value) {
  return String(value ?? "").trim().replace(/\/+$/g, "");
}

function obtenerBaseFunciones() {
  const globalBase = clean(globalThis.TA_TITULO_ARTICULO_FUNCTIONS_BASE);
  if (globalBase) return globalBase;

  try {
    const savedBase = clean(globalThis.localStorage?.getItem(FUNCTIONS_BASE_KEY));
    if (savedBase) return savedBase;
  } catch (error) {
    console.warn("[Títulos API] No se pudo leer localStorage.", error);
  }

  const protocol = globalThis.location?.protocol || "";
  if (protocol === "file:") return "";

  return DEFAULT_FUNCTIONS_PATH;
}

export function configurarBaseFunciones(baseUrl) {
  const base = clean(baseUrl);
  if (!base) return "";

  try {
    globalThis.localStorage?.setItem(FUNCTIONS_BASE_KEY, base);
  } catch (error) {
    console.warn("[Títulos API] No se pudo guardar la URL base.", error);
  }

  globalThis.TA_TITULO_ARTICULO_FUNCTIONS_BASE = base;
  return base;
}

export function obtenerEstadoApiTitulos() {
  const base = obtenerBaseFunciones();
  return {
    configurado: Boolean(base),
    base,
    modoLocal: (globalThis.location?.protocol || "") === "file:"
  };
}

function endpoint(nombre) {
  const base = obtenerBaseFunciones();
  if (!base) {
    throw new Error("Configure la URL base de Netlify Functions para usar este módulo desde Electron o archivo local.");
  }
  return `${base}/${FUNCTION_NAMES[nombre]}`;
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

async function llamarFuncion(nombreFuncion, action, payload = {}, options = {}) {
  const headers = { "Content-Type": "application/json" };

  if (options.adminToken) {
    headers["x-ta-admin-token"] = options.adminToken;
  }

  const response = await fetch(endpoint(nombreFuncion), {
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
