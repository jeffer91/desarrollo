/* =========================================================
Nombre completo: lb.final-review.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.final-review.js
Función o funciones:
1. Ejecutar una revisión final de módulos obligatorios de Gen libro.
2. Verificar que existan las funciones principales del flujo completo.
3. Detectar dependencias externas pendientes de Electron sin bloquear la pantalla.
4. Exponer un resumen de revisión para soporte y pruebas.
========================================================= */

(function attachLbFinalReview(window) {
  "use strict";

  var REQUIRED_MODULES = [
    { name: "LibroGenLibroConstants", methods: ["MODULE", "STORAGE", "PROGRESS_STEPS"] },
    { name: "LibroGenLibroState", methods: ["getState", "setLibroGenerado", "setUltimoWord"] },
    { name: "LibroGenLibroProgress", methods: ["render", "reset", "complete"] },
    { name: "LibroGenLibroUI", methods: ["setMessage", "setStatus", "setGenerateEnabled"] },
    { name: "LibroGenLibroStorage", methods: ["listMaterias", "saveLibroRecord"] },
    { name: "LibroGenLibroDataSource", methods: ["listCarreras", "listMateriasByCarrera", "findMateria"] },
    { name: "LibroGenLibroValidator", methods: ["validate", "message"] },
    { name: "LibroGenLibroBookPlan", methods: ["build"] },
    { name: "LibroGenLibroAiOrchestrator", methods: ["prepare", "generateTask"] },
    { name: "LibroGenLibroInitialSectionsBuilder", methods: ["buildBase", "buildWithAi"] },
    { name: "LibroGenLibroUnitBuilder", methods: ["buildAll"] },
    { name: "LibroGenLibroReferencesBuilder", methods: ["build", "formatApa"] },
    { name: "LibroGenLibroGlossaryBuilder", methods: ["build"] },
    { name: "LibroGenLibroAppendixBuilder", methods: ["build"] },
    { name: "LibroGenLibroDocxBuilder", methods: ["build"] },
    { name: "LibroGenLibroDocxExporter", methods: ["exportDocx"] },
    { name: "LibroGenLibroErrorHandler", methods: ["handle", "safeAsync"] },
    { name: "LibroGenLibroDiagnosticsBuilder", methods: ["build", "buildUserSummary"] }
  ];

  function existsModule(name) {
    return Boolean(window[name]);
  }

  function hasMethod(moduleName, methodName) {
    var module = window[moduleName];
    return Boolean(module && module[methodName] !== undefined);
  }

  function checkModules() {
    return REQUIRED_MODULES.map(function mapModule(item) {
      var missingMethods = item.methods.filter(function filterMethod(method) {
        return !hasMethod(item.name, method);
      });

      return {
        name: item.name,
        exists: existsModule(item.name),
        missingMethods: missingMethods,
        ok: existsModule(item.name) && missingMethods.length === 0
      };
    });
  }

  function checkElectronDependencies() {
    return {
      aiOnline: Boolean(window.api && window.api.ai && typeof window.api.ai.generate === "function"),
      referencesSearch: Boolean(window.api && window.api.references && typeof window.api.references.search === "function"),
      nativeDocx: Boolean(window.api && window.api.word && typeof window.api.word.exportDocx === "function"),
      note: "Si estas API no existen, Gen libro usa respaldos parciales; para producción completa deben conectarse desde Electron."
    };
  }

  function run() {
    var modules = checkModules();
    var missing = modules.filter(function filterMissing(item) {
      return !item.ok;
    });
    var electron = checkElectronDependencies();

    return {
      id: "gen-libro-final-review",
      ok: missing.length === 0,
      modules: modules,
      missing: missing,
      electron: electron,
      summary: missing.length === 0
        ? "Estructura modular completa. Pendiente solo verificar API externas de Electron en ejecución real."
        : "Hay módulos o funciones pendientes de revisar.",
      reviewedAt: new Date().toISOString()
    };
  }

  function runAndStore() {
    var result = run();

    try {
      window.localStorage.setItem("libro.genLibro.finalReview", JSON.stringify(result));
    } catch (_error) {}

    return result;
  }

  window.LibroGenLibroFinalReview = {
    run: run,
    runAndStore: runAndStore,
    checkModules: checkModules,
    checkElectronDependencies: checkElectronDependencies
  };
})(window);
