/* =========================================================
Nombre completo: lb.constants.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.constants.js
Función o funciones:
1. Definir constantes generales de la pantalla Gen libro.
2. Centralizar nombres de módulos, rutas, estados y etapas de progreso.
3. Evitar textos y valores repetidos en los demás archivos lb.
========================================================= */

(function attachLbConstants(window) {
  "use strict";

  var MODULE = {
    id: "gen-libro",
    title: "Gen libro",
    folder: "Gen libro",
    filePrefix: "lb",
    storageModule: "libro",
    outputType: "docx"
  };

  var ROUTES = {
    cargaMateria: "../carga-materia/carga-materia.index.html",
    panelPrincipal: "../../index.html"
  };

  var STORAGE = {
    materiasKey: "libro.cargaMateria.materias",
    librosKey: "libro.genLibro.libros",
    diagnosticosKey: "libro.genLibro.diagnosticos"
  };

  var STATUS = {
    idle: "idle",
    loading: "loading",
    ready: "ready",
    generating: "generating",
    done: "done",
    warning: "warning",
    error: "error"
  };

  var PROGRESS_STEPS = [
    { id: "load", label: "Cargando materia", percent: 5 },
    { id: "validate", label: "Validando estructura", percent: 10 },
    { id: "plan", label: "Planificando libro", percent: 15 },
    { id: "presentation", label: "Generando presentación", percent: 22 },
    { id: "diagnostic", label: "Generando evaluación diagnóstica", percent: 30 },
    { id: "units", label: "Desarrollando unidades", percent: 52 },
    { id: "references", label: "Buscando referencias APA 7", percent: 68 },
    { id: "visuals", label: "Preparando tablas y figuras", percent: 78 },
    { id: "docx", label: "Armando Word", percent: 90 },
    { id: "save", label: "Guardando copia local", percent: 96 },
    { id: "download", label: "Finalizando descarga", percent: 100 }
  ];

  var BOOK_SECTIONS = [
    "Tabla de contenidos",
    "Nombre de la asignatura",
    "Presentación de la asignatura",
    "Pre requisitos de la asignatura",
    "Evaluación inicial diagnóstica",
    "Orientaciones Generales para el Estudiante",
    "Unidad I",
    "Unidad II",
    "Unidad III",
    "Unidad IV",
    "Referencias Bibliográficas",
    "Glosario",
    "Anexos"
  ];

  var WORD_STYLE = {
    fontFamily: "Candara",
    fontSize: 14,
    titleBold: true,
    citationStyle: "APA 7",
    tocMode: "word-references-compatible"
  };

  window.LibroGenLibroConstants = {
    MODULE: MODULE,
    ROUTES: ROUTES,
    STORAGE: STORAGE,
    STATUS: STATUS,
    PROGRESS_STEPS: PROGRESS_STEPS,
    BOOK_SECTIONS: BOOK_SECTIONS,
    WORD_STYLE: WORD_STYLE
  };
})(window);
