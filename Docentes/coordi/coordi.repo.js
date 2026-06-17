/*
=========================================================
Nombre completo: coordi.repo.js
Ruta o ubicación: /Docentes/coordi/coordi.repo.js
Función o funciones:
- Guardar y leer la configuración Carrera, Coordinador, Programa y Telegram.
- Usar localStorage como respaldo local.
- Dejar la estructura lista para que Distribución pueda consultar Coordi.
- Mantener una clave estable de almacenamiento.
Con qué se une:
- coordi.app.js
- coordi.state.js
- coordi.seed.js
- /incorporaciones/sedes/distribucion/distribucion.coordi.js
=========================================================
*/

(function () {
  "use strict";

  const STORAGE_KEY = "itsqmet_docentes_coordi_v1";

  function buildPayload(rows) {
    return {
      schema: "coordi_carreras",
      version: 1,
      updatedAt: new Date().toISOString(),
      rows: Array.isArray(rows) ? rows : []
    };
  }

  async function readAll() {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.rows) ? parsed.rows : [];
    } catch (error) {
      console.error("No se pudo leer Coordi desde localStorage:", error);
      return [];
    }
  }

  async function saveAll(rows) {
    const payload = buildPayload(rows);

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

    return payload;
  }

  async function hasData() {
    const rows = await readAll();
    return rows.length > 0;
  }

  async function resetWithSeed(seedRows) {
    const payload = await saveAll(seedRows);
    return payload;
  }

  async function clear() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function getStorageKey() {
    return STORAGE_KEY;
  }

  window.CoordiRepo = {
    readAll,
    saveAll,
    hasData,
    resetWithSeed,
    clear,
    getStorageKey
  };
})();