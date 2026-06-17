/*
=========================================================
Nombre completo: certi.config.js
Ruta o ubicación: /incorporaciones/sedes/certi/certi.config.js
Función o funciones:
- Definir la configuración general del módulo Certi.
- Centralizar rutas, textos institucionales, firmante, cargo y plantilla oficial.
- Permitir cambiar la plantilla del certificado desde un solo archivo.
Con qué se une:
- certi.template.js
- certi.pdf.js
- certi.app.js
- certi.storage.js
=========================================================
*/

(function () {
  "use strict";

  window.CertiConfig = {
    nombreModulo: "Certi",

    institucion: "Instituto Superior Tecnológico Quito Metropolitano",

    ciudad: "Quito",

    firmante: {
      nombre: "Dr. León Alberto Tito",
      cargo: "RECTOR"
    },

    rutas: {
      plantillaCertificado: "./assets/certi-plantilla-certificado.png"
    },

    pdf: {
      orientacion: "landscape",
      unidad: "mm",
      formato: "a4",
      ancho: 297,
      alto: 210,
      margenX: 28
    },

    archivos: {
      pdfUnicoPrefijo: "Certificados_Mejores_Egresados",
      pdfIndividualPrefijo: "Certificado"
    },

    texto: {
      encabezado: "El Instituto Superior Tecnológico Quito Metropolitano otorga el\npresente reconocimiento a:",

      reconocimiento:
        "Por su destacada trayectoria académica y por haber alcanzado un promedio de {{PROMEDIO}} en la carrera de {{CARRERA}}, cohorte {{PERIODO}}.",

      cierre:
        "Su esfuerzo, dedicación y compromiso con la excelencia constituyen un motivo de orgullo institucional y un referente para la comunidad educativa."
    }
  };
})();