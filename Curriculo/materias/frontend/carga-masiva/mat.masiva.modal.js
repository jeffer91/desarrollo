/*
Nombre del archivo: mat.masiva.modal.js
Ubicación: /Curriculo/materias/frontend/carga-masiva/mat.masiva.modal.js
Función:
- Mantener el estado temporal de la importación masiva
- Abrir y cerrar el modal
- Resetear texto, preview y validación temporal
- Evitar aplicar datos desactualizados si el texto cambia
*/

(function (window, document) {
  "use strict";

  window.MAT = window.MAT || {};
  var MAT = window.MAT;

  MAT.masiva = MAT.masiva || {};

  MAT.masiva.state = MAT.masiva.state || {
    rawText: "",
    preview: null,
    lastValidation: null
  };

  MAT.masiva.modal = MAT.masiva.modal || {};

  function resetPreviewOnly() {
    MAT.masiva.state.preview = null;
    MAT.masiva.state.lastValidation = null;
    if (MAT.ui && typeof MAT.ui.clearPreview === "function") MAT.ui.clearPreview();
    if (MAT.ui && MAT.ui.modal && typeof MAT.ui.modal.setApplyEnabled === "function") MAT.ui.modal.setApplyEnabled(false);
  }

  MAT.masiva.modal.syncUiFromState = function () {
    var input = MAT.ui.modal.getInput();
    var preview = MAT.masiva.state.preview;
    var validation = MAT.masiva.state.lastValidation;

    if (input) input.value = String(MAT.masiva.state.rawText || "");

    if (preview) {
      MAT.ui.renderPreview(preview);
      MAT.ui.modal.setApplyEnabled(!!(validation && validation.ok));
    } else {
      MAT.ui.clearPreview();
      MAT.ui.modal.setApplyEnabled(false);
    }
  };

  MAT.masiva.modal.resetTemp = function () {
    var input = MAT.ui.modal.getInput();
    MAT.masiva.state.rawText = "";
    MAT.masiva.state.preview = null;
    MAT.masiva.state.lastValidation = null;
    if (input) input.value = "";
    MAT.ui.clearPreview();
    MAT.ui.modal.setApplyEnabled(false);
    MAT.ui.modal.setStatus("Pega el contenido y presiona Procesar.", "");
  };

  MAT.masiva.modal.open = function () {
    if (!MAT.state.data.selectedCareerId) {
      MAT.ui.setStatus("Primero selecciona una carrera.", "warn");
      return;
    }

    if (!MAT.state.data.selectedLoadType) {
      MAT.ui.setStatus("Primero selecciona qué vas a subir.", "warn");
      return;
    }

    MAT.ui.modal.open();
    this.syncUiFromState();

    if (!MAT.masiva.state.preview) MAT.ui.modal.setStatus("Pega el contenido y presiona Procesar.", "");
    else MAT.ui.modal.setStatus("Puedes corregir esta importación temporal o aplicarla al editor.", "ok");

    MAT.ui.modal.focusInput();
  };

  MAT.masiva.modal.close = function () {
    MAT.ui.modal.close();
  };

  MAT.masiva.modal.bind = function () {
    var openButton = MAT.ui.getEl("openMassiveButton");
    var closeButton = MAT.ui.modal.getCloseButton();
    var input = MAT.ui.modal.getInput();

    if (openButton && !openButton.__matMassiveOpenBound && !openButton.__matBoundMain) {
      openButton.addEventListener("click", function () { MAT.masiva.modal.open(); });
      openButton.__matMassiveOpenBound = true;
    }

    if (closeButton && !closeButton.__matMassiveCloseBound) {
      closeButton.addEventListener("click", function () { MAT.masiva.modal.close(); });
      closeButton.__matMassiveCloseBound = true;
    }

    if (input && !input.__matMassiveInputBound) {
      input.addEventListener("input", function () {
        MAT.masiva.state.rawText = String(input.value || "");
        if (MAT.masiva.state.preview) {
          resetPreviewOnly();
          MAT.ui.modal.setStatus("El texto cambió. Debes procesarlo nuevamente.", "warn");
        }
      });
      input.__matMassiveInputBound = true;
    }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", MAT.masiva.modal.bind);
  else MAT.masiva.modal.bind();
})(window, document);
