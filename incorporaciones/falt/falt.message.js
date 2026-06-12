/*
=========================================================
Nombre completo: falt.message.js
Ruta o ubicación: /incorporaciones/falt/falt.message.js

Función o funciones:
1. Generar el mensaje por defecto para estudiantes faltantes.
2. Reemplazar automáticamente nombre, cédula, carrera y período.
3. Usar un motivo único general: registro, pago, comprobante o encuesta pendiente.
4. Entregar el mismo mensaje para copiar, WhatsApp o Telegram.
5. Evitar que el usuario tenga que escribir manualmente el mensaje.

Con qué se conecta:
- falt.config.js
- falt.filters.js
- falt.whatsapp.js
- falt.telegram.js
- falt.table.js
- falt.app.js
=========================================================
*/

(function (window) {
  "use strict";

  function asText(value) {
    return String(value == null ? "" : value).trim();
  }

  function safeValue(value, fallback) {
    var text = asText(value);
    return text || fallback || "";
  }

  function getFromFilters(method, row) {
    if (
      window.FaltFilters &&
      typeof window.FaltFilters[method] === "function"
    ) {
      return window.FaltFilters[method](row);
    }

    return "";
  }

  function getMeta(row) {
    return row && row._falt ? row._falt : {};
  }

  function getNombre(row) {
    return safeValue(
      getFromFilters("getNombres", row) ||
        getMeta(row).nombre ||
        row.Nombres ||
        row.nombres ||
        row.nombre,
      "estudiante"
    );
  }

  function getCedula(row) {
    return safeValue(
      getFromFilters("getCedula", row) ||
        getMeta(row).cedula ||
        row.cedula ||
        row.Cedula ||
        row.numeroIdentificacion,
      "No registrada"
    );
  }

  function getCarrera(row) {
    return safeValue(
      getFromFilters("getCarrera", row) ||
        getMeta(row).carrera ||
        row.Carrera ||
        row.carrera,
      "No registrada"
    );
  }

  function getPeriodo(row, periodoTexto) {
    return safeValue(
      getFromFilters("getPeriodo", row) ||
        getMeta(row).periodoTexto ||
        getMeta(row).periodo ||
        row.periodo ||
        row.Periodo ||
        periodoTexto,
      "período actual"
    );
  }

  function getMotivo(row) {
    return safeValue(
      getFromFilters("getMotivo", row) ||
        getMeta(row).motivo ||
        (
          window.FaltConfig &&
          window.FaltConfig.motivoGeneral
        ),
      "Pendiente de completar registro, pago, comprobante o encuesta de incorporación."
    );
  }

  function getTemplate() {
    if (window.FaltConfig && window.FaltConfig.mensajeBase) {
      return window.FaltConfig.mensajeBase;
    }

    return (
      "Estimado/a {{NOMBRE}}, reciba un cordial saludo.\n\n" +
      "Desde el área de Titulación se le informa que, dentro del proceso de incorporación correspondiente al período {{PERIODO}}, aún registra pendiente alguno de los siguientes aspectos:\n\n" +
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
      "Coordinador de Titulación"
    );
  }

  function replaceAll(text, replacements) {
    var result = asText(text);

    Object.keys(replacements).forEach(function (key) {
      var pattern = new RegExp("\\{\\{" + key + "\\}\\}", "g");
      result = result.replace(pattern, replacements[key]);
    });

    return result;
  }

  function generar(row, options) {
    var opts = options || {};
    var periodoTexto = opts.periodoTexto || "";

    var data = {
      NOMBRE: getNombre(row),
      CEDULA: getCedula(row),
      CARRERA: getCarrera(row),
      PERIODO: getPeriodo(row, periodoTexto),
      MOTIVO: getMotivo(row)
    };

    return replaceAll(getTemplate(), data);
  }

  function generarVistaPrevia(row, options) {
    if (!row) {
      return "Selecciona un estudiante para ver el mensaje.";
    }

    return generar(row, options || {});
  }

  function generarTodos(rows, options) {
    return (Array.isArray(rows) ? rows : []).map(function (row, index) {
      return [
        "==============================",
        "Mensaje " + (index + 1),
        "==============================",
        generar(row, options || {})
      ].join("\n");
    }).join("\n\n");
  }

  window.FaltMessage = {
    generar: generar,
    generarVistaPrevia: generarVistaPrevia,
    generarTodos: generarTodos,
    getNombre: getNombre,
    getCedula: getCedula,
    getCarrera: getCarrera,
    getPeriodo: getPeriodo,
    getMotivo: getMotivo
  };
})(window);