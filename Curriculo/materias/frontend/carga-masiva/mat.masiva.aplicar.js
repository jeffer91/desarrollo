/*
Nombre del archivo: mat.masiva.aplicar.js
Ubicación: /Curriculo/materias/frontend/carga-masiva/mat.masiva.aplicar.js
Función:
- Tomar la vista previa temporal procesada
- Validarla nuevamente antes de aplicarla
- Aplicarla al editor principal
- Cerrar el modal sin perder lo aplicado
*/

(function (window, document) {
  "use strict";

  window.MAT = window.MAT || {};
  var MAT = window.MAT;

  MAT.masiva = MAT.masiva || {};
  MAT.masiva.aplicar = MAT.masiva.aplicar || {};

  function cloneDeep(value) {
    try { return JSON.parse(JSON.stringify(value == null ? null : value)); }
    catch (error) { return value; }
  }

  function countAccepted(preview) {
    if (MAT.masiva.parser && typeof MAT.masiva.parser.countAccepted === "function") {
      return MAT.masiva.parser.countAccepted(preview);
    }
    return Number(preview && preview.totalLines) || 0;
  }

  MAT.masiva.aplicar.toEditor = function () {
    var preview = cloneDeep(MAT.masiva.state && MAT.masiva.state.preview);
    var validation;

    if (!preview) {
      MAT.ui.modal.setStatus("Primero procesa una importación válida.", "warn");
      return null;
    }

    if (!countAccepted(preview)) {
      MAT.ui.modal.setStatus("No hay datos útiles para aplicar al editor.", "error");
      return null;
    }

    validation = MAT.validar.general.preview(preview, MAT.state.data.selectedCareerType);

    if (!validation.ok) {
      MAT.masiva.state.lastValidation = validation;
      MAT.ui.modal.setApplyEnabled(false);
      MAT.ui.modal.setStatus(validation.errors[0] || "La estructura no es válida.", "error");
      return null;
    }

    if (typeof MAT.main.applyImportedPreview === "function") {
      MAT.main.applyImportedPreview(preview);
      MAT.masiva.state.lastValidation = validation;
      MAT.ui.modal.setStatus("Importación aplicada al editor principal.", "ok");
      MAT.masiva.modal.close();
      return preview;
    }

    MAT.ui.modal.setStatus("No se encontró la lógica principal para aplicar la importación.", "error");
    return null;
  };

  MAT.masiva.aplicar.bind = function () {
    var applyButton = MAT.ui.getEl("applyMassiveButton");

    if (applyButton && !applyButton.__matApplyBound) {
      applyButton.addEventListener("click", function () { MAT.masiva.aplicar.toEditor(); });
      applyButton.__matApplyBound = true;
    }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", MAT.masiva.aplicar.bind);
  else MAT.masiva.aplicar.bind();
})(window, document);
