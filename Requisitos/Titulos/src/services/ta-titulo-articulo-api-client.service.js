/*
  Nombre completo: ta-titulo-articulo-api-client.service.js
  Ruta o ubicación: /Requisitos/Titulos/src/services/ta-titulo-articulo-api-client.service.js
  Función o funciones:
  - Centralizar las llamadas del frontend del módulo Títulos.
  - Trabajar directamente con Firebase/Firestore.
  - Eliminar la dependencia obligatoria de Netlify Functions para estudiante, coordinador y administrador.
  - Mantener la base institucional en solo lectura y escribir únicamente datos propios de títulos.
*/

import { TaTituloArticuloFirebaseDirect } from "./ta-titulo-articulo-firebase-direct.service.js";

function normalizarError(error, fallback) {
  return new Error(error?.message || fallback);
}

async function ejecutarDirecto(fn, fallback) {
  try {
    return await fn();
  } catch (error) {
    console.error("[Títulos Firebase]", error);
    throw normalizarError(error, fallback);
  }
}

export function configurarBaseFunciones() {
  return "firebase-direct";
}

export function obtenerEstadoApiTitulos() {
  return {
    configurado: TaTituloArticuloFirebaseDirect.disponible(),
    base: "firebase-direct",
    modoLocal: true
  };
}

export const TaTituloArticuloApi = Object.freeze({
  estudiante: {
    buscarPorCedula(cedula) {
      return ejecutarDirecto(
        () => TaTituloArticuloFirebaseDirect.estudiante.buscarPorCedula(cedula),
        "No se pudo consultar la cédula en Firebase."
      );
    },
    consultarEstado(cedula) {
      return ejecutarDirecto(
        () => TaTituloArticuloFirebaseDirect.estudiante.consultarEstado(cedula),
        "No se pudo consultar el estado en Firebase."
      );
    },
    guardarTelegram(cedula, telegramUser) {
      return ejecutarDirecto(
        () => TaTituloArticuloFirebaseDirect.estudiante.guardarTelegram(cedula, telegramUser),
        "No se pudo guardar el usuario de Telegram."
      );
    },
    enviarPropuestas(datosEnvio) {
      return ejecutarDirecto(
        () => TaTituloArticuloFirebaseDirect.estudiante.enviarPropuestas(datosEnvio),
        "No se pudieron enviar las propuestas."
      );
    }
  },

  coordinador: {
    listarCoordinadores() {
      return ejecutarDirecto(
        () => TaTituloArticuloFirebaseDirect.coordinador.listarCoordinadores(),
        "No se pudieron cargar los coordinadores desde Firebase."
      );
    },
    cargarEstudiantes(coordinadorId) {
      return ejecutarDirecto(
        () => TaTituloArticuloFirebaseDirect.coordinador.cargarEstudiantes(coordinadorId),
        "No se pudieron cargar los estudiantes desde Firebase."
      );
    },
    iniciarRevision(envioId, coordinadorId) {
      return ejecutarDirecto(
        () => TaTituloArticuloFirebaseDirect.coordinador.iniciarRevision(envioId, coordinadorId),
        "No se pudo iniciar la revisión."
      );
    },
    guardarRevision(revision) {
      return ejecutarDirecto(
        () => TaTituloArticuloFirebaseDirect.coordinador.guardarRevision(revision),
        "No se pudo guardar la revisión."
      );
    }
  },

  admin: {
    listarResumen() {
      return ejecutarDirecto(
        () => TaTituloArticuloFirebaseDirect.admin.listarResumen(),
        "No se pudo cargar el resumen administrativo desde Firebase."
      );
    },
    activarPeriodo(periodoId) {
      return ejecutarDirecto(
        () => TaTituloArticuloFirebaseDirect.admin.activarPeriodo(periodoId),
        "No se pudo activar el período."
      );
    },
    guardarCoordinador(nombre) {
      return ejecutarDirecto(
        () => TaTituloArticuloFirebaseDirect.admin.guardarCoordinador(nombre),
        "No se pudo guardar el coordinador."
      );
    },
    asignarCoordinadorCarrera(datos) {
      return ejecutarDirecto(
        () => TaTituloArticuloFirebaseDirect.admin.asignarCoordinadorCarrera(datos),
        "No se pudo asignar la carrera."
      );
    }
  },

  telegram: {
    enviarMensaje() {
      return Promise.resolve({ ok: true, mensaje: "Telegram queda pendiente fuera del modo Firebase directo." });
    }
  }
});
