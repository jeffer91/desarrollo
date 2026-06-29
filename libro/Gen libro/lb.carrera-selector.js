/* =========================================================
Nombre completo: lb.carrera-selector.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.carrera-selector.js
Función o funciones:
1. Cargar carreras guardadas en el selector de Gen libro.
2. Refrescar el selector de materias al cambiar carrera.
3. Mostrar mensajes claros cuando no existan materias guardadas.
========================================================= */

(function attachLbCarreraSelector(window) {
  "use strict";

  var DataSource = window.LibroGenLibroDataSource || null;
  var UI = window.LibroGenLibroUI || null;

  function loadCarreras() {
    if (!DataSource || !UI) return [];

    var carreras = DataSource.listCarreras();

    UI.fillSelect(
      "lb-carrera-select",
      carreras,
      carreras.length ? "Selecciona una carrera" : "No hay carreras guardadas",
      function getValue(item) { return item; },
      function getLabel(item) { return item; }
    );

    if (!carreras.length) {
      UI.setMessage("is-warning", "Primero guarda una materia desde Carga de la materia.");
      UI.setStatus("Sin materias guardadas");
    }

    return carreras;
  }

  window.LibroGenLibroCarreraSelector = {
    loadCarreras: loadCarreras
  };
})(window);
