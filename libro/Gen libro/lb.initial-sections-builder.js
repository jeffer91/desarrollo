/* =========================================================
Nombre completo: lb.initial-sections-builder.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.initial-sections-builder.js
Función o funciones:
1. Construir las secciones iniciales del libro de asignatura.
2. Copiar el nombre de la asignatura tal como llega de la materia consolidada.
3. Crear presentación, prerrequisitos, evaluación diagnóstica y orientaciones.
4. Dejar las secciones listas para el constructor Word.
========================================================= */

(function attachLbInitialSectionsBuilder(window) {
  "use strict";

  var DiagnosticBuilder = window.LibroGenLibroDiagnosticBuilder || null;
  var AiOrchestrator = window.LibroGenLibroAiOrchestrator || null;

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function getUnitTitles(plan) {
    return asArray(plan && plan.units).map(function mapUnit(unit) {
      return text(unit.originalTitle || unit.title);
    }).filter(Boolean);
  }

  function buildSubjectName(plan) {
    return {
      id: "subjectName",
      title: "Nombre de la asignatura",
      type: "copy",
      content: text(plan && plan.materia),
      source: "materia"
    };
  }

  function buildPresentation(plan) {
    var materia = text(plan && plan.materia) || "la asignatura";
    var carrera = text(plan && plan.carrera) || "la carrera";
    var units = getUnitTitles(plan);

    return {
      id: "presentation",
      title: "Presentación de la asignatura",
      type: "created",
      content: "La asignatura " + materia + " forma parte del proceso de formación de " + carrera + ". Su estudio permite integrar conocimientos teóricos y prácticos orientados al desarrollo de competencias profesionales. El libro se organiza en unidades que guían progresivamente el aprendizaje, la comprensión de conceptos, la aplicación de procedimientos y la reflexión sobre situaciones propias del campo académico y laboral.",
      notes: units.length ? "Unidades base: " + units.join("; ") + "." : "La presentación se ampliará con el contenido disponible."
    };
  }

  function buildPrerequisites(plan) {
    return {
      id: "prerequisites",
      title: "Pre requisitos de la asignatura",
      type: "created",
      content: "Para abordar esta asignatura, el estudiante debe disponer de conocimientos básicos relacionados con la carrera, comprensión lectora académica, capacidad para interpretar instrucciones, disposición para el trabajo autónomo y colaborativo, y manejo responsable de los recursos de aprendizaje. Estos prerrequisitos permitirán aprovechar de mejor manera los contenidos, actividades y evaluaciones propuestas.",
      notes: "Los prerrequisitos podrán ajustarse automáticamente con información específica de la materia cuando esté disponible."
    };
  }

  function buildOrientation(plan) {
    return {
      id: "orientation",
      title: "Orientaciones Generales para el Estudiante",
      type: "created",
      content: "El estudiante debe revisar cada unidad de forma ordenada, identificar los resultados de aprendizaje, estudiar los contenidos propuestos, desarrollar las actividades de autoevaluación y registrar sus reflexiones. Se recomienda complementar la lectura con práctica, consulta de fuentes académicas, participación activa en clase y revisión constante de los conceptos clave. El propósito del libro es facilitar una comprensión progresiva, aplicada y reflexiva de la asignatura.",
      notes: "Las orientaciones se fortalecerán con estrategias didácticas por unidad."
    };
  }

  function buildBase(plan) {
    DiagnosticBuilder = window.LibroGenLibroDiagnosticBuilder || DiagnosticBuilder;

    return {
      id: "initialSections",
      title: "Secciones iniciales",
      sections: [
        buildSubjectName(plan),
        buildPresentation(plan),
        buildPrerequisites(plan),
        DiagnosticBuilder && typeof DiagnosticBuilder.build === "function" ? DiagnosticBuilder.build(plan) : null,
        buildOrientation(plan)
      ].filter(Boolean),
      createdAt: new Date().toISOString()
    };
  }

  async function buildWithAi(plan) {
    AiOrchestrator = window.LibroGenLibroAiOrchestrator || AiOrchestrator;

    var base = buildBase(plan);

    if (!AiOrchestrator || typeof AiOrchestrator.generateTask !== "function") {
      return base;
    }

    var tasks = [
      { id: "presentation", type: "initial", sectionId: "presentation" },
      { id: "prerequisites", type: "initial", sectionId: "prerequisites" },
      { id: "diagnostic", type: "initial", sectionId: "diagnostic" },
      { id: "orientation", type: "initial", sectionId: "orientation" }
    ];

    var aiResults = [];

    for (var i = 0; i < tasks.length; i += 1) {
      aiResults.push(await AiOrchestrator.generateTask(plan, tasks[i]));
    }

    base.aiResults = aiResults;
    base.generatedWithAiAt = new Date().toISOString();

    return base;
  }

  window.LibroGenLibroInitialSectionsBuilder = {
    buildBase: buildBase,
    buildWithAi: buildWithAi
  };
})(window);
