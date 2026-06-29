/* =========================================================
Nombre completo: lb.ai-local.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.ai-local.js
Función o funciones:
1. Dar una respuesta local de respaldo cuando la IA online no esté disponible.
2. Mantener estructura, orden y continuidad del libro.
3. No inventar referencias bibliográficas.
========================================================= */

(function attachLbAiLocal(window) {
  "use strict";

  function makeLocalText(prompt) {
    return [
      "Borrador local estructural generado para continuar el flujo.",
      "Este contenido debe ser ampliado por la IA online antes de construir el Word final.",
      "No se incluyen referencias inventadas.",
      "Resumen del pedido:",
      String(prompt || "").slice(0, 1200)
    ].join("\n\n");
  }

  async function generate(prompt, options) {
    return {
      ok: true,
      provider: "local",
      text: makeLocalText(prompt),
      options: options || {},
      warning: "Respuesta local de respaldo. Requiere mejora online para libro final.",
      generatedAt: new Date().toISOString()
    };
  }

  window.LibroGenLibroAiLocal = {
    generate: generate,
    available: function available() { return true; }
  };
})(window);
