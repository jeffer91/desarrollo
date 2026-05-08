/* =========================================================
Nombre completo: titulacion-export-pdf.js
Ruta: /Titulacion/frontend/js/exportacion/titulacion-export-pdf.js
Función o funciones:
- Orquestar la exportación PDF del módulo Titulación.
- Construir el documento completo con portada, índice, capítulos y anexos.
- Ejecutar descarga, apertura o impresión.
- Servir como punto único de entrada para el core y los botones de la app.
========================================================= */

(function (window) {
  "use strict";

  function U() {
    return window.TITULACION_PDF_EXPORT_UTILS || {};
  }

  function B() {
    return window.TITULACION_PDF_EXPORT_BUILDER || {};
  }

  function A() {
    return window.TITULACION_PDF_EXPORT_ACTIONS || {};
  }

  function asText(value, fallback) {
    return U().asText ? U().asText(value, fallback) : String(value || fallback || "").trim();
  }

  function getCurrentDocument() {
    if (U().getCurrentDocument) {
      return U().getCurrentDocument();
    }

    if (
      window.TITULACION_DB &&
      typeof window.TITULACION_DB.getCurrentDocument === "function"
    ) {
      return window.TITULACION_DB.getCurrentDocument();
    }

    return {
      titulo: "Informe Final Del Proceso De Titulación",
      secciones: [],
      anexos: []
    };
  }

  function normalizeDocument(documentData) {
    if (U().normalizeDocument) {
      return U().normalizeDocument(documentData);
    }

    return documentData || getCurrentDocument();
  }

  function buildDocumentDefinition(documentData, options) {
    var doc = normalizeDocument(documentData || getCurrentDocument());

    if (!B().buildDocDefinition) {
      throw new Error("No existe TITULACION_PDF_EXPORT_BUILDER.buildDocDefinition.");
    }

    return B().buildDocDefinition(doc, options || {});
  }

  async function download(documentData, options) {
    var doc = normalizeDocument(documentData || getCurrentDocument());
    var docDefinition = buildDocumentDefinition(doc, options);

    if (!A().download) {
      throw new Error("No existe TITULACION_PDF_EXPORT_ACTIONS.download.");
    }

    return A().download(docDefinition, doc, options || {});
  }

  async function open(documentData, options) {
    var doc = normalizeDocument(documentData || getCurrentDocument());
    var docDefinition = buildDocumentDefinition(doc, options);

    if (!A().open) {
      throw new Error("No existe TITULACION_PDF_EXPORT_ACTIONS.open.");
    }

    return A().open(docDefinition, doc, options || {});
  }

  async function print(documentData, options) {
    var doc = normalizeDocument(documentData || getCurrentDocument());
    var docDefinition = buildDocumentDefinition(doc, options);

    if (!A().print) {
      throw new Error("No existe TITULACION_PDF_EXPORT_ACTIONS.print.");
    }

    return A().print(docDefinition, doc, options || {});
  }

  async function getBlob(documentData, options) {
    var doc = normalizeDocument(documentData || getCurrentDocument());
    var docDefinition = buildDocumentDefinition(doc, options);

    if (!A().getBlob) {
      throw new Error("No existe TITULACION_PDF_EXPORT_ACTIONS.getBlob.");
    }

    return A().getBlob(docDefinition);
  }

  async function getDataUrl(documentData, options) {
    var doc = normalizeDocument(documentData || getCurrentDocument());
    var docDefinition = buildDocumentDefinition(doc, options);

    if (!A().getDataUrl) {
      throw new Error("No existe TITULACION_PDF_EXPORT_ACTIONS.getDataUrl.");
    }

    return A().getDataUrl(docDefinition);
  }

  async function exportCurrent(options) {
    return download(getCurrentDocument(), options || {});
  }

  function isReady() {
    return !!(
      B().buildDocDefinition &&
      A().download
    );
  }

  window.TITULACION_EXPORT_PDF = {
    isReady: isReady,
    getCurrentDocument: getCurrentDocument,
    normalizeDocument: normalizeDocument,
    buildDocumentDefinition: buildDocumentDefinition,
    download: download,
    open: open,
    print: print,
    getBlob: getBlob,
    getDataUrl: getDataUrl,
    exportCurrent: exportCurrent
  };
})(window);