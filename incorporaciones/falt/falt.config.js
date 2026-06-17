/*
=========================================================
Nombre completo: falt.config.js
Ruta o ubicación: /incorporaciones/falt/falt.config.js

Función o funciones:
1. Definir configuración general del módulo Faltantes.
2. Centralizar el mensaje por defecto para WhatsApp, Telegram y copia.
3. Definir textos base para motivo, almacenamiento y canales.
4. Mantener los mensajes editables desde un solo archivo.

Con qué se conecta:
- falt.message.js
- falt.app.js
- falt.table.js
- falt.whatsapp.js
- falt.telegram.js
=========================================================
*/

(function (window) {
  "use strict";

  window.FaltConfig = {
    nombreModulo: "Faltantes de Incorporación",

    storage: {
      historialKey: "itsqmet.incorporaciones.falt.historial.v1",
      seleccionadosKey: "itsqmet.incorporaciones.falt.seleccionados.v2"
    },

    motivoGeneral:
      "Pendiente de completar registro, pago, comprobante o encuesta de incorporación.",

    mensajeBase:
      "Estimado/a {{NOMBRE}}, reciba un cordial saludo.\n\n" +
      "Desde el área de Titulación del Instituto Superior Tecnológico Quito Metropolitano se le informa que, dentro del proceso de incorporación correspondiente al período {{PERIODO}}, aún registra pendiente alguno de los siguientes aspectos:\n\n" +
      "1. Registro de incorporación.\n" +
      "2. Pago de incorporación.\n" +
      "3. Envío o validación del comprobante de pago.\n" +
      "4. Llenado de la encuesta o formulario enviado.\n\n" +
      "Datos registrados:\n" +
      "Nombre: {{NOMBRE}}\n" +
      "Cédula: {{CEDULA}}\n" +
      "Carrera: {{CARRERA}}\n" +
      "Período: {{PERIODO}}\n\n" +
      "Por favor, revise su caso y envíe la información o evidencia correspondiente para completar el proceso.\n\n" +
      "Atentamente,\n" +
      "Msc. Jefferson Villarreal\n" +
      "Coordinador de Titulación",

    canales: {
      whatsapp: {
        label: "WhatsApp",
        enabled: true
      },
      telegram: {
        label: "Telegram",
        enabled: true
      }
    },

    tabla: {
      pageSize: 500
    }
  };
})(window);