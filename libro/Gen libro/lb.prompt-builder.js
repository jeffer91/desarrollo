/* =========================================================
Nombre completo: lb.prompt-builder.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.prompt-builder.js
Función o funciones:
1. Construir prompts académicos para el libro de asignatura.
2. Mantener reglas únicas de formato, didáctica, APA 7 y estilo.
3. Preparar prompts por sección y por unidad.
========================================================= */

(function attachLbPromptBuilder(window) {
  "use strict";

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function list(items, mapper) {
    return (Array.isArray(items) ? items : []).map(mapper).filter(Boolean).join("\n");
  }

  function baseRules(plan) {
    return [
      "Escribe en español académico claro.",
      "El documento es un libro de asignatura didáctico para estudiantes.",
      "Usa explicaciones amplias, ordenadas y comprensibles.",
      "Usa formato APA 7 para citas dentro del texto.",
      "No inventes referencias; si necesitas una referencia, márcala como fuente verificable requerida.",
      "Propón figuras, tablas o esquemas solo cuando aporten al aprendizaje.",
      "No uses contenido decorativo.",
      "La fuente final del Word será Candara 14.",
      "Materia: " + text(plan && plan.materia),
      "Carrera: " + text(plan && plan.carrera)
    ].join("\n");
  }

  function buildInitialSectionPrompt(plan, sectionId) {
    var sectionName = {
      presentation: "Presentación de la asignatura",
      prerequisites: "Pre requisitos de la asignatura",
      diagnostic: "Evaluación inicial diagnóstica en formato Aiken, todo en español",
      orientation: "Orientaciones Generales para el Estudiante"
    }[sectionId] || sectionId;

    return [
      baseRules(plan),
      "Sección a generar: " + sectionName + ".",
      "Usa la información del plan del libro como base.",
      "Devuelve una estructura JSON con titulo, contenido y notasDidacticas.",
      "Plan resumido:",
      JSON.stringify({ materia: plan.materia, carrera: plan.carrera, unidades: plan.units }, null, 2)
    ].join("\n\n");
  }

  function buildUnitPrompt(plan, unit) {
    return [
      baseRules(plan),
      "Desarrolla la unidad completa del libro.",
      "Copia tal cual el título de la unidad y el resultado de aprendizaje.",
      "Desarrolla profundamente los contenidos con explicación didáctica, ejemplos, citas APA 7 y recursos visuales solo si aportan.",
      "Crea estrategias de enseñanza-aprendizaje según los contenidos desarrollados.",
      "Crea evaluación de unidad en formato Aiken en español.",
      "Crea autoevaluación con preguntas claras para el estudiante.",
      "Crea líneas de reflexión vacías para completar en Word.",
      "Unidad:",
      JSON.stringify(unit, null, 2)
    ].join("\n\n");
  }

  function buildReferencesPrompt(plan, generatedSections) {
    return [
      baseRules(plan),
      "Construye referencias bibliográficas APA 7 verificables, recientes y pertinentes.",
      "Mínimo 15 referencias de los últimos cinco años cuando sea posible.",
      "Prioriza libros, artículos científicos, documentos técnicos y fuentes institucionales confiables.",
      "Devuelve referencias en español cuando existan fuentes adecuadas; si la fuente está en otro idioma, conserva sus datos reales.",
      "No inventes autores, títulos, DOI ni enlaces.",
      "Resumen del contenido generado:",
      JSON.stringify(generatedSections || [], null, 2)
    ].join("\n\n");
  }

  function buildGlossaryPrompt(plan) {
    return [
      baseRules(plan),
      "Crea un glosario organizado con mínimo 10 términos.",
      "Cada término debe ser claro, útil y relacionado con la asignatura.",
      "Devuelve JSON con termino y definicion.",
      "Unidades:",
      list(plan.units, function mapUnit(unit) { return "- " + unit.title; })
    ].join("\n\n");
  }

  window.LibroGenLibroPromptBuilder = {
    baseRules: baseRules,
    buildInitialSectionPrompt: buildInitialSectionPrompt,
    buildUnitPrompt: buildUnitPrompt,
    buildReferencesPrompt: buildReferencesPrompt,
    buildGlossaryPrompt: buildGlossaryPrompt
  };
})(window);
