/* =========================================================
Nombre completo: lb.evaluation-builder.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.evaluation-builder.js
Función o funciones:
1. Crear evaluación de unidad en formato Aiken.
2. Usar los contenidos de cada unidad como temas base.
3. Mantener preguntas y respuestas en español.
========================================================= */

(function attachLbEvaluationBuilder(window) {
  "use strict";

  var AikenBuilder = window.LibroGenLibroAikenBuilder || null;

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function topicsFromContent(contentBlock) {
    return asArray(contentBlock && contentBlock.items).map(function mapItem(item) {
      return text(item.title);
    }).filter(Boolean);
  }

  function build(unit, contentBlock) {
    AikenBuilder = window.LibroGenLibroAikenBuilder || AikenBuilder;

    var topics = topicsFromContent(contentBlock);
    var questions = AikenBuilder && typeof AikenBuilder.fromTopics === "function"
      ? AikenBuilder.fromTopics(topics, 5)
      : [];

    return {
      id: (unit && unit.id ? unit.id : "unidad") + "-evaluation",
      title: "Evaluación de Unidad",
      type: "aiken",
      questions: questions,
      aikenText: AikenBuilder && typeof AikenBuilder.toAikenText === "function" ? AikenBuilder.toAikenText(questions) : ""
    };
  }

  window.LibroGenLibroEvaluationBuilder = {
    build: build
  };
})(window);
