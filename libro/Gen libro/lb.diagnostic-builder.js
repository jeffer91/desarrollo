/* =========================================================
Nombre completo: lb.diagnostic-builder.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.diagnostic-builder.js
Función o funciones:
1. Crear la evaluación inicial diagnóstica del libro.
2. Usar formato Aiken en español.
3. Tomar temas desde las unidades y contenidos del plan maestro.
========================================================= */

(function attachLbDiagnosticBuilder(window) {
  "use strict";

  var AikenBuilder = window.LibroGenLibroAikenBuilder || null;

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function collectTopics(plan) {
    var topics = [];

    asArray(plan && plan.units).forEach(function eachUnit(unit) {
      if (text(unit.originalTitle)) topics.push(unit.originalTitle);
      asArray(unit.contents).forEach(function eachContent(content) {
        if (text(content.titulo)) topics.push(content.titulo);
      });
    });

    return topics;
  }

  function build(plan) {
    AikenBuilder = window.LibroGenLibroAikenBuilder || AikenBuilder;

    var topics = collectTopics(plan);
    var questions = AikenBuilder && typeof AikenBuilder.fromTopics === "function"
      ? AikenBuilder.fromTopics(topics, 10)
      : [];

    return {
      id: "diagnostic",
      title: "Evaluación inicial diagnóstica",
      type: "aiken",
      description: "Evaluación inicial para reconocer conocimientos previos antes del desarrollo de la asignatura.",
      questions: questions,
      aikenText: AikenBuilder && typeof AikenBuilder.toAikenText === "function" ? AikenBuilder.toAikenText(questions) : "",
      createdAt: new Date().toISOString()
    };
  }

  window.LibroGenLibroDiagnosticBuilder = {
    build: build,
    collectTopics: collectTopics
  };
})(window);
