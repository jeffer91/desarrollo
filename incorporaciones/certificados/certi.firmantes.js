/*
=========================================================
Nombre completo: certi.firmantes.js
Ruta o ubicación: /incorporaciones/certificados/certi.firmantes.js
Función o funciones:
- Centralizar los firmantes disponibles para certificados.
- Definir grupos de firma por tipo de certificado.
- Permitir que capacitación use tres firmas: Rector, Gestor de Procesos Académicos y Capacitador.
- Normalizar el nombre del capacitador con primera letra mayúscula y resto minúscula.
Con qué se une:
- certi.config.js
- certi.utils.js
- certi.capacitacion.logic.js
- certi.capacitacion.template.js
=========================================================
*/

(function () {
  "use strict";

  const firmantes = {
    rector: {
      id: "rector",
      nombre: "Dr. León Tito",
      cargo: "RECTOR"
    },
    gestorProcesos: {
      id: "gestorProcesos",
      nombre: "Mgs. Jefferson Villarreal",
      cargo: "GESTOR DE PROCESOS ACADÉMICOS"
    },
    capacitador: {
      id: "capacitador",
      nombre: "",
      cargo: "CAPACITADOR"
    },
    vicerrector: {
      id: "vicerrector",
      nombre: "Dr. Alex León",
      cargo: "VICERRECTOR"
    }
  };

  const grupos = {
    reconocimiento: ["rector"],
    capacitacion: ["rector", "gestorProcesos", "capacitador"]
  };

  extenderConfig();

  function extenderConfig() {
    const config = window.CertiConfig;
    if (!config) return;

    config.firmantes = Object.assign({}, firmantes, config.firmantes || {});
    config.firmantes.rector = normalizarFirmante(Object.assign({}, firmantes.rector, config.firmantes.rector || {}));
    config.firmantes.gestorProcesos = normalizarFirmante(Object.assign({}, firmantes.gestorProcesos, config.firmantes.gestorProcesos || {}));
    config.firmantes.capacitador = normalizarFirmante(Object.assign({}, firmantes.capacitador, config.firmantes.capacitador || {}));
    config.firmantes.vicerrector = normalizarFirmante(Object.assign({}, firmantes.vicerrector, config.firmantes.vicerrector || {}));
    config.gruposFirmantes = Object.assign({}, grupos, config.gruposFirmantes || {});
    config.gruposFirmantes.capacitacion = grupos.capacitacion.slice();

    config.firmante = Object.assign({}, config.firmantes.rector);
  }

  function obtener(id) {
    const config = window.CertiConfig || {};
    const disponibles = config.firmantes || firmantes;
    const clave = String(id || "").trim();

    if (!clave || !disponibles[clave]) return null;

    return normalizarFirmante(Object.assign({}, disponibles[clave]));
  }

  function obtenerGrupo(tipo) {
    const config = window.CertiConfig || {};
    const gruposDisponibles = config.gruposFirmantes || grupos;
    const ids = gruposDisponibles[tipo] || [];

    return ids
      .map(obtener)
      .filter(Boolean);
  }

  function obtenerFirmantesCapacitacion(nombreCapacitador) {
    const capacitador = normalizarNombrePropio(nombreCapacitador);
    const rector = obtener("rector") || normalizarFirmante(Object.assign({}, firmantes.rector));
    const gestor = obtener("gestorProcesos") || normalizarFirmante(Object.assign({}, firmantes.gestorProcesos));

    return [
      rector,
      gestor,
      {
        id: "capacitador",
        nombre: capacitador || "Capacitador",
        cargo: "CAPACITADOR"
      }
    ];
  }

  function listar() {
    const config = window.CertiConfig || {};
    const disponibles = config.firmantes || firmantes;

    return Object.keys(disponibles).map(function (id) {
      return normalizarFirmante(Object.assign({}, disponibles[id]));
    });
  }

  function normalizarFirmante(firmante) {
    const salida = Object.assign({}, firmante || {});
    salida.nombre = normalizarNombrePropio(salida.nombre);
    salida.cargo = limpiarTexto(salida.cargo).toUpperCase();
    return salida;
  }

  function normalizarNombrePropio(valor) {
    if (window.CertiUtils && typeof window.CertiUtils.limpiarNombrePropio === "function") {
      return window.CertiUtils.limpiarNombrePropio(valor);
    }

    return limpiarTexto(valor)
      .toLocaleLowerCase("es-EC")
      .split(" ")
      .map(function (palabra) {
        if (!palabra) return "";
        if (["de", "del", "la", "las", "los", "y", "e"].includes(palabra)) return palabra;
        return palabra.charAt(0).toLocaleUpperCase("es-EC") + palabra.slice(1);
      })
      .join(" ");
  }

  function limpiarTexto(valor) {
    return String(valor == null ? "" : valor).replace(/\s+/g, " ").trim();
  }

  window.CertiFirmantes = {
    firmantes,
    grupos,
    obtener,
    obtenerGrupo,
    obtenerFirmantesCapacitacion,
    listar,
    extenderConfig
  };
})();