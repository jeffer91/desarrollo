/* =========================================================
Nombre completo: titulacion-export-pdf.js
Ruta: /Titulacion/frontend/js/exportacion/titulacion-export-pdf.js
Función o funciones:
- Orquestar la exportación PDF del módulo Titulación.
- Construir el documento completo con portada, índice, capítulos y anexos.
- Ejecutar descarga, apertura o impresión con pdfMake.
- Mantener fallback hacia impresión del navegador o Electron.
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

  function F() {
    return window.TITULACION_FILENAMES || {};
  }

  function asText(value, fallback) {
    if (U().asText) return U().asText(value, fallback);
    return String(value || fallback || "").trim();
  }

  function getCurrentDocument() {
    if (U().getCurrentDocument) {
      return U().getCurrentDocument();
    }

    if (
      window.TITULACION_CORE &&
      typeof window.TITULACION_CORE.getState === "function"
    ) {
      var state = window.TITULACION_CORE.getState();

      if (state && state.documentData) {
        return state.documentData;
      }
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

  function getDefaultFileName(documentData, options) {
    var opts = options || {};
    var doc = documentData || getCurrentDocument();
    var meta = doc.meta || {};

    if (opts.fileName) return opts.fileName;

    if (F().createReportFileName) {
      return F().createReportFileName({
        periodo: meta.periodo || meta.periodoLabel || opts.periodo,
        modalidad: meta.modalidad || opts.modalidad,
        sequence: opts.sequence,
        extension: "pdf"
      });
    }

    return "informe-final-titulacion.pdf";
  }

  function isElectronPdfAvailable() {
    return !!(
      window.titulacionAPI &&
      window.titulacionAPI.pdf &&
      typeof window.titulacionAPI.pdf.exportCurrentWindow === "function"
    );
  }

  function printInBrowser() {
    window.print();

    return Promise.resolve({
      ok: true,
      mode: "browser-print"
    });
  }

  function exportInElectron(documentData, options) {
    var doc = normalizeDocument(documentData || getCurrentDocument());
    var fileName = getDefaultFileName(doc, options || {});

    if (!isElectronPdfAvailable()) {
      return printInBrowser();
    }

    return window.titulacionAPI.pdf.exportCurrentWindow({
      defaultPath: fileName,
      options: {
        printBackground: true,
        pageSize: "A4",
        landscape: false
      }
    });
  }

  async function download(documentData, options) {
    var doc = normalizeDocument(documentData || getCurrentDocument());
    var docDefinition = buildDocumentDefinition(doc, options || {});

    if (A().download) {
      return A().download(docDefinition, doc, options || {});
    }

    if (isElectronPdfAvailable()) {
      return exportInElectron(doc, options || {});
    }

    return printInBrowser();
  }

  async function open(documentData, options) {
    var doc = normalizeDocument(documentData || getCurrentDocument());
    var docDefinition = buildDocumentDefinition(doc, options || {});

    if (A().open) {
      return A().open(docDefinition, doc, options || {});
    }

    return printInBrowser();
  }

  async function print(documentData, options) {
    var doc = normalizeDocument(documentData || getCurrentDocument());
    var docDefinition = buildDocumentDefinition(doc, options || {});

    if (A().print) {
      return A().print(docDefinition, doc, options || {});
    }

    return printInBrowser();
  }

  async function getBlob(documentData, options) {
    var doc = normalizeDocument(documentData || getCurrentDocument());
    var docDefinition = buildDocumentDefinition(doc, options || {});

    if (!A().getBlob) {
      throw new Error("No existe TITULACION_PDF_EXPORT_ACTIONS.getBlob.");
    }

    return A().getBlob(docDefinition);
  }

  async function getDataUrl(documentData, options) {
    var doc = normalizeDocument(documentData || getCurrentDocument());
    var docDefinition = buildDocumentDefinition(doc, options || {});

    if (!A().getDataUrl) {
      throw new Error("No existe TITULACION_PDF_EXPORT_ACTIONS.getDataUrl.");
    }

    return A().getDataUrl(docDefinition);
  }

  function openPrintView() {
    var printWindow = window.open("./titulacion-print.html", "_blank");

    if (!printWindow) {
      return printInBrowser();
    }

    return Promise.resolve({
      ok: true,
      mode: "print-window"
    });
  }

  function exportOrPrint(options) {
    return download(getCurrentDocument(), options || {});
  }

  function isReady() {
    return !!(
      B().buildDocDefinition ||
      isElectronPdfAvailable()
    );
  }

  window.TITULACION_EXPORT_PDF = {
    nombreCompleto: "titulacion-export-pdf.js",
    ruta: "Titulacion/frontend/js/exportacion/titulacion-export-pdf.js",
    funciones: [
      "isReady",
      "getCurrentDocument",
      "normalizeDocument",
      "buildDocumentDefinition",
      "download",
      "open",
      "print",
      "getBlob",
      "getDataUrl",
      "exportOrPrint",
      "openPrintView"
    ],
    isReady: isReady,
    isElectronPdfAvailable: isElectronPdfAvailable,
    getCurrentDocument: getCurrentDocument,
    normalizeDocument: normalizeDocument,
    buildDocumentDefinition: buildDocumentDefinition,
    getDefaultFileName: getDefaultFileName,
    download: download,
    open: open,
    print: print,
    getBlob: getBlob,
    getDataUrl: getDataUrl,
    exportOrPrint: exportOrPrint,
    exportInElectron: exportInElectron,
    printInBrowser: printInBrowser,
    openPrintView: openPrintView
  };
})(window);