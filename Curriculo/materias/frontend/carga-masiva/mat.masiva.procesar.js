/*
Nombre del archivo: mat.masiva.procesar.js
Ubicación: C:\Users\ITSQMET\Desktop\eventos\materias\frontend\carga-masiva\mat.masiva.procesar.js
Función:
- Procesa el texto dentro del modal
- Genera la vista previa temporal
- Valida antes de aplicar
- Maneja Procesar y Limpiar
*/

(function (window, document) {
  "use strict";

  window.MAT = window.MAT || {};
  var MAT = window.MAT;

  MAT.masiva = MAT.masiva || {};
  MAT.masiva.procesar = MAT.masiva.procesar || {};

  MAT.masiva.procesar.run = function () {
    var input = MAT.ui.modal.getInput();
    var raw = input ? String(input.value || "") : "";
    var analysis;
    var validation;

    if (!MAT.state.data.selectedCareerId) {
      MAT.ui.modal.setStatus("Primero selecciona una carrera.", "warn");
      return null;
    }

    if (!MAT.state.data.selectedLoadType) {
      MAT.ui.modal.setStatus("Primero selecciona qué vas a subir.", "warn");
      return null;
    }

    if (!String(raw).trim()) {
      MAT.ui.modal.setStatus("Pega contenido antes de procesar.", "warn");
      MAT.ui.modal.setApplyEnabled(false);
      MAT.ui.clearPreview();
      return null;
    }

    analysis = MAT.main.analyzeRawText(
      raw,
      MAT.state.data.selectedLoadType,
      MAT.state.data.selectedCareerType
    );

    validation = MAT.validar.general.preview(
      analysis,
      MAT.state.data.selectedCareerType
    );

    MAT.masiva.state.rawText = raw;
    MAT.masiva.state.preview = analysis;

    MAT.ui.renderPreview(analysis);
    MAT.ui.modal.setApplyEnabled(!!validation.ok);

    if (!validation.ok) {
      MAT.ui.modal.setStatus(validation.errors[0] || "La estructura no es válida.", "error");
      return {
        preview: analysis,
        validation: validation
      };
    }

    if (validation.warnings.length) {
      MAT.ui.modal.setStatus(validation.warnings[0], "warn");
      return {
        preview: analysis,
        validation: validation
      };
    }

    MAT.ui.modal.setStatus("Importación procesada correctamente. Presiona Aplicar al editor.", "ok");

    return {
      preview: analysis,
      validation: validation
    };
  };

  MAT.masiva.procesar.clear = function () {
    MAT.masiva.modal.resetTemp();
  };

  MAT.masiva.procesar.bind = function () {
    var processButton = MAT.ui.getEl("processButton");
    var clearButton = MAT.ui.getEl("clearButton");

    if (processButton && !processButton.__matBound) {
      processButton.addEventListener("click", function () {
        MAT.masiva.procesar.run();
      });

      processButton.__matBound = true;
    }

    if (clearButton && !clearButton.__matBound) {
      clearButton.addEventListener("click", function () {
        MAT.masiva.procesar.clear();
      });

      clearButton.__matBound = true;
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      MAT.masiva.procesar.bind();
    });
  } else {
    MAT.masiva.procesar.bind();
  }
})(window, document);