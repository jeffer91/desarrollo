/* =========================================================
Nombre completo: titulacion-pdf-export-anexos.js
Ruta: /Titulacion/frontend/js/exportacion/pdf-export/titulacion-pdf-export-anexos.js
Función o funciones:
- Construir sección de anexos para pdfMake.
- Insertar imágenes como evidencias visuales.
- Insertar PDF u otros documentos como referencias.
- Evitar mostrar rutas, buckets o textos técnicos en el documento final.
========================================================= */

(function (window) {
  "use strict";

  function U() {
    return window.TITULACION_PDF_EXPORT_UTILS || {};
  }

  function A() {
    return window.TITULACION_PDF_EXPORT_ASSETS || {};
  }

  function H() {
    return window.TITULACION_PDF_EXPORT_HEADINGS || {};
  }

  function asText(value, fallback) {
    return U().asText ? U().asText(value, fallback) : String(value || fallback || "").trim();
  }

  function paragraph(value) {
    if (H().paragraph) return H().paragraph(value);
    return { text: asText(value), style: "paragraph" };
  }

  function isImage(anexo) {
    if (A().isImageAnexo) return A().isImageAnexo(anexo);

    var item = anexo || {};
    var type = asText(item.type).toLowerCase();
    var name = asText(item.name).toLowerCase();

    return type.indexOf("image/") === 0 || /\.(png|jpg|jpeg|webp)$/i.test(name);
  }

  function getImageSource(anexo) {
    if (A().getImageSource) return A().getImageSource(anexo);

    var item = anexo || {};
    return asText(item.dataUrl || item.readableUrl || item.publicUrl);
  }

  function normalizeAnexo(anexo, index) {
    var item = anexo || {};

    return {
      id: asText(item.id, "anexo-" + String(index + 1)),
      source: asText(item.source || item.tipo, "evidencia"),
      name: asText(item.name || item.nombre, "Anexo " + String(index + 1)),
      title: asText(item.title || item.titulo || item.name || item.nombre, "Anexo " + String(index + 1)),
      description: asText(item.description || item.descripcion),
      type: asText(item.type, "application/octet-stream"),
      dataUrl: getImageSource(item)
    };
  }

  function sourceTitle(source) {
    var s = asText(source).toLowerCase();

    if (s === "sisacad") return "Evidencias SISACAD";
    if (s === "correos" || s === "correo") return "Evidencias de correos";
    if (s === "cronograma") return "Cronograma";
    if (s === "resultados") return "Resultados";
    if (s === "evidencias") return "Evidencias generales";

    return "Otros anexos";
  }

  function groupBySource(anexos) {
    var map = {};

    anexos.forEach(function (item) {
      var source = asText(item.source, "evidencias");
      map[source] = map[source] || [];
      map[source].push(item);
    });

    return map;
  }

  function imageBlock(anexo, index) {
    var src = getImageSource(anexo);

    if (!src) {
      return paragraph("Anexo " + String(index + 1) + ". " + anexo.title);
    }

    return [
      {
        image: src,
        fit: [460, 430],
        alignment: "center",
        margin: [0, 6, 0, 4]
      },
      {
        text: "Anexo " + String(index + 1) + ". " + asText(anexo.title),
        fontSize: 8,
        italics: true,
        alignment: "center",
        margin: [0, 0, 0, 12]
      }
    ];
  }

  function fileBlock(anexo, index) {
    return {
      table: {
        widths: [70, "*"],
        body: [
          [
            { text: "Anexo " + String(index + 1), bold: true, fontSize: 8 },
            { text: asText(anexo.title), fontSize: 8 }
          ],
          [
            { text: "Tipo", bold: true, fontSize: 8 },
            { text: asText(anexo.type, "Documento adjunto"), fontSize: 8 }
          ]
        ]
      },
      layout: {
        hLineWidth: function () { return 0.5; },
        vLineWidth: function () { return 0.5; },
        hLineColor: function () { return "#d1d5db"; },
        vLineColor: function () { return "#d1d5db"; }
      },
      margin: [0, 4, 0, 8]
    };
  }

  function createAnexoContent(anexo, index) {
    if (isImage(anexo)) {
      return imageBlock(anexo, index);
    }

    return fileBlock(anexo, index);
  }

  function buildAnexosContent(anexos) {
    var list = (Array.isArray(anexos) ? anexos : [])
      .map(normalizeAnexo);

    var content = [
      {
        text: "Anexos",
        style: "h1",
        pageBreak: "before"
      }
    ];

    if (!list.length) {
      content.push(paragraph("No se registran anexos para el presente informe."));
      return content;
    }

    var groups = groupBySource(list);
    var counter = 0;

    Object.keys(groups).forEach(function (source) {
      content.push({
        text: sourceTitle(source),
        style: "h2"
      });

      groups[source].forEach(function (anexo) {
        counter += 1;

        var block = createAnexoContent(anexo, counter);

        if (Array.isArray(block)) {
          content = content.concat(block);
        } else {
          content.push(block);
        }
      });
    });

    return content;
  }

  window.TITULACION_PDF_EXPORT_ANEXOS = {
    normalizeAnexo: normalizeAnexo,
    sourceTitle: sourceTitle,
    groupBySource: groupBySource,
    imageBlock: imageBlock,
    fileBlock: fileBlock,
    createAnexoContent: createAnexoContent,
    buildAnexosContent: buildAnexosContent
  };
})(window);