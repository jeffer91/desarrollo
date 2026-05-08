/* =========================================================
Nombre completo: titulacion-pdf-export-actions.js
Ruta: /Titulacion/frontend/js/exportacion/pdf-export/titulacion-pdf-export-actions.js
Función o funciones:
- Ejecutar acciones de exportación PDF.
- Descargar, abrir o imprimir documentos pdfMake.
- Esperar cargas pendientes de anexos antes de exportar.
- Usar fallback de impresión cuando pdfMake no esté disponible.
========================================================= */

(function (window) {
  "use strict";

  function U() {
    return window.TITULACION_PDF_EXPORT_UTILS || {};
  }

  function F() {
    return window.TITULACION_FILENAMES || {};
  }

  function asText(value, fallback) {
    return U().asText ? U().asText(value, fallback) : String(value || fallback || "").trim();
  }

  async function waitForAnexos() {
    if (
      window.TITULACION_ANEXOS_UI &&
      typeof window.TITULACION_ANEXOS_UI.hasPendingUploads === "function" &&
      typeof window.TITULACION_ANEXOS_UI.waitForUploads === "function" &&
      window.TITULACION_ANEXOS_UI.hasPendingUploads()
    ) {
      await window.TITULACION_ANEXOS_UI.waitForUploads();
    }
  }

  function ensurePdfMake() {
    return !!(
      window.pdfMake &&
      typeof window.pdfMake.createPdf === "function"
    );
  }

  function createPdf(docDefinition) {
    if (!ensurePdfMake()) {
      return null;
    }

    return window.pdfMake.createPdf(docDefinition);
  }

  function getFileName(documentData, options) {
    var opts = options || {};
    var doc = documentData || {};
    var meta = doc.meta || {};

    if (opts.fileName) {
      return opts.fileName;
    }

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

  async function download(docDefinition, documentData, options) {
    await waitForAnexos();

    if (!ensurePdfMake()) {
      window.print();
      return {
        ok: false,
        fallback: "print",
        error: "pdfMake no está disponible. Se ejecutó impresión del navegador."
      };
    }

    var pdf = createPdf(docDefinition);
    var fileName = getFileName(documentData, options);

    pdf.download(fileName);

    return {
      ok: true,
      action: "download",
      fileName: fileName
    };
  }

  async function open(docDefinition) {
    await waitForAnexos();

    if (!ensurePdfMake()) {
      window.print();
      return {
        ok: false,
        fallback: "print",
        error: "pdfMake no está disponible. Se ejecutó impresión del navegador."
      };
    }

    createPdf(docDefinition).open();

    return {
      ok: true,
      action: "open"
    };
  }

  async function print(docDefinition) {
    await waitForAnexos();

    if (!ensurePdfMake()) {
      window.print();
      return {
        ok: false,
        fallback: "print",
        error: "pdfMake no está disponible. Se ejecutó impresión del navegador."
      };
    }

    createPdf(docDefinition).print();

    return {
      ok: true,
      action: "print"
    };
  }

  async function getBlob(docDefinition) {
    await waitForAnexos();

    return new Promise(function (resolve, reject) {
      if (!ensurePdfMake()) {
        reject(new Error("pdfMake no está disponible."));
        return;
      }

      try {
        createPdf(docDefinition).getBlob(function (blob) {
          resolve(blob);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async function getDataUrl(docDefinition) {
    await waitForAnexos();

    return new Promise(function (resolve, reject) {
      if (!ensurePdfMake()) {
        reject(new Error("pdfMake no está disponible."));
        return;
      }

      try {
        createPdf(docDefinition).getDataUrl(function (dataUrl) {
          resolve(dataUrl);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  window.TITULACION_PDF_EXPORT_ACTIONS = {
    waitForAnexos: waitForAnexos,
    ensurePdfMake: ensurePdfMake,
    createPdf: createPdf,
    getFileName: getFileName,
    download: download,
    open: open,
    print: print,
    getBlob: getBlob,
    getDataUrl: getDataUrl
  };
})(window);