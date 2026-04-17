/*
=========================================================
Nombre completo: mesa-loader.js
Ruta o ubicación: /js/mesa-loader.js
Función o funciones:
- Cargar archivos JSON externos cuando el entorno lo permita.
- Evitar errores en modo doble click.
- Devolver resultados seguros aunque no pueda leer archivos.
- Servir como cargador opcional, no obligatorio.
=========================================================
*/
"use strict";

(function attachMesaLoader(global) {
  function canFetchSupportFiles() {
    const protocol = String(location.protocol || "").toLowerCase();
    return protocol === "http:" || protocol === "https:";
  }

  async function fetchJson(relativePath) {
    if (!canFetchSupportFiles()) {
      return null;
    }

    const response = await fetch(relativePath, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    return response.json();
  }

  async function loadConfig() {
    return fetchJson("data/mesa-config.json");
  }

  async function loadPeople() {
    return fetchJson("data/mesa-personas.json");
  }

  async function loadLocalData() {
    return fetchJson("data/mesa-invitaciones-local.json");
  }

  async function loadAllSupportFilesIfAvailable() {
    try {
      const [config, people, localData] = await Promise.all([
        loadConfig(),
        loadPeople(),
        loadLocalData()
      ]);

      return { config, people, localData };
    } catch (error) {
      console.warn("MesaLoader: no fue posible cargar archivos de apoyo.", error);
      return { config: null, people: null, localData: null };
    }
  }

  global.MesaLoader = {
    canFetchSupportFiles,
    fetchJson,
    loadConfig,
    loadPeople,
    loadLocalData,
    loadAllSupportFilesIfAvailable
  };
})(window);