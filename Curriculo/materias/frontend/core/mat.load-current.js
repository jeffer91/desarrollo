/*
Nombre del archivo: mat.load-current.js
Ubicación: /Curriculo/materias/frontend/core/mat.load-current.js
Función:
- Cargar automáticamente el bloque actual al cambiar carrera o tipo
- Refrescar después de guardar
- Inicializar tabla y eventos
*/

(function (window, document) {
  "use strict";

  window.MAT = window.MAT || {};
  var MAT = window.MAT;

  function loadCurrentIfPossible() {
    if (!MAT.state || !MAT.state.data || !MAT.state.data.selectedCareerId || !MAT.state.data.selectedLoadType) {
      if (MAT.tabla && MAT.tabla.render && typeof MAT.tabla.render.noSelection === "function") MAT.tabla.render.noSelection();
      return;
    }

    if (MAT.editor && MAT.editor.cargarDesdeDb && typeof MAT.editor.cargarDesdeDb.fromCurrentSelection === "function") {
      MAT.editor.cargarDesdeDb.fromCurrentSelection().catch(function (error) {
        console.error(error);
        if (MAT.ui && typeof MAT.ui.setStatus === "function") MAT.ui.setStatus("No se pudo cargar el bloque actual desde local/Firebase.", "error");
        if (MAT.tabla && MAT.tabla.render && typeof MAT.tabla.render.empty === "function") MAT.tabla.render.empty("No se pudo cargar el bloque actual.");
      });
    }
  }

  function patchMainMethods() {
    var originalOnCareerChange;
    var originalOnLoadTypeChange;
    var originalHandleSave;

    if (!MAT.main || MAT.main.__matCurrentPatched) return;

    originalOnCareerChange = MAT.main.onCareerChange;
    originalOnLoadTypeChange = MAT.main.onLoadTypeChange;
    originalHandleSave = MAT.main.handleSave;

    if (typeof originalOnCareerChange === "function") {
      MAT.main.onCareerChange = function () {
        var result = originalOnCareerChange.apply(this, arguments);
        window.setTimeout(loadCurrentIfPossible, 80);
        return result;
      };
    }

    if (typeof originalOnLoadTypeChange === "function") {
      MAT.main.onLoadTypeChange = function () {
        var result = originalOnLoadTypeChange.apply(this, arguments);
        window.setTimeout(loadCurrentIfPossible, 80);
        return result;
      };
    }

    if (typeof originalHandleSave === "function") {
      MAT.main.handleSave = async function () {
        var result = await originalHandleSave.apply(this, arguments);
        window.setTimeout(loadCurrentIfPossible, 120);
        return result;
      };
    }

    MAT.main.__matCurrentPatched = true;
  }

  function init() {
    if (MAT.tabla && typeof MAT.tabla.ensure === "function") MAT.tabla.ensure();
    if (MAT.tabla && MAT.tabla.render && typeof MAT.tabla.render.noSelection === "function") MAT.tabla.render.noSelection();
    if (MAT.tabla && MAT.tabla.edicion && typeof MAT.tabla.edicion.bind === "function") MAT.tabla.edicion.bind();
    patchMainMethods();
    window.setTimeout(loadCurrentIfPossible, 250);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})(window, document);
