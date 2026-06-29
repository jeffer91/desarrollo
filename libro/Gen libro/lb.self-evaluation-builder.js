/* =========================================================
Nombre completo: lb.self-evaluation-builder.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.self-evaluation-builder.js
Función o funciones:
1. Crear autoevaluaciones por unidad.
2. Formular preguntas abiertas y de comprobación para el estudiante.
3. Relacionar cada pregunta con los contenidos trabajados.
========================================================= */

(function attachLbSelfEvaluationBuilder(window) {
  "use strict";

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function build(unit, contentBlock) {
    var items = asArray(contentBlock && contentBlock.items);
    var questions = items.slice(0, 6).map(function mapContent(content, index) {
      return {
        id: "autoevaluacion-" + (index + 1),
        question: "¿Cómo explicarías con tus propias palabras el contenido: " + text(content.title) + "?",
        answerSpaceLines: 4,
        relatedContentId: content.id
      };
    });

    questions.push({
      id: "autoevaluacion-aplicacion",
      question: "¿Qué ejemplo práctico permite aplicar lo aprendido en esta unidad?",
      answerSpaceLines: 5,
      relatedContentId: "unidad"
    });

    questions.push({
      id: "autoevaluacion-dificultad",
      question: "¿Qué tema de la unidad requiere mayor refuerzo y por qué?",
      answerSpaceLines: 5,
      relatedContentId: "unidad"
    });

    return {
      id: (unit && unit.id ? unit.id : "unidad") + "-self-evaluation",
      title: "Auto evaluación",
      questions: questions
    };
  }

  window.LibroGenLibroSelfEvaluationBuilder = {
    build: build
  };
})(window);
