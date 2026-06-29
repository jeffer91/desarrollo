/* =========================================================
Nombre completo: lb.table-planner.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.table-planner.js
Función o funciones:
1. Planificar tablas útiles para el libro de asignatura.
2. Crear cuadros comparativos, resúmenes y matrices didácticas.
3. Insertar tablas solo cuando ayuden a organizar o comparar información.
========================================================= */

(function attachLbTablePlanner(window) {
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

  function buildTable(unit, content, index, reason) {
    return {
      id: unit.id + "-tabla-" + (index + 1),
      type: "table",
      title: "Tabla " + (index + 1) + ". Organización de " + text(content.title),
      description: "Tabla propia para organizar información clave sobre " + text(content.title) + ".",
      columns: ["Aspecto", "Descripción", "Aplicación"],
      sampleRows: [
        ["Concepto clave", "Descripción académica breve", "Uso dentro de la asignatura"],
        ["Ejemplo", "Caso o situación relacionada", "Interpretación del estudiante"]
      ],
      reason: reason || "Ayuda a organizar información.",
      relatedContentId: content.id,
      insertOnlyIfUseful: true
    };
  }

  function planUnit(unit) {
    refresh();

    var tables = [];
    var items = asArray(unit && unit.contentBlock && unit.contentBlock.items);

    items.forEach(function eachContent(content, index) {
      var decisions = VisualRules && typeof VisualRules.decide === "function" ? VisualRules.decide(content.title, index) : [];
      var tableDecision = decisions.find(function findDecision(decision) {
        return decision.type === "table";
      });

      if (tableDecision) {
        tables.push(buildTable(unit, content, tables.length, tableDecision.reason));
      }
    });

    return {
      id: unit.id + "-tables",
      title: "Tablas planificadas",
      tables: tables
    };
  }

  function planAll(unitsBlock) {
    var units = asArray(unitsBlock && unitsBlock.units);

    return {
      id: "tables-plan",
      title: "Plan de tablas",
      units: units.map(planUnit),
      createdAt: new Date().toISOString()
    };
  }

  window.LibroGenLibroTablePlanner = {
    planUnit: planUnit,
    planAll: planAll
  };
})(window);
