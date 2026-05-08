/* =========================================================
Nombre completo: titulacion-env.js
Ruta: /Titulacion/frontend/js/core/titulacion-env.js
Función o funciones:
- Detectar si la app se ejecuta en navegador, Live Server, archivo local o Electron.
- Exponer información del entorno para otros módulos.
- Evitar errores cuando una función de Electron no está disponible.
========================================================= */

(function (window) {
  "use strict";

  function hasElectronApi() {
    return !!(
      window.titulacionAPI ||
      window.electronAPI ||
      window.require ||
      String(window.navigator.userAgent || "").toLowerCase().indexOf("electron") >= 0
    );
  }

  function getProtocol() {
    return String(window.location && window.location.protocol ? window.location.protocol : "");
  }

  function getHost() {
    return String(window.location && window.location.host ? window.location.host : "");
  }

  function detectMode() {
    var protocol = getProtocol();

    if (hasElectronApi()) {
      return "electron";
    }

    if (protocol === "file:") {
      return "archivo-local";
    }

    if (protocol === "http:" || protocol === "https:") {
      var host = getHost().toLowerCase();

      if (
        host.indexOf("localhost") >= 0 ||
        host.indexOf("127.0.0.1") >= 0 ||
        host.indexOf("192.168.") >= 0
      ) {
        return "live-server";
      }

      return "web";
    }

    return "desconocido";
  }

  function getLabel() {
    var mode = detectMode();

    if (mode === "electron") return "Electron";
    if (mode === "archivo-local") return "Archivo local";
    if (mode === "live-server") return "Live Server";
    if (mode === "web") return "Navegador web";

    return "Entorno desconocido";
  }

  function canUseNativePdf() {
    return !!(
      window.titulacionAPI &&
      window.titulacionAPI.pdf &&
      typeof window.titulacionAPI.pdf.exportCurrentWindow === "function"
    );
  }

  function canUseNativeFiles() {
    return !!(
      window.titulacionAPI &&
      window.titulacionAPI.files
    );
  }

  var env = {
    protocol: getProtocol(),
    host: getHost(),
    mode: detectMode(),
    label: getLabel(),
    isElectron: hasElectronApi(),
    isFile: getProtocol() === "file:",
    isHttp: getProtocol() === "http:" || getProtocol() === "https:",
    canUseNativePdf: canUseNativePdf(),
    canUseNativeFiles: canUseNativeFiles(),

    getProtocol: getProtocol,
    getHost: getHost,
    detectMode: detectMode,
    getLabel: getLabel,
    refresh: function () {
      env.protocol = getProtocol();
      env.host = getHost();
      env.mode = detectMode();
      env.label = getLabel();
      env.isElectron = hasElectronApi();
      env.isFile = getProtocol() === "file:";
      env.isHttp = getProtocol() === "http:" || getProtocol() === "https:";
      env.canUseNativePdf = canUseNativePdf();
      env.canUseNativeFiles = canUseNativeFiles();
      return env;
    }
  };

  window.TITULACION_ENV = env;
})(window);