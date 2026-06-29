/* =========================================================
Nombre completo: lb.figure-planner.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.figure-planner.js
Función o funciones:
1. Planificar figuras útiles para el libro de asignatura.
2. Crear esquemas propios basados en los contenidos de cada unidad.
3. Evitar imágenes decorativas o sin aporte didáctico.
========================================================= */

(function attachLbFigurePlanner(window) {
  "use strict";

  var VisualRules = window.LibroGenLibroVisualRules || null;

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function refresh() {
    VisualRules = window.LibroGenLibroVisualRules || VisualRules;
  }

  function buildFigure(unit, content, index) {
    return {
      id: unit.id + "-figura-" + (index + 1),
      type: "figure",
      title: "Figura " + (index + 1) + ". Esquema de " + text(content.title),
      description: "Figura propia de apoyo didáctico para explicar visualmente " + text(content.title) + ".",
      source: "generada_por_la_app",
      relatedContentId: content.id,
      insertOnlyIfUseful: true
    };
  }

  function planUnit(unit) {
    refresh();

    var figures = [];
    var items = asArray(unit && unit.contentBlock && unit.contentBlock.items);

    items.forEach(function eachContent(content, index) {
      var decisions = VisualRules && typeof VisualRules.decide === "function" ? VisualRules.decide(content.title, index) : [];
      var useFigure = decisions.some(function someDecision(decision) {
        return decision.type === "figure";
      });

      if (useFigure) {
        figures.push(buildFigure(unit, content, figures.length));
      }
    });

    return {
      id: unit.id + "-figures",
      title: "Figuras planificadas",
      figures: figures
    };
  }

  function planAll(unitsBlock) {
    var units = asArray(unitsBlock && unitsBlock.units);

    return {
      id: "figures-plan",
      title: "Plan de figuras",
      units: units.map(planUnit),
      createdAt: new Date().toISOString()
    };
  }

  window.LibroGenLibroFigurePlanner = {
    planUnit: planUnit,
    planAll: planAll
  };
})(window);
