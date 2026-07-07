/*
=========================================================
Nombre completo: certi.firmantes.js
Ruta o ubicación: /incorporaciones/certificados/certi.firmantes.js
Función o funciones:
- Centralizar los firmantes disponibles para certificados.
- Definir grupos de firma por tipo de certificado.
- Permitir que capacitación use dos firmas institucionales.
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
      nombre: "Dr. León Alberto Tito",
      cargo: "RECTOR"
    },
    vicerrector: {
      id: "vicerrector",
      nombre: "Dr. Alex León",
      cargo: "VICERRECTOR"
    },
    gestorProcesos: {
      id: "gestorProcesos",
      nombre: "Mgs. Jefferson Villarreal",
      cargo: "GESTOR DE PROCESOS ACADÉMICOS"
    }
  };

  const grupos = {
    reconocimiento: ["rector"],
    capacitacion: ["vicerrector", "gestorProcesos"]
  };

  extenderConfig();

  function extenderConfig() {
    const config = window.CertiConfig;
    if (!config) return;

    config.firmantes = Object.assign({}, firmantes, config.firmantes || {});
    config.gruposFirmantes = Object.assign({}, grupos, config.gruposFirmantes || {});

    if (!config.firmante) {
      config.firmante = Object.assign({}, firmantes.rector);
    }
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

  function obtenerFirmantesCapacitacion() {
    const lista = obtenerGrupo("capacitacion");

    if (lista.length) return lista;

    return [
      Object.assign({}, firmantes.vicerrector),
      Object.assign({}, firmantes.gestorProcesos)
    ];
  }

  function listar() {
    const config = window.CertiConfig || {};
    const disponibles = config.firmantes || firmantes;

    return Object.keys(disponibles).map(function (id) {
      return Object.assign({}, disponibles[id]);
    });
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
