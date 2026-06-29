/* =========================================================
Nombre completo: lb.docx-toc.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.docx-toc.js
Función o funciones:
1. Preparar tabla de contenidos compatible con Word.
2. Usar estilos Heading para que Word pueda actualizar la tabla.
3. Crear una tabla estática de respaldo cuando no exista motor DOCX nativo.
========================================================= */

(function attachLbDocxToc(window) {
  "use strict";

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function buildEntries(bookModel) {
    var entries = [];

    entries.push({ level: 1, title: "Nombre de la asignatura" });
    entries.push({ level: 1, title: "Presentación de la asignatura" });
    entries.push({ level: 1, title: "Pre requisitos de la asignatura" });
    entries.push({ level: 1, title: "Evaluación inicial diagnóstica" });
    entries.push({ level: 1, title: "Orientaciones Generales para el Estudiante" });

    asArray(bookModel && bookModel.units && bookModel.units.units).forEach(function eachUnit(unit) {
      entries.push({ level: 1, title: text(unit.title) });
      entries.push({ level: 2, title: "Resultado de Aprendizaje" });
      entries.push({ level: 2, title: "Contenidos" });
      entries.push({ level: 2, title: "Estrategias de enseñanza-aprendizaje" });
      entries.push({ level: 2, title: "Evaluación de Unidad" });
      entries.push({ level: 2, title: "Auto evaluación" });
      entries.push({ level: 2, title: "Reflexiones sobre la Unidad" });
    });

    entries.push({ level: 1, title: "Referencias Bibliográficas" });
    entries.push({ level: 1, title: "Glosario" });

    if (bookModel && bookModel.appendix && bookModel.appendix.include) {
      entries.push({ level: 1, title: "Anexos" });
    }

    return entries;
  }

  function buildWordFieldInstruction() {
    return "TOC \\o \"1-3\" \\h \\z \\u";
  }

  function buildStaticText(bookModel) {
    return buildEntries(bookModel).map(function mapEntry(entry) {
      var indent = entry.level === 1 ? "" : "  ".repeat(entry.level - 1);
      return indent + entry.title;
    }).join("\n");
  }

  window.LibroGenLibroDocxToc = {
    buildEntries: buildEntries,
    buildWordFieldInstruction: buildWordFieldInstruction,
    buildStaticText: buildStaticText
  };
})(window);
