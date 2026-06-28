/* =========================================================
Nombre completo: carga-materia.xlsx-loader.js
Ruta o ubicación: /desarrollo/libro/carga-materia/carga-materia.xlsx-loader.js
Función o funciones:
1. Asegurar disponibilidad de SheetJS/XLSX antes de leer Excel.
2. Intentar cargar primero una copia local si existe.
3. Usar CDN como respaldo cuando la app tenga internet.
4. Entregar errores claros si XLSX no está disponible.
========================================================= */

(function attachCargaMateriaXlsxLoader(window, document) {
  "use strict";

  var URLS = [
    "./vendor/xlsx.full.min.js",
    "../../Requisitos/Gestion/Excel/vendor/xlsx.full.min.js",
    "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
    "https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js"
  ];

  var loadingPromise = null;

  function loadScript(src) {
    return new Promise(function promiseLoad(resolve, reject) {
      var script = document.createElement("script");

      script.src = src;
      script.async = false;
      script.onload = function onLoad() {
        resolve(true);
      };
      script.onerror = function onError() {
        reject(new Error("No se pudo cargar " + src));
      };

      document.head.appendChild(script);
    });
  }

  async function ensureXLSX() {
    if (window.XLSX) return true;
    if (loadingPromise) return loadingPromise;

    loadingPromise = (async function tryLoad() {
      var errors = [];

      for (var i = 0; i < URLS.length; i += 1) {
        try {
          await loadScript(URLS[i]);

          if (window.XLSX) {
            return true;
          }
        } catch (error) {
          errors.push(error.message || String(error));
        }
      }

      throw new Error(
        "XLSX no está disponible. Revisa internet o agrega vendor/xlsx.full.min.js. Detalle: " +
        errors.join(" | ")
      );
    })();

    return loadingPromise;
  }

  window.LibroCargaMateriaXlsxLoader = {
    ensureXLSX: ensureXLSX
  };
})(window, document);
