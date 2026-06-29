/* =========================================================
Nombre completo: lb.main.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.main.js
Función o funciones:
1. Inicializar la pantalla Gen libro.
2. Conectar selector de carrera, selector de materia, botón y barra de progreso.
3. Preparar la pantalla para los siguientes bloques de lectura, IA y Word.
4. Mantener la pantalla funcional sin depender todavía del generador final.
========================================================= */

(function iniciarGenLibro(window, document) {
  "use strict";

  var Constants = window.LibroGenLibroConstants || {};
  var State = window.LibroGenLibroState || null;
  var Progress = window.LibroGenLibroProgress || null;
  var UI = window.LibroGenLibroUI || null;

  function boot() {
    if (!State || !Progress || !UI) {
      console.error("Gen libro no pudo iniciar: faltan módulos base lb.");
      return;
    }

    State.setStatus(Constants.STATUS ? Constants.STATUS.idle : "idle");
    State.setSelection("", "");
    UI.renderInitial();
    Progress.reset();

    var carreraSelect = UI.byId("lb-carrera-select");
    var materiaSelect = UI.byId("lb-materia-select");
    var generateButton = UI.byId("lb-generate-btn");

    UI.fillSelect("lb-carrera-select", [], "Primero se cargarán las carreras guardadas", null, null);
    UI.fillSelect("lb-materia-select", [], "Selecciona una carrera", null, null);

    if (carreraSelect) {
      carreraSelect.addEventListener("change", function onCarreraChange() {
        State.setSelection(UI.getSelectedCarrera(), "");
        UI.setGenerateEnabled(false);
        UI.setStatus("Carrera seleccionada");
        UI.setMessage("is-warning", "En el siguiente bloque se conectarán las materias guardadas por carrera.");
      });
    }

    if (materiaSelect) {
      materiaSelect.addEventListener("change", function onMateriaChange() {
        State.setSelection(UI.getSelectedCarrera(), UI.getSelectedMateria());
        UI.setGenerateEnabled(Boolean(UI.getSelectedCarrera() && UI.getSelectedMateria()));
      });
    }

    if (generateButton) {
      generateButton.addEventListener("click", function onGenerateClick() {
        UI.setMessage("is-warning", "La estructura base está lista. La generación Word se conectará por bloques.");
        UI.setStatus("Pendiente de motor Word");
        Progress.render("plan", "Estructura base preparada", 15);
      });
    }

    window.LibroGenLibro = {
      getState: State.getState
    };
  }

  document.addEventListener("DOMContentLoaded", boot);
})(window, document);
