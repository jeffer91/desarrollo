/* =========================================================
Nombre completo: lb.book-plan.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.book-plan.js
Función o funciones:
1. Crear el plan maestro del libro antes de generar contenido.
2. Convertir la materia consolidada en una estructura oficial de libro.
3. Preparar cuatro unidades con sus subsecciones obligatorias.
4. Indicar qué se copia, qué se crea y qué se desarrolla con IA.
========================================================= */

(function attachLbBookPlan(window) {
  "use strict";

  var SectionMap = window.LibroGenLibroSectionMap || null;

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function getMateria(item) {
    if (!item) return null;
    if (item.materiaConsolidada) return item.materiaConsolidada;
    if (item.payload && item.payload.materiaConsolidada) return item.payload.materiaConsolidada;
    return item;
  }

  function getUnitTitle(unit, index) {
    return text(unit && (unit.titulo || unit.nombre || unit.unidad || unit.tema)) || "Unidad " + (index + 1);
  }

  function getLearningResult(unit, materia, index) {
    var direct = text(unit && (unit.resultadoAprendizaje || unit.resultado || unit.aprendizaje));
    var results = asArray(materia && (materia.resultadosAprendizaje || materia.resultados || materia.aprendizajes));

    return direct || text(results[index]) || "Resultado de aprendizaje pendiente de desarrollar.";
  }

  function normalizeContents(unit) {
    return asArray(unit && unit.contenidos).map(function mapContent(content, index) {
      if (typeof content === "string") {
        return {
          id: "contenido-" + (index + 1),
          codigo: "",
          titulo: text(content),
          fuente: "materia"
        };
      }

      return {
        id: text(content && (content.id || content.codigo)) || "contenido-" + (index + 1),
        codigo: text(content && content.codigo),
        titulo: text(content && (content.titulo || content.nombre || content.contenido || content.tema)) || "Contenido " + (index + 1),
        descripcion: text(content && (content.descripcion || content.detalle || content.texto)),
        fuente: "materia"
      };
    });
  }

  function normalizeActivities(unit) {
    return asArray(unit && unit.actividades).map(function mapActivity(activity, index) {
      if (typeof activity === "string") {
        return {
          id: "actividad-" + (index + 1),
          titulo: text(activity),
          fuente: "materia"
        };
      }

      return {
        id: text(activity && (activity.id || activity.codigo)) || "actividad-" + (index + 1),
        titulo: text(activity && (activity.titulo || activity.nombre || activity.actividad)) || "Actividad " + (index + 1),
        descripcion: text(activity && (activity.descripcion || activity.detalle || activity.texto)),
        fuente: "materia"
      };
    });
  }

  function buildUnitPlan(unit, index, materia) {
    var roman = SectionMap && typeof SectionMap.getRoman === "function" ? SectionMap.getRoman(index) : String(index + 1);
    var subsections = SectionMap && typeof SectionMap.getUnitSubsections === "function" ? SectionMap.getUnitSubsections() : [];
    var contents = normalizeContents(unit);
    var activities = normalizeActivities(unit);

    return {
      id: "unidad-" + (index + 1),
      roman: roman,
      title: "Unidad " + roman + ": " + getUnitTitle(unit, index),
      originalTitle: getUnitTitle(unit, index),
      learningResult: getLearningResult(unit, materia, index),
      contents: contents,
      activities: activities,
      subsections: subsections,
      generationRules: {
        copyTitle: true,
        copyLearningResult: true,
        developContents: true,
        createStrategiesFromContents: true,
        createAikenEvaluation: true,
        createSelfEvaluation: true,
        createBlankReflectionLines: true,
        useApa7Citations: true,
        addFiguresOnlyIfUseful: true,
        addTablesOnlyIfUseful: true
      }
    };
  }

  function ensureFourUnits(units, materia) {
    var normalized = asArray(units).slice(0, 4);

    while (normalized.length < 4) {
      normalized.push({
        titulo: "Unidad " + (normalized.length + 1),
        resultadoAprendizaje: "Resultado de aprendizaje pendiente de desarrollar.",
        contenidos: [],
        actividades: []
      });
    }

    return normalized.map(function mapUnit(unit, index) {
      return buildUnitPlan(unit, index, materia);
    });
  }

  function build(item, validation) {
    var materia = getMateria(item) || {};
    var sections = SectionMap && typeof SectionMap.getSections === "function" ? SectionMap.getSections() : [];
    var units = ensureFourUnits(materia.unidades, materia);

    return {
      version: "1.0.0",
      tipo: "plan_libro_asignatura",
      creadoEn: new Date().toISOString(),
      carrera: text(materia.carrera) || text(item && item.carrera),
      materia: text(materia.materia) || text(item && item.materia),
      formato: {
        salida: "Word DOCX",
        fuente: "Candara",
        tamano: 14,
        tablaContenidos: "compatible con Referencias de Word",
        citas: "APA 7",
        referenciasMinimas: 15
      },
      validation: validation || null,
      sections: sections,
      units: units,
      rules: {
        generateFullBook: true,
        copySubjectName: true,
        createInitialSections: true,
        developContentsDeeply: true,
        createAikenInSpanish: true,
        createGlossary: true,
        appendixesOnlyIfNeeded: true,
        saveLocalCopy: true
      },
      source: {
        materiaSeleccionada: item || null,
        materiaConsolidada: materia
      }
    };
  }

  window.LibroGenLibroBookPlan = {
    build: build
  };
})(window);
