/*
Nombre del archivo: stats.manifest.js
Ruta: stats/backend/stats.manifest.js
Función:
- Manifiesto de módulos esenciales
- Verifica que los módulos críticos estén cargados
- Incluye el módulo Detail para la nueva vista
*/
(function attachStatsManifest(window) {
  "use strict";

  window.STATS = window.STATS || {};

  var REQUIRED_MODULES = [
    "Config",
    "Firebase",
    "Store",
    "Repository",
    "Normalize",
    "Crossing",
    "Metrics",
    "App",
    "Filters",
    "Detail",
    "UI"
  ];

  function getMissingModules() {
    return REQUIRED_MODULES.filter(function eachName(name) {
      return !window.STATS[name];
    });
  }

  function isReady() {
    return getMissingModules().length === 0;
  }

  function getManifest() {
    return {
      required: REQUIRED_MODULES.slice(),
      missing: getMissingModules(),
      ready: isReady()
    };
  }

  window.STATS.Manifest = {
    getManifest: getManifest,
    getMissingModules: getMissingModules,
    isReady: isReady
  };
})(window);