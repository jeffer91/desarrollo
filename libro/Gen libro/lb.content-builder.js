/* =========================================================
Nombre completo: lb.content-builder.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.content-builder.js
Función o funciones:
1. Preparar el desarrollo didáctico de los contenidos por unidad.
2. Ordenar temas y subtemas antes de enviarlos al motor IA.
3. Crear un borrador estructural sin inventar referencias.
4. Marcar dónde pueden ir tablas o figuras cuando aporten.
========================================================= */

(function attachLbContentBuilder(window) {
  "use strict";

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function normalizeContent(content, index) {
    return {
      id: text(content && content.id) || "contenido-" + (index + 1),
      code: text(content && content.codigo),
      title: text(content && (content.titulo || content.title || content.nombre)) || "Contenido " + (index + 1),
      description: text(content && (content.descripcion || content.detalle || content.texto)),
      development: "Este contenido debe desarrollarse con explicación académica, ejemplos aplicados, citas APA 7 y recursos didácticos solo cuando aporten.",
      visualSuggestions: []
    };
  }

  function suggestVisual(content, index) {
    var title = text(content.title).toLowerCase();

    if (title.indexOf("proceso") >= 0 || title.indexOf("ciclo") >= 0 || title.indexOf("sistema") >= 0) {
      return { type: "figure", title: "Esquema explicativo de " + content.title, reason: "Ayuda a visualizar relaciones o etapas." };
    }

    if (title.indexOf("clasificación") >= 0 || title.indexOf("tipos") >= 0 || title.indexOf("comparación") >= 0) {
      return { type: "table", title: "Tabla comparativa de " + content.title, reason: "Facilita comparar conceptos." };
    }

    if (index === 0) {
      return { type: "table", title: "Cuadro resumen de conceptos clave", reason: "Ayuda a organizar el inicio de la unidad." };
    }

    return null;
  }

  function build(unit) {
    var contents = asArray(unit && unit.contents).map(normalizeContent);

    if (!contents.length) {
      contents.push(normalizeContent({ titulo: "Contenido base de la unidad" }, 0));
    }

    contents.forEach(function eachContent(content, index) {
      var visual = suggestVisual(content, index);
      content.visualSuggestions = visual ? [visual] : [];
    });

    return {
      id: (unit && unit.id ? unit.id : "unidad") + "-contents",
      title: "Contenidos",
      items: contents,
      rules: {
        developDeeply: true,
        useApa7Citations: true,
        avoidInventedReferences: true,
        figuresOnlyIfUseful: true,
        tablesOnlyIfUseful: true
      }
    };
  }

  window.LibroGenLibroContentBuilder = {
    build: build
  };
})(window);
