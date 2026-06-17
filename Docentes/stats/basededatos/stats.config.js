/*
Nombre del archivo: stats.config.js
Ruta: stats/basededatos/stats.config.js
Función:
- Centraliza configuración base de la app
- Define colecciones oficiales
- Define periodos oficiales
- Expone filtros por defecto incluyendo capacitación
*/
(function attachStatsConfig(window) {
  "use strict";

  window.STATS = window.STATS || {};

  var CONFIG = {
    app: {
      name: "Stats Capacitaciones",
      version: "2.0.0"
    },
    collections: {
      docentes: "docentes",
      capacitaciones: "capacitaciones"
    },
    defaults: {
      emptyText: "—",
      unknownText: "Sin dato",
      allValue: "todos"
    },
    periodos: [
      {
        id: "2024-10_2025-03",
        label: "10/2024 - 03/2025",
        anioIni: 2024,
        mesIni: 10,
        anioFin: 2025,
        mesFin: 3
      },
      {
        id: "2025-04_2025-09",
        label: "04/2025 - 09/2025",
        anioIni: 2025,
        mesIni: 4,
        anioFin: 2025,
        mesFin: 9
      },
      {
        id: "2025-10_2026-03",
        label: "10/2025 - 03/2026",
        anioIni: 2025,
        mesIni: 10,
        anioFin: 2026,
        mesFin: 3
      },
      {
        id: "2026-04_2026-09",
        label: "04/2026 - 09/2026",
        anioIni: 2026,
        mesIni: 4,
        anioFin: 2026,
        mesFin: 9
      },
      {
        id: "2026-10_2027-03",
        label: "10/2026 - 03/2027",
        anioIni: 2026,
        mesIni: 10,
        anioFin: 2027,
        mesFin: 3
      }
    ],
    filters: {
      carrera: "todos",
      periodo: "todos",
      capacitacion: "todos",
      sexo: "todos",
      texto: ""
    }
  };

  function getConfig() {
    return CONFIG;
  }

  function getCollections() {
    return CONFIG.collections;
  }

  function getPeriodos() {
    return Array.isArray(CONFIG.periodos) ? CONFIG.periodos.slice() : [];
  }

  function getDefaultFilters() {
    return Object.assign({}, CONFIG.filters);
  }

  window.STATS.Config = {
    getConfig: getConfig,
    getCollections: getCollections,
    getPeriodos: getPeriodos,
    getDefaultFilters: getDefaultFilters
  };
})(window);