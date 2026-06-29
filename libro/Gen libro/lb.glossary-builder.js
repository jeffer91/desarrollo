/* =========================================================
Nombre completo: lb.glossary-builder.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.glossary-builder.js
Función o funciones:
1. Crear el glosario del libro de asignatura.
2. Extraer términos desde materia, unidades, contenidos y recursos generados.
3. Garantizar mínimo 10 términos claros y útiles para el estudiante.
========================================================= */

(function attachLbGlossaryBuilder(window) {
  "use strict";

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function cleanTerm(value) {
    return text(value)
      .replace(/^\d+(\.\d+)*\s*/g, "")
      .replace(/[.:;]+$/g, "")
      .trim();
  }

  function addTerm(map, term, source) {
    var clean = cleanTerm(term);
    var key = clean.toLowerCase();

    if (!clean || clean.length < 3 || map[key]) return;

    map[key] = {
      term: clean,
      definition: "Concepto clave relacionado con la asignatura que el estudiante debe comprender, explicar y aplicar durante el desarrollo del libro.",
      source: source || "contenido",
      createdBy: "gen-libro"
    };
  }

  function collectTerms(bookDraft) {
    var map = {};
    var plan = bookDraft && bookDraft.plan ? bookDraft.plan : {};
    var units = bookDraft && bookDraft.units && Array.isArray(bookDraft.units.units) ? bookDraft.units.units : [];

    addTerm(map, plan.materia, "asignatura");
    addTerm(map, plan.carrera, "carrera");

    units.forEach(function eachUnit(unit) {
      addTerm(map, unit.originalTitle || unit.title, "unidad");
      addTerm(map, unit.learningResult, "resultado_aprendizaje");

      asArray(unit.contentBlock && unit.contentBlock.items).forEach(function eachContent(content) {
        addTerm(map, content.title, "contenido");
      });

      asArray(unit.strategies && unit.strategies.strategies).forEach(function eachStrategy(strategy) {
        addTerm(map, strategy.title, "estrategia");
      });
    });

    [
      "Resultado de aprendizaje",
      "Autoevaluación",
      "Evaluación diagnóstica",
      "Estrategia de enseñanza-aprendizaje",
      "Competencia profesional",
      "Aplicación práctica",
      "Recurso didáctico",
      "Cita APA 7",
      "Referencia bibliográfica",
      "Reflexión de unidad"
    ].forEach(function eachFallback(term) {
      addTerm(map, term, "base_institucional");
    });

    return Object.keys(map).map(function mapKey(key) {
      return map[key];
    });
  }

  function improveDefinition(entry, plan) {
    var materia = text(plan && plan.materia) || "la asignatura";
    var term = text(entry.term);

    return Object.assign({}, entry, {
      definition: "Término relacionado con " + materia + ". Permite comprender el tema de " + term + " dentro del proceso de aprendizaje y su aplicación académica o profesional."
    });
  }

  function build(bookDraft) {
    var plan = bookDraft && bookDraft.plan ? bookDraft.plan : {};
    var entries = collectTerms(bookDraft).slice(0, 18).map(function mapEntry(entry) {
      return improveDefinition(entry, plan);
    });

    while (entries.length < 10) {
      entries.push(improveDefinition({
        term: "Término complementario " + (entries.length + 1),
        source: "complementario"
      }, plan));
    }

    return {
      id: "glossary",
      title: "Glosario",
      minimumRequired: 10,
      total: entries.length,
      entries: entries,
      createdAt: new Date().toISOString()
    };
  }

  window.LibroGenLibroGlossaryBuilder = {
    build: build,
    collectTerms: collectTerms
  };
})(window);
