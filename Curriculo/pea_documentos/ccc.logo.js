/*
Nombre del archivo: ccc.logo.js
Ubicación: /Curriculo/pea_documentos/ccc.logo.js
Función:
- Insertar encabezado visual del módulo PEA si no existe
- Mantener identidad simple dentro de Currículo
*/
(function (window, document) {
  "use strict";

  function buildHeader() {
    var panel = document.querySelector(".pea-panel");
    var existing = document.querySelector(".pea-header");
    var header;

    if (!panel || existing) return;

    header = document.createElement("header");
    header.className = "pea-header";
    header.innerHTML = ""
      + "<p class='pea-eyebrow'>Currículo · PEA</p>"
      + "<h1 class='pea-title'>PEA documentos</h1>"
      + "<p class='pea-subtitle'>Control de versiones PEA con guardado local, historial, comparación, exportación y sincronización con Firebase.</p>";

    panel.insertBefore(header, panel.firstChild);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", buildHeader);
  else buildHeader();
})(window, document);
