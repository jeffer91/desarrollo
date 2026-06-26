/*
  Nombre completo: ta-titulo-articulo-data-adapter.service.js
  Ruta o ubicación: /Requisitos/Titulos/src/services/ta-titulo-articulo-data-adapter.service.js
  Función o funciones:
  - Ser la única puerta de entrada de datos para estudiante, coordinador y administrador.
  - En modo local usar Firebase directo cuando esté disponible.
  - En Netlify usar Netlify Functions.
  - Evitar imports estáticos que rompan doble click o Live Server antes del empaquetado final.
  - Mantener la misma interfaz que ya usan las pantallas actuales.
  Se conecta con:
  - ta-titulo-articulo-runtime.service.js
  - ta-titulo-articulo-api-client.service.js
  - ta-titulo-articulo-firebase-direct.service.js
*/

import { TaTituloArticuloRuntime } from "./ta-titulo-articulo-runtime.service.js";

let apiClientPromise = null;
let firebaseDirectPromise = null;

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function normalizarError(error, origen) {
  const mensaje = clean(error?.message || error) || "Error desconocido.";
  if (origen !== "firebase-direct") return new Error(mensaje);

  const detalle = mensaje.includes("Failed to resolve module specifier") || mensaje.includes("firebase/firestore")
    ? "Firebase directo todavía necesita el Bloque 3 para cargar el SDK correctamente en doble click y Live Server."
    : "Revise la configuración pública de Firebase y las reglas de Firestore.";

  return new Error(`${mensaje} ${detalle}`);
}

async function cargarApiClient() {
  if (!apiClientPromise) {
    apiClientPromise = import("./ta-titulo-articulo-api-client.service.js").then((mod) => mod.TaTituloArticuloApi);
  }
  return apiClientPromise;
}

async function cargarFirebaseDirect() {
  if (!firebaseDirectPromise) {
    firebaseDirectPromise = import("./ta-titulo-articulo-firebase-direct.service.js").then((mod) => mod.TaTituloArticuloFirebaseDirect);
  }
  return firebaseDirectPromise;
}

async function obtenerClienteDatos() {
  const origen = TaTituloArticuloRuntime.obtenerOrigenDatos();

  if (origen === "netlify-functions") {
    return { origen, cliente: await cargarApiClient() };
  }

  try {
    const cliente = await cargarFirebaseDirect();
    if (typeof cliente.disponible === "function" && !cliente.disponible()) {
      throw new Error("Firebase directo no está disponible en este entorno.");
    }
    return { origen: "firebase-direct", cliente };
  } catch (error) {
    const runtime = TaTituloArticuloRuntime.detectarRuntime();

    if (runtime.esNetlify) {
      return { origen: "netlify-functions", cliente: await cargarApiClient() };
    }

    throw normalizarError(error, "firebase-direct");
  }
}

async function ejecutar(namespace, metodo, args) {
  const { origen, cliente } = await obtenerClienteDatos();
  const grupo = cliente?.[namespace];
  const fn = grupo?.[metodo];

  if (typeof fn !== "function") {
    throw new Error(`No existe el método ${namespace}.${metodo} en el origen ${origen}.`);
  }

  try {
    const resultado = await fn(...args);
    return { ...(resultado || {}), origenDatos: origen };
  } catch (error) {
    throw normalizarError(error, origen);
  }
}

export const TaTituloArticuloData = Object.freeze({
  runtime: TaTituloArticuloRuntime,

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
    async obtenerOrigenActivo() {
      const runtime = TaTituloArticuloRuntime.detectarRuntime();
      return {
        runtime,
        origenDatos: TaTituloArticuloRuntime.obtenerOrigenDatos()
      };
    }
  }
});
