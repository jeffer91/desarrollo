/* =========================================================
Nombre completo: lb.main.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.main.js
Función o funciones:
1. Inicializar la pantalla Gen libro.
2. Conectar selector de carrera y selector de materia con el almacenamiento local.
3. Cargar la materia consolidada seleccionada desde Carga de la materia.
4. Ejecutar validación flexible, crear el plan maestro y preparar el motor IA.
========================================================= */

(function iniciarGenLibro(window, document) {
  "use strict";

  var Constants = window.LibroGenLibroConstants || {};
  var State = window.LibroGenLibroState || null;
  var Progress = window.LibroGenLibroProgress || null;
  var UI = window.LibroGenLibroUI || null;
  var CarreraSelector = window.LibroGenLibroCarreraSelector || null;
  var MateriaSelector = window.LibroGenLibroMateriaSelector || null;
  var Validator = window.LibroGenLibroValidator || null;
  var BookPlan = window.LibroGenLibroBookPlan || null;
  var AiOrchestrator = window.LibroGenLibroAiOrchestrator || null;

  function refreshModules() {
    CarreraSelector = window.LibroGenLibroCarreraSelector || CarreraSelector;
    MateriaSelector = window.LibroGenLibroMateriaSelector || MateriaSelector;
    Validator = window.LibroGenLibroValidator || Validator;
    BookPlan = window.LibroGenLibroBookPlan || BookPlan;
    AiOrchestrator = window.LibroGenLibroAiOrchestrator || AiOrchestrator;
  }

  function setInitialData() {
    refreshModules();

    if (CarreraSelector && typeof CarreraSelector.loadCarreras === "function") {
      CarreraSelector.loadCarreras();
      return;
    }

    UI.fillSelect("lb-carrera-select", [], "No se pudo leer carreras guardadas", null, null);
    UI.fillSelect("lb-materia-select", [], "Selecciona una carrera", null, null);
  }

  function runFlexibleValidation(selected) {
    refreshModules();

    if (!Validator || typeof Validator.validate !== "function") {
      UI.setMessage("is-warning", "Materia cargada. Se continuará con la planificación base.");
      UI.setStatus("Materia lista");
      Progress.render("validate", "Materia lista para planificación", 10);
      return null;
    }

    var validation = Validator.validate(selected);
    var message = typeof Validator.message === "function" ? Validator.message(validation) : "Materia validada.";

    if (State && typeof State.addMessage === "function") {
      State.addMessage(validation.ok ? "ok" : "warning", message);
    }

    if (!validation.ok) {
      UI.setMessage("is-error", message);
      UI.setStatus("Falta asignatura");
      Progress.render("validate", "Validación con error", 10);
      return validation;
    }

    UI.setMessage(validation.advertencias.length ? "is-warning" : "is-ok", message);
    UI.setStatus(validation.advertencias.length ? "Validada con advertencias" : "Materia validada");
    Progress.render("validate", "Validación flexible completa", 10);

    return validation;
  }

  function buildPlan(selected, validation) {
    refreshModules();

    if (!BookPlan || typeof BookPlan.build !== "function") {
      UI.setMessage("is-warning", "Materia validada. El constructor de secciones se conectará en el siguiente bloque.");
      UI.setStatus("Plan pendiente");
      Progress.render("plan", "Plan pendiente de constructor", 15);
      return null;
    }

    var plan = BookPlan.build(selected, validation);

    State.setPlanLibro(plan);
    State.addMessage("ok", "Plan maestro creado para " + (plan.materia || "la asignatura") + ".");
    UI.setMessage("is-ok", "Plan maestro del libro creado. Preparando motor IA.");
    UI.setStatus("Plan creado");
    Progress.render("plan", "Plan maestro creado", 15);

    return plan;
  }

  async function prepareAi(plan) {
    refreshModules();

    if (!plan) return null;

    if (!AiOrchestrator || typeof AiOrchestrator.prepare !== "function") {
      UI.setMessage("is-warning", "Plan creado. El desarrollo de secciones se conectará en el siguiente bloque.");
      UI.setStatus("IA pendiente");
      Progress.render("plan", "Plan creado sin motor IA", 15);
      return null;
    }

    var prepared = await AiOrchestrator.prepare(plan);

    State.addMessage("ok", "Motor IA preparado con " + prepared.tasks.length + " tareas.");
    UI.setMessage("is-ok", "Motor IA preparado. Listo para generar secciones del libro.");
    UI.setStatus("IA preparada");
    Progress.render("plan", "Motor IA preparado", 18);

    return prepared;
  }

  async function prepareBookPlan() {
    var currentState = State.getState();
    var selected = currentState.materiaSeleccionada;

    if (!selected) {
      UI.setMessage("is-warning", "Selecciona una materia guardada antes de generar el libro.");
      UI.setStatus("Sin materia");
      Progress.reset();
      return null;
    }

    var validation = runFlexibleValidation(selected);

    window.LibroGenLibro.lastValidation = validation;

    if (validation && validation.ok === false) {
      return null;
    }

    var plan = buildPlan(selected, validation);
    window.LibroGenLibro.lastPlan = plan;

    if (!plan) return null;

    var prepared = await prepareAi(plan);
    window.LibroGenLibro.lastAiPreparation = prepared;

    return plan;
  }

  function boot() {
    if (!State || !Progress || !UI) {
      console.error("Gen libro no pudo iniciar: faltan módulos base lb.");
      return;
    }

    State.setStatus(Constants.STATUS ? Constants.STATUS.idle : "idle");
    State.setSelection("", "");
    State.setMateriaSeleccionada(null);
    UI.renderInitial();
    Progress.reset();
    setInitialData();

    var carreraSelect = UI.byId("lb-carrera-select");
    var materiaSelect = UI.byId("lb-materia-select");
    var generateButton = UI.byId("lb-generate-btn");

    if (carreraSelect) {
      carreraSelect.addEventListener("change", function onCarreraChange() {
        var carrera = UI.getSelectedCarrera();
        State.setSelection(carrera, "");
        State.setMateriaSeleccionada(null);
        State.setPlanLibro(null);
        UI.setGenerateEnabled(false);
        Progress.render("load", carrera ? "Cargando materias" : "Esperando selección de materia", carrera ? 5 : 0);

        if (MateriaSelector && typeof MateriaSelector.loadMaterias === "function") {
          MateriaSelector.loadMaterias(carrera);
        }
      });
    }

    if (materiaSelect) {
      materiaSelect.addEventListener("change", function onMateriaChange() {
        var carrera = UI.getSelectedCarrera();
        var materiaId = UI.getSelectedMateria();
        State.setSelection(carrera, materiaId);
        State.setPlanLibro(null);

        if (MateriaSelector && typeof MateriaSelector.selectMateria === "function") {
          var selected = MateriaSelector.selectMateria(carrera, materiaId);
          Progress.render(selected ? "load" : "idle", selected ? "Materia cargada" : "Esperando selección de materia", selected ? 8 : 0);
        }
      });
    }

    if (generateButton) {
      generateButton.addEventListener("click", function onGenerateClick() {
        prepareBookPlan();
      });
    }

    window.LibroGenLibro = {
      getState: State.getState,
      reloadMaterias: setInitialData,
      validateSelected: function validateSelected() {
        return runFlexibleValidation(State.getState().materiaSeleccionada);
      },
      buildPlan: prepareBookPlan
    };
  }

  document.addEventListener("DOMContentLoaded", boot);
})(window, document);
