/* =========================================================
Nombre completo: lb.materia-selector.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.materia-selector.js
Función o funciones:
1. Cargar materias guardadas según la carrera seleccionada.
2. Seleccionar la materia consolidada que usará el generador de libro.
3. Preparar resumen básico de la materia seleccionada.
========================================================= */

(function attachLbMateriaSelector(window) {
  "use strict";

  var DataSource = window.LibroGenLibroDataSource || null;
  var UI = window.LibroGenLibroUI || null;
  var State = window.LibroGenLibroState || null;

  function getLabel(item) {
    var label = item.materia || "Materia sin nombre";
    if (item.estado) label += " · " + item.estado;
    return label;
  }

  function loadMaterias(carrera) {
    if (!DataSource || !UI) return [];

    var materias = DataSource.listMateriasByCarrera(carrera);

    UI.fillSelect(
      "lb-materia-select",
      materias,
      materias.length ? "Selecciona una materia" : "No hay materias para esta carrera",
      function getValue(item) { return item.id; },
      getLabel
    );

    UI.setGenerateEnabled(false);

    if (!materias.length) {
      UI.setMessage("is-warning", "No hay materias guardadas para esta carrera.");
      UI.setStatus("Sin materia");
    }

    return materias;
  }

  function selectMateria(carrera, materiaId) {
    if (!DataSource || !UI || !State) return null;

    var item = DataSource.findMateria(carrera, materiaId);
    var summary = DataSource.buildSummary(item);

    State.setMateriaSeleccionada(item);

    if (!item) {
      UI.setGenerateEnabled(false);
      UI.setStatus("Sin materia");
      UI.setMessage("is-warning", "Selecciona una materia guardada para generar el libro.");
      return null;
    }

    UI.setGenerateEnabled(true);
    UI.setStatus("Materia cargada");
    UI.setMessage(
      "is-ok",
      "Materia lista: " + summary.materia + " · " + summary.unidades + " unidades · " + summary.contenidos + " contenidos."
    );

    return item;
  }

  window.LibroGenLibroMateriaSelector = {
    loadMaterias: loadMaterias,
    selectMateria: selectMateria
  };
})(window);
