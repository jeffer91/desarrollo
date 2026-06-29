/* =========================================================
Nombre completo: lb.ai-orchestrator.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.ai-orchestrator.js
Función o funciones:
1. Orquestar el uso de IA online e IA local para Gen libro.
2. Preparar prompts por sección y unidad.
3. Usar IA online primero y respaldo local si falla.
4. Entregar resultados normalizados a los constructores posteriores.
========================================================= */

(function attachLbAiOrchestrator(window) {
  "use strict";

  var Config = window.LibroGenLibroAiConfig || null;
  var PromptBuilder = window.LibroGenLibroPromptBuilder || null;
  var Online = window.LibroGenLibroAiOnline || null;
  var Local = window.LibroGenLibroAiLocal || null;

  function refresh() {
    Config = window.LibroGenLibroAiConfig || Config;
    PromptBuilder = window.LibroGenLibroPromptBuilder || PromptBuilder;
    Online = window.LibroGenLibroAiOnline || Online;
    Local = window.LibroGenLibroAiLocal || Local;
  }

  async function callEngine(prompt, options) {
    refresh();

    var config = Config && typeof Config.getConfig === "function" ? Config.getConfig() : {};
    var onlineAvailable = Online && typeof Online.generate === "function";
    var localAvailable = Local && typeof Local.generate === "function";
    var onlineResult = null;

    if (config.online && config.online.enabled && onlineAvailable) {
      onlineResult = await Online.generate(prompt, options || {});
      if (onlineResult && onlineResult.ok) return onlineResult;
    }

    if (config.local && config.local.enabled && localAvailable) {
      var localResult = await Local.generate(prompt, options || {});
      localResult.onlineError = onlineResult && onlineResult.error ? onlineResult.error : null;
      return localResult;
    }

    return {
      ok: false,
      provider: "none",
      error: onlineResult && onlineResult.error ? onlineResult.error : "No hay motor IA disponible.",
      generatedAt: new Date().toISOString()
    };
  }

  function buildPrompt(plan, task) {
    refresh();

    if (!PromptBuilder) {
      return JSON.stringify({ plan: plan, task: task }, null, 2);
    }

    if (task.type === "initial") {
      return PromptBuilder.buildInitialSectionPrompt(plan, task.sectionId);
    }

    if (task.type === "unit") {
      return PromptBuilder.buildUnitPrompt(plan, task.unit);
    }

    if (task.type === "references") {
      return PromptBuilder.buildReferencesPrompt(plan, task.generatedSections || []);
    }

    if (task.type === "glossary") {
      return PromptBuilder.buildGlossaryPrompt(plan);
    }

    return PromptBuilder.baseRules(plan);
  }

  function buildTasks(plan) {
    var tasks = [
      { id: "presentation", type: "initial", sectionId: "presentation" },
      { id: "prerequisites", type: "initial", sectionId: "prerequisites" },
      { id: "diagnostic", type: "initial", sectionId: "diagnostic" },
      { id: "orientation", type: "initial", sectionId: "orientation" }
    ];

    (plan.units || []).forEach(function eachUnit(unit) {
      tasks.push({ id: unit.id, type: "unit", unit: unit });
    });

    tasks.push({ id: "glossary", type: "glossary" });
    tasks.push({ id: "references", type: "references" });

    return tasks;
  }

  async function prepare(plan) {
    refresh();

    var tasks = buildTasks(plan || {});

    return {
      ok: true,
      mode: "prepared",
      tasks: tasks.map(function mapTask(task) {
        return Object.assign({}, task, {
          prompt: buildPrompt(plan, task)
        });
      }),
      preparedAt: new Date().toISOString()
    };
  }

  async function generateTask(plan, task) {
    var prompt = buildPrompt(plan, task);
    var result = await callEngine(prompt, {
      taskId: task.id,
      taskType: task.type,
      materia: plan.materia,
      carrera: plan.carrera
    });

    return Object.assign({}, task, {
      prompt: prompt,
      result: result
    });
  }

  window.LibroGenLibroAiOrchestrator = {
    prepare: prepare,
    buildTasks: buildTasks,
    generateTask: generateTask,
    callEngine: callEngine
  };
})(window);
