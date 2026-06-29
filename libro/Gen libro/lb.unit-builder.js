/* =========================================================
Nombre completo: lb.unit-builder.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.unit-builder.js
Función o funciones:
1. Construir las cuatro unidades del libro de asignatura.
2. Copiar título y resultado de aprendizaje tal como llegan del plan.
3. Desarrollar contenidos, estrategias, evaluación, autoevaluación y reflexiones.
4. Integrar resultados del motor IA cuando esté disponible.
========================================================= */

(function attachLbUnitBuilder(window) {
  "use strict";

  var ContentBuilder = window.LibroGenLibroContentBuilder || null;
  var StrategyBuilder = window.LibroGenLibroStrategyBuilder || null;
  var EvaluationBuilder = window.LibroGenLibroEvaluationBuilder || null;
  var SelfEvaluationBuilder = window.LibroGenLibroSelfEvaluationBuilder || null;
  var ReflectionBuilder = window.LibroGenLibroReflectionBuilder || null;
  var AiOrchestrator = window.LibroGenLibroAiOrchestrator || null;

  function refresh() {
    ContentBuilder = window.LibroGenLibroContentBuilder || ContentBuilder;
    StrategyBuilder = window.LibroGenLibroStrategyBuilder || StrategyBuilder;
    EvaluationBuilder = window.LibroGenLibroEvaluationBuilder || EvaluationBuilder;
    SelfEvaluationBuilder = window.LibroGenLibroSelfEvaluationBuilder || SelfEvaluationBuilder;
    ReflectionBuilder = window.LibroGenLibroReflectionBuilder || ReflectionBuilder;
    AiOrchestrator = window.LibroGenLibroAiOrchestrator || AiOrchestrator;
  }

  async function buildUnit(plan, unit) {
    refresh();

    var contentBlock = ContentBuilder && typeof ContentBuilder.build === "function" ? ContentBuilder.build(unit) : null;
    var strategies = StrategyBuilder && typeof StrategyBuilder.build === "function" ? StrategyBuilder.build(unit, contentBlock) : null;
    var evaluation = EvaluationBuilder && typeof EvaluationBuilder.build === "function" ? EvaluationBuilder.build(unit, contentBlock) : null;
    var selfEvaluation = SelfEvaluationBuilder && typeof SelfEvaluationBuilder.build === "function" ? SelfEvaluationBuilder.build(unit, contentBlock) : null;
    var reflections = ReflectionBuilder && typeof ReflectionBuilder.build === "function" ? ReflectionBuilder.build(unit) : null;
    var aiResult = null;

    if (AiOrchestrator && typeof AiOrchestrator.generateTask === "function") {
      aiResult = await AiOrchestrator.generateTask(plan, {
        id: unit.id,
        type: "unit",
        unit: unit
      });
    }

    return {
      id: unit.id,
      roman: unit.roman,
      title: unit.title,
      originalTitle: unit.originalTitle,
      learningResult: unit.learningResult,
      copied: {
        title: unit.title,
        learningResult: unit.learningResult
      },
      contentBlock: contentBlock,
      strategies: strategies,
      evaluation: evaluation,
      selfEvaluation: selfEvaluation,
      reflections: reflections,
      aiResult: aiResult,
      createdAt: new Date().toISOString()
    };
  }

  async function buildAll(plan) {
    refresh();

    var units = [];
    var source = Array.isArray(plan && plan.units) ? plan.units : [];

    for (var i = 0; i < source.length; i += 1) {
      units.push(await buildUnit(plan, source[i]));
    }

    return {
      id: "units",
      title: "Unidades del libro",
      units: units,
      createdAt: new Date().toISOString()
    };
  }

  window.LibroGenLibroUnitBuilder = {
    buildUnit: buildUnit,
    buildAll: buildAll
  };
})(window);
