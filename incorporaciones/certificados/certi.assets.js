/*
=========================================================
Nombre completo: certi.assets.js
Ruta o ubicación: /incorporaciones/sedes/certi/certi.assets.js
Función o funciones:
- Validar la existencia de la plantilla oficial del certificado.
- Permitir cargar recursos visuales del módulo Certi.
- Ayudar a detectar si falta el archivo de fondo antes de generar PDF.
Con qué se une:
- certi.config.js
- certi.pdf.js
- certi.app.js
=========================================================
*/

(function () {
  "use strict";

  function obtenerRutaPlantilla() {
    if (
      window.CertiConfig &&
      window.CertiConfig.rutas &&
      window.CertiConfig.rutas.plantillaCertificado
    ) {
      return window.CertiConfig.rutas.plantillaCertificado;
    }

    return "./assets/certi-plantilla-certificado.png";
  }

  function verificarPlantilla() {
    const ruta = obtenerRutaPlantilla();

    return new Promise(function (resolve) {
      const imagen = new Image();

      imagen.onload = function () {
        resolve({
          existe: true,
          ruta,
          ancho: imagen.naturalWidth || imagen.width,
          alto: imagen.naturalHeight || imagen.height
        });
      };

      imagen.onerror = function () {
        resolve({
          existe: false,
          ruta,
          ancho: 0,
          alto: 0
        });
      };

      imagen.src = ruta;
    });
  }

  async function alertaPlantilla() {
    const revision = await verificarPlantilla();

    if (revision.existe) {
      return {
        tipo: "success",
        titulo: "Plantilla encontrada",
        mensaje: "La plantilla oficial del certificado está disponible."
      };
    }

    return {
      tipo: "warning",
      titulo: "Plantilla no encontrada",
      mensaje: `No se encontró la plantilla en: ${revision.ruta}. El PDF se generará con fondo básico.`
    };
  }

  window.CertiAssets = {
    obtenerRutaPlantilla,
    verificarPlantilla,
    alertaPlantilla
  };
})();