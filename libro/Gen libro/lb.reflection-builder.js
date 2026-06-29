/* =========================================================
Nombre completo: lb.reflection-builder.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.reflection-builder.js
Función o funciones:
1. Crear el apartado Reflexiones sobre la Unidad.
2. Preparar líneas vacías para que el estudiante escriba en Word.
3. Mantener preguntas guía simples y útiles.
========================================================= */

(function attachLbReflectionBuilder(window) {
  "use strict";

  function build(unit) {
    return {
      id: (unit && unit.id ? unit.id : "unidad") + "-reflections",
      title: "Reflexiones sobre la Unidad",
      prompts: [
        "¿Qué aprendizaje principal te deja esta unidad?",
        "¿Cómo puedes aplicar este aprendizaje en tu formación profesional?",
        "¿Qué dudas o temas necesitas reforzar?"
      ],
      blankLines: 12
    };
  }

  window.LibroGenLibroReflectionBuilder = {
    build: build
  };
})(window);
