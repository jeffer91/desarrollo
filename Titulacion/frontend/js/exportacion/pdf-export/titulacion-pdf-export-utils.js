/* =========================================================
Nombre completo: titulacion-pdf-export-utils.js
Ruta: /Titulacion/frontend/js/exportacion/pdf-export/titulacion-pdf-export-utils.js
Función o funciones:
- Centralizar utilidades para exportación PDF.
- Normalizar textos, arrays, objetos y documentos.
- Crear párrafos, listas y saltos de página compatibles con pdfMake.
- Evitar que datos incompletos rompan la exportación.
========================================================= */

(function (window) {
  "use strict";

  function getUtils() {
    return window.TITULACION_UTILS || {};
  }

  function getValidaciones() {
    return window.TITULACION_VALIDACIONES || {};
  }

  function asText(value, fallback) {
    var U = getUtils();

    if (typeof U.asText === "function") {
      var text = U.asText(value);
      return text || String(fallback || "");
    }

    var result = String(value === null || value === undefined ? "" : value).trim();
    return result || String(fallback || "");
  }

  function isObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function asArray(value) {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined) return [];
    return [value];
  }

  function clone(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return value;
    }
  }

  function normalizeDocument(documentData) {
    var V = getValidaciones();

    if (typeof V.normalizeDocument === "function") {
      return V.normalizeDocument(documentData);
    }

    var safe = isObject(documentData) ? documentData : {};

    return {
      titulo: asText(safe.titulo, "Informe Final Del Proceso De Titulación"),
      subtitulo: asText(safe.subtitulo),
      meta: isObject(safe.meta) ? safe.meta : {},
      secciones: Array.isArray(safe.secciones) ? safe.secciones : [],
      anexos: Array.isArray(safe.anexos) ? safe.anexos : []
    };
  }

  function getCurrentDocument() {
    if (
      window.TITULACION_CORE &&
      typeof window.TITULACION_CORE.getState === "function"
    ) {
      var state = window.TITULACION_CORE.getState();
      if (state && state.documentData) {
        return normalizeDocument(state.documentData);
      }
    }

    if (
      window.TITULACION_DB &&
      typeof window.TITULACION_DB.getCurrentDocument === "function"
    ) {
      return normalizeDocument(window.TITULACION_DB.getCurrentDocument());
    }

    return normalizeDocument({});
  }

  function text(value, options) {
    var opts = options || {};

    return Object.assign({
      text: asText(value),
      margin: opts.margin || [0, 2, 0, 6],
      alignment: opts.alignment || "justify"
    }, opts);
  }

  function paragraph(value, options) {
    return text(value, Object.assign({
      style: "paragraph"
    }, options || {}));
  }

  function paragraphs(items, options) {
    return asArray(items)
      .map(function (item) {
        return asText(item);
      })
      .filter(Boolean)
      .map(function (item) {
        return paragraph(item, options);
      });
  }

  function bulletList(items, options) {
    var list = asArray(items)
      .map(function (item) {
        return asText(item);
      })
      .filter(Boolean);

    if (!list.length) {
      return paragraph("No se registran elementos.");
    }

    return Object.assign({
      ul: list,
      margin: [14, 2, 0, 8],
      style: "paragraph"
    }, options || {});
  }

  function numberedList(items, options) {
    var list = asArray(items)
      .map(function (item) {
        return asText(item);
      })
      .filter(Boolean);

    if (!list.length) {
      return paragraph("No se registran elementos.");
    }

    return Object.assign({
      ol: list,
      margin: [14, 2, 0, 8],
      style: "paragraph"
    }, options || {});
  }

  function spacer(height) {
    return {
      text: "",
      margin: [0, Number(height || 8), 0, 0]
    };
  }

  function pageBreak() {
    return {
      text: "",
      pageBreak: "after"
    };
  }

  function ensurePdfMake() {
    return !!(
      window.pdfMake &&
      typeof window.pdfMake.createPdf === "function"
    );
  }

  function getAnexosFromUi() {
    if (
      window.TITULACION_ANEXOS_UI &&
      typeof window.TITULACION_ANEXOS_UI.getItems === "function"
    ) {
      return window.TITULACION_ANEXOS_UI.getItems();
    }

    return [];
  }

  function mergeAnexos(documentData) {
    var doc = normalizeDocument(documentData);
    var fromUi = getAnexosFromUi();
    var existing = Array.isArray(doc.anexos) ? doc.anexos : [];

    doc.anexos = existing.concat(fromUi);

    return doc;
  }

  window.TITULACION_PDF_EXPORT_UTILS = {
    asText: asText,
    isObject: isObject,
    asArray: asArray,
    clone: clone,
    normalizeDocument: normalizeDocument,
    getCurrentDocument: getCurrentDocument,
    text: text,
    paragraph: paragraph,
    paragraphs: paragraphs,
    bulletList: bulletList,
    numberedList: numberedList,
    spacer: spacer,
    pageBreak: pageBreak,
    ensurePdfMake: ensurePdfMake,
    getAnexosFromUi: getAnexosFromUi,
    mergeAnexos: mergeAnexos
  };
})(window);