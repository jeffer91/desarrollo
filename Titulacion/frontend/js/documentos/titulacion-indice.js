/* =========================================================
Nombre completo: titulacion-indice.js
Ruta: /Titulacion/frontend/js/documentos/titulacion-indice.js
Función o funciones:
- Construir índice automático del informe.
- Tomar las secciones visibles del documento.
- Generar índice para vista HTML e impresión.
- Mantener numeración limpia y ordenada.
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

  function normalizeSections(sections) {
    return (Array.isArray(sections) ? sections : [])
      .filter(function (section) {
        if (!section) return false;
        if (section.visible === false) return false;
        if (section.tipo === "portada") return false;
        return !!asText(section.titulo);
      })
      .map(function (section, index) {
        return {
          id: asText(section.id || "seccion-" + String(index + 1)),
          titulo: asText(section.titulo),
          tipo: asText(section.tipo || "capitulo"),
          nivel: Number(section.nivel || 1),
          orden: Number(section.orden || index + 1)
        };
      });
  }

  function buildIndexItems(sections) {
    return normalizeSections(sections).map(function (section, index) {
      return Object.assign({}, section, {
        numero: index + 1,
        label: String(index + 1) + ". " + section.titulo
      });
    });
  }

  function buildIndexSection(sections) {
    var items = buildIndexItems(sections);

    return {
      id: "indice",
      titulo: "Índice",
      tipo: "indice",
      visible: true,
      data: {
        items: items
      },
      contenido: items.map(function (item) {
        return item.label;
      })
    };
  }

  function buildIndexHtml(sections) {
    var items = buildIndexItems(sections);

    if (!items.length) {
      return [
        '<section class="titulacion-index">',
        '<h1>Índice</h1>',
        '<p>No existen secciones para mostrar en el índice.</p>',
        '</section>'
      ].join("");
    }

    return [
      '<section class="titulacion-index">',
      '<h1>Índice</h1>',
      '<ol class="index-list">',
      items.map(function (item) {
        return [
          '<li>',
          '<span class="index-title">', esc(item.titulo), '</span>',
          '<span class="index-dots"></span>',
          '<span class="index-page" data-index-target="', esc(item.id), '">', esc(""), '</span>',
          '</li>'
        ].join("");
      }).join(""),
      '</ol>',
      '</section>'
    ].join("");
  }

  function insertIndex(documentData) {
    var doc = documentData || {};
    var sections = Array.isArray(doc.secciones) ? doc.secciones.slice() : [];
    var withoutIndex = sections.filter(function (section) {
      return section && section.id !== "indice";
    });

    var indexSection = buildIndexSection(withoutIndex);

    var portadaIndex = withoutIndex.findIndex(function (section) {
      return section && section.tipo === "portada";
    });

    if (portadaIndex >= 0) {
      withoutIndex.splice(portadaIndex + 1, 0, indexSection);
    } else {
      withoutIndex.unshift(indexSection);
    }

    return Object.assign({}, doc, {
      secciones: withoutIndex
    });
  }

  window.TITULACION_INDICE = {
    normalizeSections: normalizeSections,
    buildIndexItems: buildIndexItems,
    buildIndexSection: buildIndexSection,
    buildIndexHtml: buildIndexHtml,
    insertIndex: insertIndex
  };
})(window);