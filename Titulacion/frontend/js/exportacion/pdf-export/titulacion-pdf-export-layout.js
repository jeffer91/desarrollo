/* =========================================================
Nombre completo: titulacion-pdf-export-layout.js
Ruta: /Titulacion/frontend/js/exportacion/pdf-export/titulacion-pdf-export-layout.js
Función o funciones:
- Centralizar márgenes, estilos y estructura general de pdfMake.
- Crear encabezado institucional para páginas internas.
- Crear pie de página con numeración.
- Mantener portada sin encabezado adicional.
========================================================= */

(function (window) {
  "use strict";

  function U() {
    return window.TITULACION_PDF_EXPORT_UTILS || {};
  }

  function asText(value, fallback) {
    return U().asText ? U().asText(value, fallback) : String(value || fallback || "").trim();
  }

  function getStyles() {
    return {
      coverTitle: {
        fontSize: 17,
        bold: true,
        alignment: "center",
        margin: [0, 92, 0, 72]
      },
      coverMeta: {
        fontSize: 8,
        alignment: "center"
      },
      h1: {
        fontSize: 14,
        bold: true,
        margin: [0, 0, 0, 12]
      },
      h2: {
        fontSize: 12,
        bold: true,
        margin: [0, 10, 0, 8]
      },
      h3: {
        fontSize: 10,
        bold: true,
        margin: [0, 8, 0, 6]
      },
      paragraph: {
        fontSize: 10,
        lineHeight: 1.25,
        alignment: "justify",
        margin: [0, 2, 0, 6]
      },
      tableHeader: {
        bold: true,
        fontSize: 8,
        color: "#000000",
        alignment: "center"
      },
      tableCell: {
        fontSize: 8,
        margin: [2, 2, 2, 2]
      },
      small: {
        fontSize: 7,
        lineHeight: 1.1
      },
      footer: {
        fontSize: 7,
        color: "#444444"
      }
    };
  }

  function getDefaultPageMargins() {
    return [42, 74, 42, 54];
  }

  function buildInternalHeader(meta) {
    var m = meta || {};

    return {
      margin: [42, 18, 42, 0],
      table: {
        widths: [84, "*", 62, 116],
        body: [
          [
            {
              text: asText(m.unidad, "Unidad de Titulación y Eficiencia Terminal"),
              rowSpan: 3,
              style: "small",
              alignment: "center",
              margin: [2, 8, 2, 2]
            },
            {
              text: asText(m.tituloCorto, "Informe Final Del Proceso De Titulación"),
              rowSpan: 3,
              style: "small",
              alignment: "center",
              bold: true,
              margin: [2, 8, 2, 2]
            },
            { text: "Código:", style: "small", bold: true },
            { text: asText(m.codigo, "-"), style: "small" }
          ],
          [
            {},
            {},
            { text: "Versión:", style: "small", bold: true },
            { text: asText(m.version, "1.0"), style: "small" }
          ],
          [
            {},
            {},
            { text: "Fecha:", style: "small", bold: true },
            { text: asText(m.fechaElaboracion, "-"), style: "small" }
          ]
        ]
      },
      layout: {
        hLineWidth: function () { return 0.7; },
        vLineWidth: function () { return 0.7; },
        hLineColor: function () { return "#222222"; },
        vLineColor: function () { return "#222222"; },
        paddingLeft: function () { return 3; },
        paddingRight: function () { return 3; },
        paddingTop: function () { return 2; },
        paddingBottom: function () { return 2; }
      }
    };
  }

  function headerFunction(meta) {
    return function (currentPage) {
      if (currentPage === 1) {
        return { text: "" };
      }

      return buildInternalHeader(meta);
    };
  }

  function footerFunction(meta) {
    return function (currentPage, pageCount) {
      if (currentPage === 1) {
        return { text: "" };
      }

      return {
        margin: [42, 0, 42, 18],
        columns: [
          {
            text: asText(meta && meta.tituloCorto, "Informe Final Del Proceso De Titulación"),
            style: "footer",
            alignment: "left"
          },
          {
            text: "Página " + currentPage + " de " + pageCount,
            style: "footer",
            alignment: "right"
          }
        ]
      };
    };
  }

  function applyLayout(docDefinition, meta) {
    var doc = docDefinition || {};

    doc.pageSize = doc.pageSize || "A4";
    doc.pageOrientation = doc.pageOrientation || "portrait";
    doc.pageMargins = doc.pageMargins || getDefaultPageMargins();
    doc.header = doc.header || headerFunction(meta || {});
    doc.footer = doc.footer || footerFunction(meta || {});
    doc.styles = Object.assign({}, getStyles(), doc.styles || {});
    doc.defaultStyle = Object.assign({
      fontSize: 10,
      lineHeight: 1.15
    }, doc.defaultStyle || {});

    return doc;
  }

  window.TITULACION_PDF_EXPORT_LAYOUT = {
    getStyles: getStyles,
    getDefaultPageMargins: getDefaultPageMargins,
    buildInternalHeader: buildInternalHeader,
    headerFunction: headerFunction,
    footerFunction: footerFunction,
    applyLayout: applyLayout
  };
})(window);