/*
=========================================================
Nombre del archivo: app.api.web.js
Ruta o ubicación: /desarrollo/app/app.api.web.js
Función o funciones:
- Provee una API web segura cuando no existe preload de Electron
- Evita errores en módulos que esperen window.api
- Expone funciones base degradadas para navegador, Live Server y doble clic
=========================================================
*/
(function attachWebFallbackApi(window, document) {
  "use strict";

  var root = window;
  var existingApi = root.api && typeof root.api === "object" ? root.api : {};

  function notAvailableResult(message) {
    return Promise.resolve({
      ok: false,
      available: false,
      message: message || "Función no disponible en modo web."
    });
  }

  function openExternal(url) {
    try {
      var safeUrl = String(url == null ? "" : url).trim();
      if (!safeUrl) {
        return Promise.resolve({
          ok: false,
          available: true,
          message: "No se recibió una URL válida."
        });
      }

      window.open(safeUrl, "_blank", "noopener,noreferrer");

      return Promise.resolve({
        ok: true,
        available: true,
        message: "Recurso abierto en una nueva pestaña."
      });
    } catch (error) {
      return Promise.resolve({
        ok: false,
        available: true,
        message: error && error.message ? error.message : "No se pudo abrir el recurso."
      });
    }
  }

  function copyText(text) {
    var value = String(text == null ? "" : text);

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      return navigator.clipboard.writeText(value)
        .then(function onOk() {
          return {
            ok: true,
            available: true,
            message: "Texto copiado correctamente."
          };
        })
        .catch(function onFail(error) {
          return {
            ok: false,
            available: true,
            message: error && error.message ? error.message : "No se pudo copiar el texto."
          };
        });
    }

    try {
      var textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "readonly");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      textarea.style.pointerEvents = "none";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);

      return Promise.resolve({
        ok: true,
        available: true,
        message: "Texto copiado correctamente."
      });
    } catch (error) {
      return Promise.resolve({
        ok: false,
        available: true,
        message: error && error.message ? error.message : "No se pudo copiar el texto."
      });
    }
  }

  function hostInfo() {
    return Promise.resolve({
      ok: true,
      available: true,
      mode: "web",
      platform: "browser",
      message: "API web activa."
    });
  }

  root.api = Object.assign({}, existingApi, {
    host: Object.assign({}, existingApi.host, {
      info: hostInfo
    }),
    shell: Object.assign({}, existingApi.shell, {
      chooseFolder: function chooseFolder() {
        return notAvailableResult("Elegir carpetas solo está disponible en Electron.");
      },
      openPath: function openPath(path) {
        return openExternal(path);
      },
      revealPath: function revealPath(path) {
        return openExternal(path);
      },
      startScan: function startScan() {
        return notAvailableResult("El escaneo local solo está disponible en Electron.");
      }
    }),
    files: Object.assign({}, existingApi.files, {
      saveText: function saveText() {
        return notAvailableResult("Guardar archivos locales solo está disponible en Electron.");
      },
      saveJson: function saveJson() {
        return notAvailableResult("Guardar JSON local solo está disponible en Electron.");
      }
    }),
    utils: Object.assign({}, existingApi.utils, {
      copyText: copyText,
      openExternal: openExternal
    })
  });
})(window, document);