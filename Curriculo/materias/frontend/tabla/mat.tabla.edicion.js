/*
Nombre del archivo: mat.tabla.edicion.js
Ubicación: /Curriculo/materias/frontend/tabla/mat.tabla.edicion.js
Función:
- Manejar eventos de la tabla
- Sincronizar tabla, editor y preview
- Permitir recargar, tomar del editor y limpiar bloque
*/

(function (window, document) {
  "use strict";

  window.MAT = window.MAT || {};
  var MAT = window.MAT;

  MAT.tabla = MAT.tabla || {};
  MAT.tabla.edicion = MAT.tabla.edicion || {};

  function validateAndRender(preview) {
    var validation;
    if (!preview) return;

    MAT.state.setPreview(preview);
    MAT.state.setDirty(true);
    MAT.ui.renderPreview(preview);
    MAT.editor.base.renderFromPreview(preview, MAT.state.data.selectedCareerType);
    MAT.tabla.render.fromPreview(preview, MAT.state.data.selectedCareerType, { source: "editor", title: "Datos del bloque actual" });

    if (MAT.validar && MAT.validar.general && typeof MAT.validar.general.preview === "function") {
      validation = MAT.validar.general.preview(preview, MAT.state.data.selectedCareerType);
      if (MAT.ui.resumen && typeof MAT.ui.resumen.renderValidation === "function") MAT.ui.resumen.renderValidation(validation);
      MAT.ui.setSaveEnabled(!!validation.ok);
    } else {
      MAT.ui.setSaveEnabled(true);
    }
  }

  MAT.tabla.edicion.syncFromEditor = function () {
    var preview = null;
    if (!MAT.state.data.preview) return;
    if (MAT.editor.base && typeof MAT.editor.base.collectPreview === "function") {
      preview = MAT.editor.base.collectPreview(MAT.state.data.preview);
      validateAndRender(preview);
      MAT.ui.setStatus("La tabla fue sincronizada con el editor.", "ok");
    }
  };

  MAT.tabla.edicion.clearCurrentBlock = function () {
    var preview;
    if (MAT.tabla.acciones && typeof MAT.tabla.acciones.clearBlock === "function") {
      preview = MAT.tabla.acciones.clearBlock(MAT.state.data.selectedLoadType, MAT.state.data.selectedCareerType);
      validateAndRender(preview);
      MAT.ui.setStatus("El bloque actual fue limpiado en memoria. Guarda para aplicar el cambio.", "warn");
    }
  };

  MAT.tabla.edicion.reloadFromDb = async function () {
    if (!MAT.state.data.selectedCareerId || !MAT.state.data.selectedLoadType) {
      MAT.ui.setStatus("Primero selecciona carrera y tipo de carga.", "warn");
      return;
    }

    try {
      await MAT.editor.cargarDesdeDb.fromCurrentSelection();
      await MAT.ui.refreshSyncStatus();
    } catch (error) {
      console.error(error);
      MAT.ui.setStatus("No se pudo recargar el bloque desde local/Firebase.", "error");
    }
  };

  MAT.tabla.edicion.applyAction = function (action, group, index) {
    var preview = MAT.state.data.preview;
    var updated = null;
    if (!preview || !MAT.tabla.acciones) return;

    if (action === "remove" && typeof MAT.tabla.acciones.removeItem === "function") updated = MAT.tabla.acciones.removeItem(preview, group, index);
    else if (action === "move-up" && typeof MAT.tabla.acciones.moveUp === "function") updated = MAT.tabla.acciones.moveUp(preview, group, index);
    else if (action === "move-down" && typeof MAT.tabla.acciones.moveDown === "function") updated = MAT.tabla.acciones.moveDown(preview, group, index);

    if (updated) {
      validateAndRender(updated);
      MAT.ui.setStatus("Se actualizó el bloque en memoria. Guarda para confirmar.", "warn");
    }
  };

  MAT.tabla.edicion.bind = function () {
    if (document.__matTablaEdicionBound) return;

    document.addEventListener("click", function (event) {
      var actionEl = event.target.closest("[data-mat-table-action]");
      var toolbarEl = event.target.closest("[data-mat-table-toolbar]");
      var action;
      var group;
      var index;
      var toolbar;

      if (actionEl) {
        action = String(actionEl.getAttribute("data-mat-table-action") || "").trim();
        group = String(actionEl.getAttribute("data-group") || "").trim();
        index = Number(actionEl.getAttribute("data-index"));
        MAT.tabla.edicion.applyAction(action, group, index);
        return;
      }

      if (toolbarEl) {
        toolbar = String(toolbarEl.getAttribute("data-mat-table-toolbar") || "").trim();
        if (toolbar === "reload-db") MAT.tabla.edicion.reloadFromDb();
        else if (toolbar === "take-editor") MAT.tabla.edicion.syncFromEditor();
        else if (toolbar === "clear-block") MAT.tabla.edicion.clearCurrentBlock();
      }
    });

    document.__matTablaEdicionBound = true;
  };
})(window, document);
