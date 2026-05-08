/* =========================================================
Nombre completo: titulacion-pdf-export-builder.js
Ruta: /Titulacion/frontend/js/exportacion/pdf-export/titulacion-pdf-export-builder.js
Función o funciones:
- Construir el docDefinition completo para pdfMake.
- Integrar portada, índice, capítulos, resultados y anexos.
- Aplicar layout institucional.
- Devolver un documento listo para exportar.
========================================================= */

(function (window) {
  "use strict";

  function U() {
    return window.TITULACION_PDF_EXPORT_UTILS || {};
  }

  function L() {
    return window.TITULACION_PDF_EXPORT_LAYOUT || {};
  }

  function A() {
    return window.TITULACION_PDF_EXPORT_ASSETS || {};
  }

  function H() {
    return window.TITULACION_PDF_EXPORT_HEADINGS || {};
  }

  function X() {
    return window.TITULACION_PDF_EXPORT_ANEXOS || {};
  }

  function C() {
    return window.TITULACION_PORTADA || {};
  }

  function I() {
    return window.TITULACION_INDICE || {};
  }

  function asText(value, fallback) {
    return U().asText ? U().asText(value, fallback) : String(value || fallback || "").trim();
  }

  function normalizeDocument(documentData) {
    if (U().mergeAnexos) {
      return U().mergeAnexos(documentData);
    }

    return U().normalizeDocument ? U().normalizeDocument(documentData) : documentData || {};
  }

  function buildMeta(documentData, options) {
    var doc = documentData || {};
    var opts = options || {};
    var meta = doc.meta || {};
    var portadaData = {};

    if (C().buildCoverData) {
      portadaData = C().buildCoverData(Object.assign({}, meta, opts));
    }

    return {
      unidad: asText(portadaData.unidad || meta.unidad, "Unidad de Titulación y Eficiencia Terminal"),
      codigo: asText(portadaData.codigo || meta.codigoDocumento || meta.codigo, "-"),
      version: asText(portadaData.version || meta.version, "1.0"),
      fechaElaboracion: asText(portadaData.fechaElaboracion || meta.fechaElaboracion, "-"),
      tituloCorto: asText(doc.titulo || meta.tituloCorto, "Informe Final Del Proceso De Titulación"),
      portadaData: portadaData
    };
  }

  function buildCover(documentData, options, meta) {
    var doc = documentData || {};
    var opts = options || {};
    var data = meta && meta.portadaData ? meta.portadaData : {};
    var logoDataUrl = A().getLogoDataUrl ? A().getLogoDataUrl(opts) : "";

    var title = asText(data.titulo || doc.titulo, "Informe Final Del Proceso De Titulación");
    var firmas = data.firmas || {};

    return [
      {
        table: {
          widths: [86, "*", 70, 120],
          body: [
            [
              {
                rowSpan: 3,
                stack: [
                  A().createLogoBlock ? A().createLogoBlock(logoDataUrl || data.logoDataUrl) : { text: "LOGO" }
                ]
              },
              {
                rowSpan: 3,
                text: asText(data.unidad, "Unidad de Titulación y Eficiencia Terminal"),
                alignment: "center",
                bold: true,
                fontSize: 9,
                margin: [2, 14, 2, 2]
              },
              { text: "Código:", bold: true, fontSize: 8 },
              { text: asText(data.codigo || meta.codigo), fontSize: 8 }
            ],
            [
              {},
              {},
              { text: "Versión:", bold: true, fontSize: 8 },
              { text: asText(data.version || meta.version), fontSize: 8 }
            ],
            [
              {},
              {},
              { text: "Fecha de Elaboración:", bold: true, fontSize: 8 },
              { text: asText(data.fechaElaboracion || meta.fechaElaboracion), fontSize: 8 }
            ]
          ]
        },
        layout: {
          hLineWidth: function () { return 0.7; },
          vLineWidth: function () { return 0.7; },
          hLineColor: function () { return "#222222"; },
          vLineColor: function () { return "#222222"; }
        },
        margin: [0, 0, 0, 0]
      },
      {
        text: title,
        style: "coverTitle"
      },
      buildSignaturesTable(firmas),
      {
        text: "",
        pageBreak: "after"
      }
    ];
  }

  function buildSignaturesTable(firmas) {
    var f = firmas || {};

    return {
      table: {
        widths: ["*", "*", "*"],
        body: [
          [
            signatureHeader("ELABORADO POR:"),
            signatureHeader("REVISADO POR:"),
            signatureHeader("APROBADO POR:")
          ],
          [
            signatureCell(f.elaboradoPor),
            signatureCell(f.revisadoPor),
            signatureCell(f.aprobadoPor)
          ]
        ]
      },
      layout: {
        hLineWidth: function () { return 0.7; },
        vLineWidth: function () { return 0.7; },
        hLineColor: function () { return "#222222"; },
        vLineColor: function () { return "#222222"; }
      },
      margin: [0, 0, 0, 0]
    };
  }

  function signatureHeader(value) {
    return {
      text: value,
      alignment: "center",
      bold: true,
      fontSize: 8,
      margin: [2, 4, 2, 4]
    };
  }

  function signatureCell(person) {
    var p = person || {};

    return {
      stack: [
        { text: "\n\n\n", fontSize: 10 },
        { text: "NOMBRE: " + asText(p.nombre), fontSize: 8, margin: [2, 2, 2, 4] },
        { text: "CARGO:", bold: true, fontSize: 8, margin: [2, 2, 2, 1] },
        { text: asText(p.cargo), fontSize: 8, margin: [2, 0, 2, 6] }
      ]
    };
  }

  function buildIndex(sections) {
    var items = [];

    if (I().buildIndexItems) {
      items = I().buildIndexItems(sections);
    } else {
      items = (Array.isArray(sections) ? sections : []).map(function (section, index) {
        return {
          numero: index + 1,
          titulo: section.titulo || "Sección"
        };
      });
    }

    var body = items.map(function (item) {
      return {
        columns: [
          { text: String(item.numero) + ". " + asText(item.titulo), width: "*" },
          { text: "", width: 20 }
        ],
        margin: [0, 2, 0, 2]
      };
    });

    return [
      { text: "Índice", style: "h1" },
      body.length ? body : { text: "No se registran secciones.", style: "paragraph" },
      { text: "", pageBreak: "after" }
    ];
  }

  function buildSectionsContent(sections) {
    var list = (Array.isArray(sections) ? sections : [])
      .filter(function (section) {
        return section && section.visible !== false;
      })
      .filter(function (section) {
        return section.tipo !== "portada" && section.id !== "indice" && section.id !== "anexos";
      });

    var content = [];

    list.forEach(function (section, index) {
      if (H().createSectionBlock) {
        content = content.concat(H().createSectionBlock(section, index));
      }
    });

    return content;
  }

  function buildDocDefinition(documentData, options) {
    var doc = normalizeDocument(documentData);
    var opts = options || {};
    var meta = buildMeta(doc, opts);
    var sections = Array.isArray(doc.secciones) ? doc.secciones : [];
    var content = [];

    content = content.concat(buildCover(doc, opts, meta));
    content = content.concat(buildIndex(sections));
    content = content.concat(buildSectionsContent(sections));

    if (X().buildAnexosContent) {
      content = content.concat(X().buildAnexosContent(doc.anexos || []));
    }

    var definition = {
      info: {
        title: asText(doc.titulo, "Informe Final Del Proceso De Titulación"),
        author: "Unidad de Titulación y Eficiencia Terminal",
        subject: "Informe final de titulación"
      },
      content: content
    };

    if (L().applyLayout) {
      return L().applyLayout(definition, meta);
    }

    return definition;
  }

  window.TITULACION_PDF_EXPORT_BUILDER = {
    buildMeta: buildMeta,
    buildCover: buildCover,
    buildSignaturesTable: buildSignaturesTable,
    buildIndex: buildIndex,
    buildSectionsContent: buildSectionsContent,
    buildDocDefinition: buildDocDefinition
  };
})(window);