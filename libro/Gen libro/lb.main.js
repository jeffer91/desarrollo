/* =========================================================
Nombre completo: lb.main.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.main.js
Función o funciones:
1. Inicializar la pantalla Gen libro.
2. Conectar selector de carrera y selector de materia con el almacenamiento local.
3. Cargar la materia consolidada seleccionada desde Carga de la materia.
4. Preparar la pantalla para los siguientes bloques de validación, IA y Word.
========================================================= */

(function iniciarGenLibro(window, document) {
  "use strict";

  var Constants = window.LibroGenLibroConstants || {};
  var State = window.LibroGenLibroState || null;
  var Progress = window.LibroGenLibroProgress || null;
  var UI = window.LibroGenLibroUI || null;
  var CarreraSelector = window.LibroGenLibroCarreraSelector || null;
  var MateriaSelector = window.LibroGenLibroMateriaSelector || null;

  function refreshModules() {
    CarreraSelector = window.LibroGenLibroCarreraSelector || CarreraSelector;
    MateriaSelector = window.LibroGenLibroMateriaSelector || MateriaSelector;
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

        if (MateriaSelector && typeof MateriaSelector.selectMateria === "function") {
          var selected = MateriaSelector.selectMateria(carrera, materiaId);
          Progress.render(selected ? "load" : "idle", selected ? "Materia cargada" : "Esperando selección de materia", selected ? 8 : 0);
        }
      });
    }

    if (generateButton) {
      generateButton.addEventListener("click", function onGenerateClick() {
        var currentState = State.getState();

        if (!currentState.materiaSeleccionada) {
          UI.setMessage("is-warning", "Selecciona una materia guardada antes de generar el libro.");
          UI.setStatus("Sin materia");
          Progress.reset();
          return;
        }

        UI.setMessage("is-warning", "Materia cargada. La validación flexible se conectará en el siguiente bloque.");
        UI.setStatus("Materia lista");
        Progress.render("validate", "Materia lista para validación", 10);
      });
    }

    window.LibroGenLibro = {
      getState: State.getState,
      reloadMaterias: setInitialData
    };
  }

  document.addEventListener("DOMContentLoaded", boot);
})(window, document);
