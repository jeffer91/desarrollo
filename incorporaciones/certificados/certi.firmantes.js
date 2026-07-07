/*
=========================================================
Nombre completo: certi.firmantes.js
Ruta o ubicación: /incorporaciones/certificados/certi.firmantes.js
Función o funciones:
- Centralizar los firmantes disponibles para certificados.
- Definir grupos de firma por tipo de certificado.
- Permitir que capacitación use tres firmas: Rector, Gestor de Procesos Académicos y Capacitador.
Con qué se une:
- certi.config.js
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
    config.firmantes.rector = Object.assign({}, firmantes.rector, config.firmantes.rector || {});
    config.firmantes.gestorProcesos = Object.assign({}, firmantes.gestorProcesos, config.firmantes.gestorProcesos || {});
    config.firmantes.capacitador = Object.assign({}, firmantes.capacitador, config.firmantes.capacitador || {});
    config.gruposFirmantes = Object.assign({}, grupos, config.gruposFirmantes || {});
    config.gruposFirmantes.capacitacion = grupos.capacitacion.slice();

    config.firmante = Object.assign({}, firmantes.rector);
  }

  function obtener(id) {
    const config = window.CertiConfig || {};
    const disponibles = config.firmantes || firmantes;
    const clave = String(id || "").trim();

    if (!clave || !disponibles[clave]) return null;

    return Object.assign({}, disponibles[clave]);
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
    const capacitador = limpiarTexto(nombreCapacitador);
    const rector = obtener("rector") || Object.assign({}, firmantes.rector);
    const gestor = obtener("gestorProcesos") || Object.assign({}, firmantes.gestorProcesos);

    return [
      rector,
      gestor,
      {
        id: "capacitador",
        nombre: capacitador || "CAPACITADOR",
        cargo: "CAPACITADOR"
      }
    ];
  }

  function listar() {
    const config = window.CertiConfig || {};
    const disponibles = config.firmantes || firmantes;

    return Object.keys(disponibles).map(function (id) {
      return Object.assign({}, disponibles[id]);
    });
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
