/* =========================================================
Nombre completo: titulacion-document-code.js
Ruta: /Titulacion/frontend/js/documentos/titulacion-document-code.js
Función o funciones:
- Generar códigos institucionales para informes de titulación.
- Usar el formato UTET-INF-XX-PRO-95-AAAA-MM.
- Manejar la secuencia mensual de documentos generados.
- Evitar que la secuencia dependa de la modalidad.
- Crear códigos para vista previa o emisión definitiva.
========================================================= */

(function (window) {
  "use strict";

  function config() {
    return window.TITULACION_CONFIG || {};
  }

  function utils() {
    return window.TITULACION_UTILS || {};
  }

  function pad2(value) {
    var U = utils();
    if (typeof U.pad2 === "function") return U.pad2(value);
    return String(value).padStart(2, "0");
  }

  function asText(value) {
    var U = utils();
    if (typeof U.asText === "function") return U.asText(value);
    return String(value == null ? "" : value).trim();
  }

  function readStorage(key, fallback) {
    var U = utils();
    if (typeof U.readStorage === "function") return U.readStorage(key, fallback);

    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    var U = utils();
    if (typeof U.writeStorage === "function") return U.writeStorage(key, value);

    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function getDateParts(date) {
    var d = date instanceof Date ? date : new Date();

    return {
      year: d.getFullYear(),
      month: pad2(d.getMonth() + 1),
      day: pad2(d.getDate())
    };
  }

  function getConfigCode() {
    var cfg = config();
    var doc = cfg.documentos || {};
    var code = doc.codigo || {};

    return {
      prefijo: asText(code.prefijo || "UTET-INF"),
      proceso: asText(code.proceso || "PRO-95"),
      secuenciaInicial: Number(code.secuenciaInicial || 1)
    };
  }

  function getSequenceKey(date) {
    var parts = getDateParts(date);

    return [
      "titulacion",
      "document",
      "sequence",
      parts.year,
      parts.month
    ].join(".");
  }

  function readMonthlySequence(date) {
    var cfg = getConfigCode();
    var key = getSequenceKey(date);
    var value = readStorage(key, null);

    if (value && Number(value.current) > 0) {
      return {
        key: key,
        current: Number(value.current)
      };
    }

    return {
      key: key,
      current: cfg.secuenciaInicial - 1
    };
  }

  function setMonthlySequence(date, value) {
    var key = getSequenceKey(date);
    var current = Math.max(0, Number(value || 0));

    writeStorage(key, {
      current: current,
      updatedAt: new Date().toISOString()
    });

    return current;
  }

  function peekNextSequence(date) {
    var sequence = readMonthlySequence(date);
    return sequence.current + 1;
  }

  function registerNextSequence(date) {
    var next = peekNextSequence(date);
    setMonthlySequence(date, next);
    return next;
  }

  function formatSequence(value) {
    return pad2(Math.max(1, Number(value || 1)));
  }

  function createDocumentCode(args) {
    var options = args || {};
    var date = options.date instanceof Date ? options.date : new Date();
    var parts = getDateParts(date);
    var cfg = getConfigCode();
    var sequence = Number(options.sequence || peekNextSequence(date));

    return [
      cfg.prefijo,
      formatSequence(sequence),
      cfg.proceso,
      parts.year,
      parts.month
    ].join("-");
  }

  function createPreviewCode(args) {
    var options = args || {};
    return createDocumentCode(Object.assign({}, options, {
      sequence: options.sequence || peekNextSequence(options.date)
    }));
  }

  function createFinalCode(args) {
    var options = args || {};
    var date = options.date instanceof Date ? options.date : new Date();
    var sequence = Number(options.sequence || registerNextSequence(date));

    return createDocumentCode(Object.assign({}, options, {
      date: date,
      sequence: sequence
    }));
  }

  function createHeaderMeta(args) {
    var options = args || {};
    var date = options.date instanceof Date ? options.date : new Date();
    var cfg = config();
    var institution = cfg.institution || {};
    var code = options.final === true
      ? createFinalCode(options)
      : createPreviewCode(options);

    return {
      unidad: asText(institution.unidad || "Unidad de Titulación y Eficiencia Terminal"),
      codigo: code,
      version: asText(institution.versionDocumento || "1.0"),
      fechaElaboracion: options.fechaElaboracion || formatDateHuman(date),
      generatedAt: date.toISOString()
    };
  }

  function formatDateHuman(date) {
    var U = utils();

    if (typeof U.formatDateLongEs === "function") {
      return U.formatDateLongEs(date);
    }

    var d = date instanceof Date ? date : new Date();

    return [
      pad2(d.getDate()),
      pad2(d.getMonth() + 1),
      d.getFullYear()
    ].join("-");
  }

  function resetMonthlySequence(date) {
    return setMonthlySequence(date, 0);
  }

  window.TITULACION_DOCUMENT_CODE = {
    getDateParts: getDateParts,
    getSequenceKey: getSequenceKey,
    readMonthlySequence: readMonthlySequence,
    setMonthlySequence: setMonthlySequence,
    peekNextSequence: peekNextSequence,
    registerNextSequence: registerNextSequence,
    formatSequence: formatSequence,
    createDocumentCode: createDocumentCode,
    createPreviewCode: createPreviewCode,
    createFinalCode: createFinalCode,
    createHeaderMeta: createHeaderMeta,
    resetMonthlySequence: resetMonthlySequence
  };
})(window);