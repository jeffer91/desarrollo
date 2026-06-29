/* =========================================================
Nombre completo: lb.visual-rules.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.visual-rules.js
Función o funciones:
1. Definir cuándo una figura, tabla o diagrama aporta al aprendizaje.
2. Evitar recursos visuales decorativos o innecesarios.
3. Centralizar reglas visuales para el libro de asignatura.
========================================================= */

(function attachLbVisualRules(window) {
  "use strict";

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function lower(value) {
    return text(value).toLowerCase();
  }

  function hasAny(value, words) {
    var source = lower(value);
    return words.some(function someWord(word) {
      return source.indexOf(word) >= 0;
    });
  }

  function shouldUseFigure(title) {
    return hasAny(title, [
      "proceso",
      "ciclo",
      "sistema",
      "estructura",
      "funcionamiento",
      "flujo",
      "relación",
      "relaciones",
      "modelo"
    ]);
  }

  function shouldUseTable(title) {
    return hasAny(title, [
      "tipos",
      "clasificación",
      "clasificacion",
      "comparación",
      "comparacion",
      "diferencias",
      "características",
      "caracteristicas",
      "componentes",
      "criterios"
    ]);
  }

  function shouldUseDiagram(title) {
    return hasAny(title, [
      "secuencia",
      "procedimiento",
      "etapas",
      "pasos",
      "ruta",
      "método",
      "metodo",
      "algoritmo"
    ]);
  }

  function decide(title, index) {
    var decisions = [];

    if (shouldUseTable(title)) {
      decisions.push({ type: "table", reason: "Ayuda a comparar, clasificar u organizar información." });
    }

    if (shouldUseFigure(title)) {
      decisions.push({ type: "figure", reason: "Ayuda a visualizar estructuras, sistemas o relaciones." });
    }

    if (shouldUseDiagram(title)) {
      decisions.push({ type: "diagram", reason: "Ayuda a comprender pasos, etapas o secuencias." });
    }

    if (!decisions.length && index === 0) {
      decisions.push({ type: "table", reason: "Cuadro inicial de conceptos clave para orientar la unidad." });
    }

    return decisions;
  }

  window.LibroGenLibroVisualRules = {
    decide: decide,
    shouldUseFigure: shouldUseFigure,
    shouldUseTable: shouldUseTable,
    shouldUseDiagram: shouldUseDiagram
  };
})(window);
