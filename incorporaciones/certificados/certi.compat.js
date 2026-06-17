/*
=========================================================
Nombre completo: certi.compat.js
Ruta o ubicación: /incorporaciones/sedes/certi/certi.compat.js
Función o funciones:
- Proveer compatibilidad con navegadores y entornos locales.
- Validar disponibilidad de librerías necesarias: XLSX y jsPDF.
- Mostrar advertencias técnicas sin detener toda la pantalla.
Con qué se une:
- certi.html
- certi.app.js
- certi.excel.js
- certi.pdf.js
=========================================================
*/

(function () {
  "use strict";

  function verificarDependencias() {
    const faltantes = [];

    if (!window.XLSX) {
      faltantes.push("XLSX");
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
      faltantes.push("jsPDF");
    }

    return {
      correcto: faltantes.length === 0,
      faltantes
    };
  }

  function navegadorSoportado() {
    return Boolean(
      window.FileReader &&
      window.Promise &&
      window.localStorage &&
      document.querySelector
    );
  }

  function crearMensajeDependencias() {
    const revision = verificarDependencias();

    if (revision.correcto) return "";

    return `Faltan librerías necesarias: ${revision.faltantes.join(", ")}.`;
  }

  window.CertiCompat = {
    verificarDependencias,
    navegadorSoportado,
    crearMensajeDependencias
  };
})();