/* =========================================================
Nombre completo: lb.appendix-builder.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.appendix-builder.js
Función o funciones:
1. Crear anexos solo cuando aporten al libro de asignatura.
2. Reunir recursos visuales, evaluaciones o materiales complementarios útiles.
3. Evitar anexos vacíos, decorativos o innecesarios.
========================================================= */

(function attachLbAppendixBuilder(window) {
  "use strict";

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function countVisualItems(visualResources) {
    var total = 0;

    asArray(visualResources && visualResources.figures && visualResources.figures.units).forEach(function eachUnit(unit) {
      total += asArray(unit.figures).length;
    });

    asArray(visualResources && visualResources.tables && visualResources.tables.units).forEach(function eachUnit(unit) {
      total += asArray(unit.tables).length;
    });

    asArray(visualResources && visualResources.diagrams && visualResources.diagrams.units).forEach(function eachUnit(unit) {
      total += asArray(unit.diagrams).length;
    });

    return total;
  }

  function collectAikenEvaluations(bookDraft) {
    var evaluations = [];
    var initialSections = bookDraft && bookDraft.initialSections ? bookDraft.initialSections : null;
    var units = bookDraft && bookDraft.units && Array.isArray(bookDraft.units.units) ? bookDraft.units.units : [];

    asArray(initialSections && initialSections.sections).forEach(function eachSection(section) {
      if (section && section.type === "aiken") evaluations.push(section);
    });

    units.forEach(function eachUnit(unit) {
      if (unit && unit.evaluation && unit.evaluation.type === "aiken") {
        evaluations.push(unit.evaluation);
      }
    });

    return evaluations;
  }

  function build(bookDraft) {
    var visualCount = countVisualItems(bookDraft && bookDraft.visualResources);
    var evaluations = collectAikenEvaluations(bookDraft);
    var appendixes = [];

    if (visualCount > 8) {
      appendixes.push({
        id: "anexo-recursos-visuales",
        title: "Anexo A. Recursos visuales complementarios",
        reason: "Existen varios recursos visuales útiles que pueden organizarse como apoyo complementario.",
        type: "visual_resources",
        totalItems: visualCount
      });
    }

    if (evaluations.length > 4) {
      appendixes.push({
        id: "anexo-banco-preguntas",
        title: "Anexo B. Banco de preguntas en formato Aiken",
        reason: "El libro contiene varias evaluaciones que pueden organizarse como banco de preguntas complementario.",
        type: "aiken_bank",
        totalItems: evaluations.length
      });
    }

    return {
      id: "appendix",
      title: "Anexos",
      include: appendixes.length > 0,
      appendixes: appendixes,
      rules: {
        onlyIfNeeded: true,
        noEmptyAppendix: true,
        noDecorativeAppendix: true
      },
      createdAt: new Date().toISOString()
    };
  }

  window.LibroGenLibroAppendixBuilder = {
    build: build,
    collectAikenEvaluations: collectAikenEvaluations,
    countVisualItems: countVisualItems
  };
})(window);
