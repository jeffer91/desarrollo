/* =========================================================
Nombre completo: titulacion-orquestador.js
Ruta: /Titulacion/frontend/js/core/titulacion-orquestador.js
Función o funciones:
- Esperar a que el DOM esté disponible.
- Validar dependencias críticas.
- Inicializar TITULACION_CORE.
- Mostrar error claro si falta un archivo.
========================================================= */

(function (window, document) {
  "use strict";

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function showFatalError(message) {
    var target = document.getElementById("titulacion-documento");

    if (target) {
      target.innerHTML = [
        '<div class="document-empty is-error">',
        '<strong>Error de inicialización:</strong><br>',
        esc(message || "No se pudo iniciar la aplicación."),
        "</div>"
      ].join("");
    }

    console.error("[TITULACION_ORQUESTADOR]", message);
  }

  function validateDependencies() {
    var required = [
      ["TITULACION_CONFIG", window.TITULACION_CONFIG],
      ["TITULACION_UTILS", window.TITULACION_UTILS],
      ["TITULACION_VALIDACIONES", window.TITULACION_VALIDACIONES],
      ["TITULACION_CORE", window.TITULACION_CORE]
    ];

    for (var i = 0; i < required.length; i += 1) {
      if (!required[i][1]) {
        return "No existe " + required[i][0] + ". Revisa el orden de scripts en titulacion.html.";
      }
    }

    if (typeof window.TITULACION_CORE.init !== "function") {
      return "TITULACION_CORE.init no está disponible.";
    }

    return "";
  }

  function startApplication() {
    var error = validateDependencies();

    if (error) {
      showFatalError(error);
      return;
    }

    try {
      window.TITULACION_CORE.init();
    } catch (err) {
      showFatalError(err && err.message ? err.message : String(err));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startApplication);
  } else {
    startApplication();
  }

  window.TITULACION_ORQUESTADOR = {
    startApplication: startApplication
  };
})(window, document);