/* =========================================================
Nombre completo: lb.aiken-builder.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.aiken-builder.js
Función o funciones:
1. Crear preguntas en formato Aiken para el libro de asignatura.
2. Mantener todo el formato de evaluación en español.
3. Servir para evaluación diagnóstica y evaluación de unidad.
========================================================= */

(function attachLbAikenBuilder(window) {
  "use strict";

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function makeQuestion(topic, index) {
    var cleanTopic = text(topic) || "contenido principal de la asignatura";

    return {
      id: "aiken-" + (index + 1),
      pregunta: "¿Cuál de las siguientes opciones describe mejor " + cleanTopic + "?",
      opciones: {
        A: "Una explicación relacionada con el concepto central y su aplicación académica.",
        B: "Una idea aislada que no se relaciona con la asignatura.",
        C: "Un dato sin utilidad para resolver problemas de aprendizaje.",
        D: "Una respuesta que no corresponde al tema propuesto."
      },
      respuesta: "A",
      formatoAiken: [
        "¿Cuál de las siguientes opciones describe mejor " + cleanTopic + "?",
        "A. Una explicación relacionada con el concepto central y su aplicación académica.",
        "B. Una idea aislada que no se relaciona con la asignatura.",
        "C. Un dato sin utilidad para resolver problemas de aprendizaje.",
        "D. Una respuesta que no corresponde al tema propuesto.",
        "ANSWER: A"
      ].join("\n")
    };
  }

  function fromTopics(topics, amount) {
    var source = asArray(topics).map(text).filter(Boolean);
    var total = Math.max(1, Number(amount || source.length || 5));
    var questions = [];

    while (source.length < total) {
      source.push("un aprendizaje clave de la asignatura");
    }

    for (var i = 0; i < total; i += 1) {
      questions.push(makeQuestion(source[i], i));
    }

    return questions;
  }

  function toAikenText(questions) {
    return asArray(questions).map(function mapQuestion(question) {
      return question.formatoAiken || "";
    }).filter(Boolean).join("\n\n");
  }

  window.LibroGenLibroAikenBuilder = {
    fromTopics: fromTopics,
    toAikenText: toAikenText
  };
})(window);
