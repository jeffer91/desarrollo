/*
  Nombre completo: ta-titulo-articulo-api-client.service.js
  Ruta o ubicación: /Requisitos/Titulos/src/services/ta-titulo-articulo-api-client.service.js
  Función o funciones:
  - Centralizar llamadas del frontend hacia Netlify Functions.
  - Enviar acciones de estudiante, coordinador, administrador y Telegram sin repetir código.
  - Normalizar respuestas correctas y errores para las pantallas públicas y la pantalla local.
*/

const BASE_FUNCTIONS_PATH = "/.netlify/functions";

const ENDPOINTS = Object.freeze({
  estudiante: `${BASE_FUNCTIONS_PATH}/ta-titulo-articulo-api-estudiante`,
  coordinador: `${BASE_FUNCTIONS_PATH}/ta-titulo-articulo-api-coordinador`,
  admin: `${BASE_FUNCTIONS_PATH}/ta-titulo-articulo-api-admin`,
  telegram: `${BASE_FUNCTIONS_PATH}/ta-titulo-articulo-api-telegram`
});

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

async function llamarFuncion(endpoint, action, payload = {}, options = {}) {
  const headers = { "Content-Type": "application/json" };

  if (options.adminToken) {
    headers["x-ta-admin-token"] = options.adminToken;
  }

  const response = await fetch(endpoint, {
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
      return llamarFuncion(ENDPOINTS.estudiante, "buscarPorCedula", { cedula });
    },
    consultarEstado(cedula) {
      return llamarFuncion(ENDPOINTS.estudiante, "consultarEstado", { cedula });
    },
    guardarTelegram(cedula, telegramUser) {
      return llamarFuncion(ENDPOINTS.estudiante, "guardarTelegram", { cedula, telegramUser });
    },
    enviarPropuestas(datosEnvio) {
      return llamarFuncion(ENDPOINTS.estudiante, "enviarPropuestas", datosEnvio);
    }
  },

  coordinador: {
    listarCoordinadores() {
      return llamarFuncion(ENDPOINTS.coordinador, "listarCoordinadores");
    },
    cargarEstudiantes(coordinadorId) {
      return llamarFuncion(ENDPOINTS.coordinador, "cargarEstudiantes", { coordinadorId });
    },
    iniciarRevision(envioId, coordinadorId) {
      return llamarFuncion(ENDPOINTS.coordinador, "iniciarRevision", { envioId, coordinadorId });
    },
    guardarRevision(revision) {
      return llamarFuncion(ENDPOINTS.coordinador, "guardarRevision", revision);
    }
  },

  admin: {
    listarResumen(adminToken) {
      return llamarFuncion(ENDPOINTS.admin, "listarResumen", {}, { adminToken });
    },
    activarPeriodo(periodoId, adminToken) {
      return llamarFuncion(ENDPOINTS.admin, "activarPeriodo", { periodoId }, { adminToken });
    },
    guardarCoordinador(nombre, adminToken) {
      return llamarFuncion(ENDPOINTS.admin, "guardarCoordinador", { nombre }, { adminToken });
    },
    asignarCoordinadorCarrera(datos, adminToken) {
      return llamarFuncion(ENDPOINTS.admin, "asignarCoordinadorCarrera", datos, { adminToken });
    }
  },

  telegram: {
    enviarMensaje(chatId, mensaje, adminToken) {
      return llamarFuncion(ENDPOINTS.telegram, "enviarMensaje", { chatId, mensaje }, { adminToken });
    }
  }
});
