/* =========================================================
Nombre completo: lb.section-map.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.section-map.js
Función o funciones:
1. Definir el mapa oficial del libro de asignatura.
2. Ordenar las secciones que se generarán en Word.
3. Separar secciones copiadas, creadas y desarrolladas.
========================================================= */

(function attachLbSectionMap(window) {
  "use strict";

  var SECTIONS = [
    { id: "toc", number: "", title: "Tabla de contenidos", type: "toc", source: "word" },
    { id: "subjectName", number: "1", title: "Nombre de la asignatura", type: "copy", source: "materia" },
    { id: "presentation", number: "2", title: "Presentación de la asignatura", type: "create", source: "ai" },
    { id: "prerequisites", number: "3", title: "Pre requisitos de la asignatura", type: "create", source: "ai" },
    { id: "diagnostic", number: "4", title: "Evaluación inicial diagnóstica", type: "aiken", source: "ai" },
    { id: "orientation", number: "5", title: "Orientaciones Generales para el Estudiante", type: "create", source: "ai" },
    { id: "units", number: "", title: "Unidades de aprendizaje", type: "units", source: "materia_ai" },
    { id: "references", number: "6", title: "Referencias Bibliográficas", type: "references", source: "verified" },
    { id: "glossary", number: "7", title: "Glosario", type: "glossary", source: "ai" },
    { id: "appendix", number: "8", title: "Anexos", type: "appendix", source: "conditional" }
  ];

  var UNIT_SUBSECTIONS = [
    { id: "title", title: "Título de la unidad", type: "copy" },
    { id: "learningResult", title: "Resultado de Aprendizaje", type: "copy" },
    { id: "contents", title: "Contenidos", type: "develop" },
    { id: "strategies", title: "Estrategias de enseñanza-aprendizaje", type: "create" },
    { id: "unitEvaluation", title: "Evaluación de Unidad", type: "aiken" },
    { id: "selfEvaluation", title: "Auto evaluación", type: "questions" },
    { id: "reflections", title: "Reflexiones sobre la Unidad", type: "blank_lines" }
  ];

  var ROMAN = ["I", "II", "III", "IV"];

  function getSections() {
    return SECTIONS.map(function clone(item) {
      return Object.assign({}, item);
    });
  }

  function getUnitSubsections() {
    return UNIT_SUBSECTIONS.map(function clone(item) {
      return Object.assign({}, item);
    });
  }

  function getRoman(index) {
    return ROMAN[index] || String(index + 1);
  }

  window.LibroGenLibroSectionMap = {
    getSections: getSections,
    getUnitSubsections: getUnitSubsections,
    getRoman: getRoman
  };
})(window);
