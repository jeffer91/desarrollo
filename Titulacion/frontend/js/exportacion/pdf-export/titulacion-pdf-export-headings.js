/* =========================================================
Nombre completo: titulacion-pdf-export-headings.js
Ruta: /Titulacion/frontend/js/exportacion/pdf-export/titulacion-pdf-export-headings.js
Función o funciones:
- Crear títulos, subtítulos y bloques de texto para PDF.
- Convertir secciones del documento en contenido pdfMake.
- Controlar saltos de página por capítulo.
========================================================= */

(function (window) {
  "use strict";

  function U() {
    return window.TITULACION_PDF_EXPORT_UTILS || {};
  }

  function asText(value, fallback) {
    return U().asText ? U().asText(value, fallback) : String(value || fallback || "").trim();
  }

  function paragraph(value) {
    if (U().paragraph) {
      return U().paragraph(value);
    }

    return {
      text: asText(value),
      style: "paragraph",
      margin: [0, 2, 0, 6]
    };
  }

  function h1(value, options) {
    return Object.assign({
      text: asText(value),
      style: "h1",
      margin: [0, 0, 0, 12]
    }, options || {});
  }

  function h2(value, options) {
    return Object.assign({
      text: asText(value),
      style: "h2"
    }, options || {});
  }

  function h3(value, options) {
    return Object.assign({
      text: asText(value),
      style: "h3"
    }, options || {});
  }

  function sectionTitle(section, index) {
    var title = asText(section && section.titulo, "Sección");
    var tipo = asText(section && section.tipo).toLowerCase();

    if (tipo === "indice") {
      return h1(title, { pageBreak: "before" });
    }

    return h1(title, {
      pageBreak: index > 0 ? "before" : undefined
    });
  }

  function sectionContent(section) {
    var safe = section || {};
    var content = Array.isArray(safe.contenido) ? safe.contenido : [];

    if (!content.length) {
      return [paragraph("Esta sección no registra contenido.")];
    }

    return content.map(function (item) {
      return paragraph(item);
    });
  }

  function createSectionBlock(section, index) {
    var safe = section || {};
    var tipo = asText(safe.tipo).toLowerCase();

    if (tipo === "portada") {
      return [];
    }

    var block = [sectionTitle(safe, index)];

    if (tipo === "infografia" && safe.data && safe.data.steps) {
      block = block.concat(createStepsBlock(safe.data.steps));
      return block;
    }

    block = block.concat(sectionContent(safe));

    return block;
  }

  function createStepsBlock(steps) {
    var list = Array.isArray(steps) ? steps : [];

    if (!list.length) {
      return [paragraph("No se registran fases del proceso.")];
    }

    return list.map(function (step, index) {
      return {
        table: {
          widths: [28, "*"],
          body: [
            [
              {
                text: String(index + 1),
                alignment: "center",
                bold: true,
                fontSize: 13,
                margin: [0, 6, 0, 6]
              },
              [
                {
                  text: asText(step.titulo, "Fase"),
                  bold: true,
                  fontSize: 10,
                  margin: [0, 2, 0, 2]
                },
                {
                  text: asText(step.descripcion),
                  fontSize: 9,
                  margin: [0, 0, 0, 2]
                }
              ]
            ]
          ]
        },
        layout: {
          hLineWidth: function () { return 0.5; },
          vLineWidth: function () { return 0.5; },
          hLineColor: function () { return "#d1d5db"; },
          vLineColor: function () { return "#d1d5db"; }
        },
        margin: [0, 2, 0, 8]
      };
    });
  }

  window.TITULACION_PDF_EXPORT_HEADINGS = {
    h1: h1,
    h2: h2,
    h3: h3,
    paragraph: paragraph,
    sectionTitle: sectionTitle,
    sectionContent: sectionContent,
    createSectionBlock: createSectionBlock,
    createStepsBlock: createStepsBlock
  };
})(window);