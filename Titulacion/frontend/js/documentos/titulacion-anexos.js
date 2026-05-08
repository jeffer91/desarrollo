/* =========================================================
Nombre completo: titulacion-anexos.js
Ruta: /Titulacion/frontend/js/documentos/titulacion-anexos.js
Función o funciones:
- Crear anexos individuales para el informe.
- Construir la sección de anexos del documento.
- Tomar anexos desde TITULACION_ANEXOS_UI si está disponible.
- Generar HTML limpio de anexos para vista previa e impresión.
- Evitar textos técnicos debajo de imágenes en el PDF.
========================================================= */

(function (window) {
  "use strict";

  function utils() {
    return window.TITULACION_UTILS || {};
  }

  function asText(value) {
    var U = utils();
    if (typeof U.asText === "function") return U.asText(value);
    return String(value == null ? "" : value).trim();
  }

  function esc(value) {
    var U = utils();
    if (typeof U.escapeHtml === "function") return U.escapeHtml(value);

    return asText(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function isImage(item) {
    var U = utils();

    if (typeof U.isImageNameOrMime === "function") {
      return U.isImageNameOrMime(item && item.name, item && item.type);
    }

    var type = asText(item && item.type).toLowerCase();
    var name = asText(item && item.name).toLowerCase();

    return type.indexOf("image/") === 0 || /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(name);
  }

  function createAnexo(args) {
    var item = args || {};

    return {
      id: asText(item.id || "anexo-" + Date.now()),
      source: asText(item.source || item.tipo || "evidencia"),
      name: asText(item.name || item.nombre || "Anexo"),
      title: asText(item.title || item.titulo || item.name || "Anexo"),
      description: asText(item.description || item.descripcion || ""),
      type: asText(item.type || "application/octet-stream"),
      dataUrl: asText(item.dataUrl || item.readableUrl || item.publicUrl || ""),
      path: asText(item.path),
      bucket: asText(item.bucket),
      online: !!item.online
    };
  }

  function getCurrentAnexos() {
    if (
      window.TITULACION_ANEXOS_UI &&
      typeof window.TITULACION_ANEXOS_UI.getItems === "function"
    ) {
      return window.TITULACION_ANEXOS_UI.getItems().map(createAnexo);
    }

    return [];
  }

  function groupBySource(anexos) {
    var list = Array.isArray(anexos) ? anexos : [];
    var map = {};

    list.forEach(function (item) {
      var source = asText(item.source || "evidencia") || "evidencia";
      map[source] = map[source] || [];
      map[source].push(item);
    });

    return map;
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

  function buildAnexosSection(anexos) {
    var list = Array.isArray(anexos) ? anexos.map(createAnexo) : getCurrentAnexos();

    return {
      id: "anexos",
      titulo: "Anexos",
      tipo: "anexos",
      visible: true,
      data: {
        anexos: list,
        grupos: groupBySource(list)
      },
      contenido: list.length
        ? list.map(function (item, index) {
            return "Anexo " + String(index + 1) + ": " + item.title;
          })
        : ["No se registran anexos para el presente informe."]
    };
  }

  function buildAnexoHtml(item, index) {
    var anexo = createAnexo(item);
    var src = anexo.dataUrl;

    if (isImage(anexo) && src) {
      return [
        '<figure class="anexo-image-block">',
        '<img src="', esc(src), '" alt="', esc(anexo.title), '">',
        '<figcaption>Anexo ', String(index + 1), '. ', esc(anexo.title), '</figcaption>',
        '</figure>'
      ].join("");
    }

    return [
      '<div class="anexo-file-block">',
      '<strong>Anexo ', String(index + 1), '.</strong> ',
      esc(anexo.title),
      anexo.description ? '<br><span>' + esc(anexo.description) + '</span>' : "",
      '</div>'
    ].join("");
  }

  function buildAnexosHtml(anexos) {
    var list = Array.isArray(anexos) ? anexos.map(createAnexo) : getCurrentAnexos();

    if (!list.length) {
      return [
        '<section class="document-section anexos-section">',
        '<h1>Anexos</h1>',
        '<p>No se registran anexos para el presente informe.</p>',
        '</section>'
      ].join("");
    }

    var groups = groupBySource(list);
    var html = ['<section class="document-section anexos-section">', '<h1>Anexos</h1>'];

    Object.keys(groups).forEach(function (source) {
      html.push('<h2>' + esc(sourceTitle(source)) + '</h2>');
      html.push(groups[source].map(buildAnexoHtml).join(""));
    });

    html.push("</section>");

    return html.join("");
  }

  function appendAnexos(documentData, anexos) {
    var doc = documentData || {};
    var sections = Array.isArray(doc.secciones) ? doc.secciones.slice() : [];

    sections = sections.filter(function (section) {
      return section && section.id !== "anexos";
    });

    sections.push(buildAnexosSection(anexos));

    return Object.assign({}, doc, {
      secciones: sections
    });
  }

  window.TITULACION_ANEXOS = {
    createAnexo: createAnexo,
    getCurrentAnexos: getCurrentAnexos,
    groupBySource: groupBySource,
    sourceTitle: sourceTitle,
    buildAnexosSection: buildAnexosSection,
    buildAnexoHtml: buildAnexoHtml,
    buildAnexosHtml: buildAnexosHtml,
    appendAnexos: appendAnexos
  };
})(window);