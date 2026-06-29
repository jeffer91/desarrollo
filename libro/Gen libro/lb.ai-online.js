/* =========================================================
Nombre completo: lb.ai-online.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.ai-online.js
Función o funciones:
1. Conectar Gen libro con una IA online cuando exista API disponible.
2. Usar primero la API segura expuesta por Electron.
3. Evitar claves hardcodeadas dentro del repositorio.
4. Devolver respuestas normalizadas al orquestador.
========================================================= */

(function attachLbAiOnline(window) {
  "use strict";

  function hasElectronAi() {
    return Boolean(
      window.api &&
      window.api.ai &&
      typeof window.api.ai.generate === "function"
    );
  }

  async function generateWithElectron(prompt, options) {
    return window.api.ai.generate({
      prompt: prompt,
      options: options || {}
    });
  }

  async function generate(prompt, options) {
    if (!prompt) {
      return { ok: false, provider: "online", error: "Prompt vacío." };
    }

    if (!hasElectronAi()) {
      return {
        ok: false,
        provider: "online",
        error: "No se detectó API online conectada en Electron."
      };
    }

    try {
      var result = await generateWithElectron(prompt, options || {});
      var text = result && (result.text || result.content || result.output || result.response);

      return {
        ok: Boolean(text),
        provider: "online",
        text: text || "",
        raw: result || null,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        ok: false,
        provider: "online",
        error: error && error.message ? error.message : String(error),
        generatedAt: new Date().toISOString()
      };
    }
  }

  window.LibroGenLibroAiOnline = {
    generate: generate,
    available: hasElectronAi
  };
})(window);
