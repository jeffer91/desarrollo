/* =========================================================
Nombre completo: lb.diagram-builder.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.diagram-builder.js
Función o funciones:
1. Crear diagramas propios a partir de contenidos que requieren secuencia o proceso.
2. Preparar nodos y conexiones para que luego el Word pueda dibujarlos o convertirlos en imagen.
3. Evitar diagramas cuando no aporten al aprendizaje.
========================================================= */

(function attachLbDiagramBuilder(window) {
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

  function buildDiagram(unit, content, index, reason) {
    return {
      id: unit.id + "-diagrama-" + (index + 1),
      type: "diagram",
      title: "Diagrama " + (index + 1) + ". Secuencia de " + text(content.title),
      description: "Diagrama propio para explicar etapas, pasos o relaciones del contenido.",
      nodes: [
        { id: "inicio", label: "Inicio" },
        { id: "desarrollo", label: text(content.title) || "Contenido" },
        { id: "aplicacion", label: "Aplicación" },
        { id: "resultado", label: "Resultado de aprendizaje" }
      ],
      edges: [
        { from: "inicio", to: "desarrollo" },
        { from: "desarrollo", to: "aplicacion" },
        { from: "aplicacion", to: "resultado" }
      ],
      reason: reason || "Ayuda a comprender una secuencia.",
      relatedContentId: content.id,
      insertOnlyIfUseful: true
    };
  }

  function planUnit(unit) {
    refresh();

    var diagrams = [];
    var items = asArray(unit && unit.contentBlock && unit.contentBlock.items);

    items.forEach(function eachContent(content, index) {
      var decisions = VisualRules && typeof VisualRules.decide === "function" ? VisualRules.decide(content.title, index) : [];
      var diagramDecision = decisions.find(function findDecision(decision) {
        return decision.type === "diagram";
      });

      if (diagramDecision) {
        diagrams.push(buildDiagram(unit, content, diagrams.length, diagramDecision.reason));
      }
    });

    return {
      id: unit.id + "-diagrams",
      title: "Diagramas planificados",
      diagrams: diagrams
    };
  }

  function planAll(unitsBlock) {
    var units = asArray(unitsBlock && unitsBlock.units);

    return {
      id: "diagrams-plan",
      title: "Plan de diagramas",
      units: units.map(planUnit),
      createdAt: new Date().toISOString()
    };
  }

  window.LibroGenLibroDiagramBuilder = {
    planUnit: planUnit,
    planAll: planAll
  };
})(window);
