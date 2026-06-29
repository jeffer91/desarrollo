/* =========================================================
Nombre completo: lb.diagnostics-builder.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.diagnostics-builder.js
Función o funciones:
1. Crear un diagnóstico resumido de Gen libro.
2. Revisar estado, progreso, último error, referencias y Word generado.
3. Entregar datos útiles para soporte sin mostrar JSON técnico al usuario normal.
========================================================= */

(function attachLbDiagnosticsBuilder(window) {
  "use strict";

  function getState() {
    return window.LibroGenLibroState && typeof window.LibroGenLibroState.getState === "function"
      ? window.LibroGenLibroState.getState()
      : {};
  }

  function getProgressHistory() {
    return window.LibroGenLibroProgressMonitor && typeof window.LibroGenLibroProgressMonitor.getHistory === "function"
      ? window.LibroGenLibroProgressMonitor.getHistory()
      : [];
  }

  function readLastError() {
    try {
      var raw = window.localStorage.getItem("libro.genLibro.lastError");
      return raw ? JSON.parse(raw) : null;
    } catch (_error) {
      return null;
    }
  }

  function build() {
    var state = getState();
    var progressHistory = getProgressHistory();
    var lastProgress = progressHistory.length ? progressHistory[progressHistory.length - 1] : null;
    var generated = state.libroGenerado || {};
    var references = generated.references || null;
    var word = state.ultimoWord || null;
    var lastError = state.error || readLastError();

    return {
      id: "gen-libro-diagnostics",
      status: state.status || "sin_estado",
      selectedCareer: state.carrera || "",
      selectedSubject: state.materia || "",
      progress: state.progreso || null,
      lastProgress: lastProgress,
      progressHistory: progressHistory,
      hasSelectedSubject: Boolean(state.materiaSeleccionada),
      hasPlan: Boolean(state.planLibro),
      hasGeneratedBook: Boolean(state.libroGenerado),
      references: references ? {
        ok: references.ok,
        totalFound: references.totalFound,
        totalUsable: references.totalUsable,
        minimumRequired: references.minimumRequired,
        message: references.message
      } : null,
      word: word ? {
        fileName: word.fileName,
        status: word.exportResult && word.exportResult.ok ? "exportado" : "pendiente",
        mode: word.exportResult && word.exportResult.mode
      } : null,
      lastError: lastError,
      generatedAt: new Date().toISOString()
    };
  }

  function buildUserSummary() {
    var report = build();
    var parts = [];

    parts.push("Estado: " + report.status);
    parts.push("Progreso: " + (report.progress ? report.progress.label + " (" + report.progress.percent + "%)" : "sin progreso"));
    parts.push("Materia seleccionada: " + (report.hasSelectedSubject ? "sí" : "no"));
    parts.push("Plan creado: " + (report.hasPlan ? "sí" : "no"));
    parts.push("Libro generado: " + (report.hasGeneratedBook ? "sí" : "no"));

    if (report.references) {
      parts.push("Referencias utilizables: " + report.references.totalUsable + "/" + report.references.minimumRequired);
    }

    if (report.word) {
      parts.push("Word: " + report.word.status + " · " + report.word.fileName);
    }

    if (report.lastError) {
      parts.push("Último error: " + report.lastError.message);
    }

    return parts.join("\n");
  }

  window.LibroGenLibroDiagnosticsBuilder = {
    build: build,
    buildUserSummary: buildUserSummary
  };
})(window);
