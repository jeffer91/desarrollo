/*
=========================================================
Nombre completo: distribucion.repo.js
Ruta o ubicación: /incorporaciones/sedes/distribucion/distribucion.repo.js
Función o funciones:
- Guardar una distribución por período.
- Leer distribución existente por período.
- Mantener estados Borrador y Finalizada.
- Dejar datos listos para que Guiones pueda leer la distribución guardada.
Con qué se une:
- distribucion.app.js
- distribucion.state.js
- /incorporaciones/sedes/guiones/guiones.distribucion.js
=========================================================
*/

(function () {
  "use strict";

  const STORAGE_KEY = "itsqmet_incorporaciones_distribuciones_v1";

  function readStore() {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.distribuciones) ? parsed.distribuciones : [];
    } catch (error) {
      console.error("No se pudo leer distribuciones:", error);
      return [];
    }
  }

  function writeStore(distribuciones) {
    const payload = {
      schema: "incorporaciones_distribuciones",
      version: 1,
      updatedAt: new Date().toISOString(),
      distribuciones: Array.isArray(distribuciones) ? distribuciones : []
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    return payload;
  }

  async function findByPeriodo(periodoId) {
    const distribuciones = readStore();

    return (
      distribuciones.find((item) => String(item.periodoId) === String(periodoId)) ||
      null
    );
  }

  async function saveDistribution(state, estado) {
    const distribuciones = readStore();
    const existingIndex = distribuciones.findIndex((item) => {
      return String(item.periodoId) === String(state.periodoId);
    });

    const payload = {
      id: existingIndex >= 0
        ? distribuciones[existingIndex].id
        : createId("dist"),
      periodoId: state.periodoId,
      periodoNombre: state.periodoNombre,
      estado: estado || state.estado || "borrador",
      jornadas: state.jornadas || [],
      distribucion: state.distribucion || [],
      cambiosManuales: state.cambiosManuales || [],
      createdAt: existingIndex >= 0
        ? distribuciones[existingIndex].createdAt
        : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      distribuciones[existingIndex] = payload;
    } else {
      distribuciones.push(payload);
    }

    writeStore(distribuciones);

    return payload;
  }

  async function readAll() {
    return readStore();
  }

  function createId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  function getStorageKey() {
    return STORAGE_KEY;
  }

  window.DistribucionRepo = {
    findByPeriodo,
    saveDistribution,
    readAll,
    getStorageKey
  };
})();