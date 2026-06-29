/* =========================================================
Nombre completo: lb.ai-config.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.ai-config.js
Función o funciones:
1. Definir configuración segura para el motor IA de Gen libro.
2. Separar IA online e IA local sin guardar claves dentro del código.
3. Preparar reintentos, tiempos de espera y reglas de calidad.
========================================================= */

(function attachLbAiConfig(window) {
  "use strict";

  var DEFAULT_CONFIG = {
    mode: "online_first",
    online: {
      enabled: true,
      provider: "electron_api",
      timeoutMs: 90000,
      retries: 2
    },
    local: {
      enabled: true,
      provider: "local_fallback",
      timeoutMs: 45000,
      retries: 1
    },
    quality: {
      language: "es",
      citationStyle: "APA 7",
      minReferences: 15,
      fontFamily: "Candara",
      fontSize: 14,
      avoidInventedReferences: true,
      figuresOnlyIfUseful: true,
      tablesOnlyIfUseful: true
    }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function merge(target, source) {
    Object.keys(source || {}).forEach(function eachKey(key) {
      if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
        target[key] = merge(target[key] || {}, source[key]);
      } else {
        target[key] = source[key];
      }
    });
    return target;
  }

  function readUserConfig() {
    try {
      var raw = window.localStorage.getItem("libro.genLibro.ai.config");
      return raw ? JSON.parse(raw) : {};
    } catch (_error) {
      return {};
    }
  }

  function getConfig() {
    return merge(clone(DEFAULT_CONFIG), readUserConfig());
  }

  window.LibroGenLibroAiConfig = {
    getConfig: getConfig,
    defaults: clone(DEFAULT_CONFIG)
  };
})(window);
