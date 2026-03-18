/*
=========================================================
Nombre del archivo: app.env.js
Ruta o ubicación: /desarrollo/app/app.env.js
Función o funciones:
- Detecta el entorno de ejecución actual
- Diferencia entre Electron, Live Server y doble clic
- Entrega metadatos útiles para adaptar el comportamiento del shell
=========================================================
*/
(function attachAppEnv(window, navigator, location) {
  "use strict";

  window.DESARROLLO = window.DESARROLLO || {};

  function getUserAgent() {
    return String((navigator && navigator.userAgent) || "").toLowerCase();
  }

  function isElectron() {
    return !!(
      window.__DESARROLLO_ELECTRON__ ||
      (window.api && window.api.host) ||
      getUserAgent().indexOf("electron/") >= 0
    );
  }

  function isFileProtocol() {
    return String(location.protocol || "").toLowerCase() === "file:";
  }

  function isHttpProtocol() {
    var protocol = String(location.protocol || "").toLowerCase();
    return protocol === "http:" || protocol === "https:";
  }

  function detect() {
    if (isElectron()) {
      return {
        key: "electron",
        label: "Electron",
        description:
          "Modo escritorio activo. El shell puede usar preload y APIs nativas si están disponibles."
      };
    }

    if (isFileProtocol()) {
      return {
        key: "double-click",
        label: "Doble clic",
        description:
          "Modo archivo local activo. El shell corre desde file:// sin servidor local."
      };
    }

    if (isHttpProtocol()) {
      return {
        key: "live-server",
        label: "Live Server",
        description:
          "Modo servidor activo. El shell está corriendo desde navegador mediante HTTP local."
      };
    }

    return {
      key: "unknown",
      label: "Desconocido",
      description:
        "No se pudo determinar el entorno de ejecución con certeza."
    };
  }

  window.DESARROLLO.Env = {
    detect: detect
  };
})(window, navigator, window.location);