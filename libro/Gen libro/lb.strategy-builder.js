/* =========================================================
Nombre completo: lb.strategy-builder.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.strategy-builder.js
Función o funciones:
1. Crear estrategias de enseñanza-aprendizaje por unidad.
2. Relacionar las estrategias con los contenidos desarrollados.
3. Mantener actividades didácticas claras y aplicables.
========================================================= */

(function attachLbStrategyBuilder(window) {
  "use strict";

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function build(unit, contentBlock) {
    var items = asArray(contentBlock && contentBlock.items);
    var strategies = items.slice(0, 6).map(function mapContent(content, index) {
      return {
        id: "estrategia-" + (index + 1),
        title: "Estrategia para " + text(content.title),
        description: "Analizar el contenido mediante explicación guiada, lectura académica, ejemplo práctico y aplicación en una actividad breve de comprobación.",
        evidence: "Participación, resolución de ejercicio, síntesis escrita o respuesta argumentada.",
        relatedContentId: content.id
      };
    });

    if (!strategies.length) {
      strategies.push({
        id: "estrategia-1",
        title: "Estrategia de comprensión y aplicación",
        description: "Revisar los conceptos centrales de la unidad y aplicarlos en una situación académica vinculada con la asignatura.",
        evidence: "Respuesta escrita o actividad práctica breve.",
        relatedContentId: "contenido-base"
      });
    }

    return {
      id: (unit && unit.id ? unit.id : "unidad") + "-strategies",
      title: "Estrategias de enseñanza-aprendizaje",
      strategies: strategies
    };
  }

  window.LibroGenLibroStrategyBuilder = {
    build: build
  };
})(window);
