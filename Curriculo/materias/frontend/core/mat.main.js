/*
Nombre del archivo: mat.main.js
Ubicación: /Curriculo/materias/frontend/core/mat.main.js
Función:
- Orquestar el módulo Materias
- Cargar carreras desde local/Firebase
- Mantener memoria de carrera y tipo de carga
- Aplicar importaciones al editor principal
- Guardar primero local y dejar pendiente sincronización
*/
(function (window, document) {
  "use strict";

  window.MAT = window.MAT || {};
  var MAT = window.MAT;

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value == null ? null : value)); }
    catch (error) { return value; }
  }

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function countPreview(preview) {
    if (MAT.tabla && MAT.tabla.acciones && typeof MAT.tabla.acciones.countItems === "function") {
      return MAT.tabla.acciones.countItems(preview);
    }
    return Number(preview && preview.totalLines) || 0;
  }

  function validationFor(preview) {
    if (MAT.validar && MAT.validar.general && typeof MAT.validar.general.preview === "function") {
      return MAT.validar.general.preview(preview, MAT.state.data.selectedCareerType);
    }
    return { ok: true, errors: [], warnings: [], stats: {} };
  }

  MAT.main = {
    init: function () {
      this.bindEvents();
      this.renderSelectors();
      this.setCareerTypeDisplay("");
      this.resetProcessedArea("Aquí podrás editar los datos después de importarlos o cargarlos desde la base.");
      if (MAT.ui && typeof MAT.ui.clearCareerQuickSummary === "function") {
        MAT.ui.clearCareerQuickSummary("Selecciona una carrera para ver qué está cargado.");
      }
      this.boot();
    },

    bindEvents: function () {
      var self = this;
      var refreshButton = MAT.ui.getEl("refreshButton");
      var saveButton = MAT.ui.getEl("saveButton");
      var openMassiveButton = MAT.ui.getEl("openMassiveButton");
      var careerSelect = MAT.selectores.carreras.getEl();
      var loadTypeSelect = MAT.selectores.tipoCarga.getEl();

      if (refreshButton && !refreshButton.__matBoundMain) {
        refreshButton.addEventListener("click", function () { self.loadCareers(true); });
        refreshButton.__matBoundMain = true;
      }

      if (careerSelect && !careerSelect.__matBoundMain) {
        careerSelect.addEventListener("change", function (event) { self.onCareerChange(event.target.value); });
        careerSelect.__matBoundMain = true;
      }

      if (loadTypeSelect && !loadTypeSelect.__matBoundMain) {
        loadTypeSelect.addEventListener("change", function (event) { self.onLoadTypeChange(event.target.value); });
        loadTypeSelect.__matBoundMain = true;
      }

      if (saveButton && !saveButton.__matBoundMain) {
        saveButton.addEventListener("click", function () { self.handleSave(); });
        saveButton.__matBoundMain = true;
      }

      if (openMassiveButton && !openMassiveButton.__matBoundMain) {
        openMassiveButton.addEventListener("click", function () { self.openMassive(); });
        openMassiveButton.__matBoundMain = true;
      }
    },

    renderSelectors: function () {
      MAT.selectores.tipoCarga.render();
      MAT.selectores.carreras.render([]);
    },

    boot: function () {
      var db = MAT.firebase.init();
      MAT.ui.clearSummary("Aún no has guardado cambios.");
      if (!db) {
        MAT.ui.setStatus("Firebase no está disponible. Se intentará usar la base local si existe.", "warn");
      }
      this.loadCareers(false);
    },

    loadCareers: async function (manual) {
      var list = [];
      var rememberedCareerId = MAT.state.data.selectedCareerId;
      var rememberedLoadType = MAT.state.data.selectedLoadType;

      try {
        MAT.ui.setStatus("Cargando carreras desde local/Firebase...", "");
        list = await MAT.carreras.listar();
        MAT.state.setCareers(list);
        MAT.state.setReady(true);
        MAT.selectores.carreras.render(list);
        MAT.selectores.tipoCarga.render();

        if (rememberedCareerId && MAT.state.getCareerById(rememberedCareerId)) {
          MAT.selectores.carreras.setValue(rememberedCareerId);
          this.onCareerChange(rememberedCareerId, true);
        }

        if (rememberedLoadType) {
          MAT.selectores.tipoCarga.setValue(rememberedLoadType);
          this.onLoadTypeChange(rememberedLoadType, true);
        }

        if (!list.length) {
          this.setCareerTypeDisplay("");
          this.resetProcessedArea("No se encontraron carreras.");
          MAT.ui.clearCareerQuickSummary("No hay carreras disponibles.");
          MAT.ui.setStatus("No se encontraron carreras en local/Firebase.", "warn");
          return;
        }

        MAT.ui.setStatus("Carreras cargadas correctamente: " + list.length, manual ? "ok" : "");
        await MAT.ui.refreshSyncStatus();
      } catch (error) {
        console.error(error);
        this.setCareerTypeDisplay("");
        MAT.ui.clearCareerQuickSummary("No se pudo cargar el resumen.");
        MAT.ui.setStatus("Ocurrió un error al leer carreras.", "error");
      }
    },

    onCareerChange: function (careerId, silent) {
      var career = MAT.carreras.buscarLocal(careerId);
      var selectedId = clean(careerId);

      if (!career) {
        MAT.state.clearCareer();
        this.setCareerTypeDisplay("");
        this.resetProcessedArea("Selecciona una carrera para continuar.");
        MAT.ui.clearCareerQuickSummary("Selecciona una carrera para ver qué está cargado.");
        if (!silent) MAT.ui.setStatus("Selecciona una carrera para continuar.", "");
        return;
      }

      MAT.state.setCareer(career);
      this.setCareerTypeDisplay(career.tipo || "");
      this.resetProcessedArea("La carrera cambió. Selecciona un tipo de carga o abre carga masiva.");
      this.updateEditorHint();
      if (!silent) MAT.ui.setStatus("Carrera seleccionada: " + career.nombre, "ok");
      this.loadCareerQuickSummary(selectedId, career);
    },

    loadCareerQuickSummary: async function (careerId, fallbackCareer) {
      var requestedId = clean(careerId);
      var fullCareer = null;

      if (!requestedId) return;
      if (MAT.ui.carreraSummary && typeof MAT.ui.carreraSummary.renderLoading === "function") {
        MAT.ui.carreraSummary.renderLoading();
      }

      try {
        fullCareer = await MAT.carreras.leerUna(requestedId);
        if (!this.isSelectedCareer(requestedId)) return;
        if (!fullCareer || typeof fullCareer !== "object") fullCareer = fallbackCareer || {};
        if (MAT.ui.carreraSummary && typeof MAT.ui.carreraSummary.render === "function") {
          MAT.ui.carreraSummary.render(fullCareer);
        }
      } catch (error) {
        console.error(error);
        if (!this.isSelectedCareer(requestedId)) return;
        if (MAT.ui.carreraSummary && typeof MAT.ui.carreraSummary.renderError === "function") {
          MAT.ui.carreraSummary.renderError();
        }
      }
    },

    isSelectedCareer: function (careerId) {
      return clean(MAT.state.data.selectedCareerId) === clean(careerId);
    },

    onLoadTypeChange: function (value, silent) {
      MAT.state.setLoadType(value);
      this.resetProcessedArea("El tipo de carga cambió. Se puede cargar desde base o usar carga masiva.");
      this.updateEditorHint();
      if (!silent && value) MAT.ui.setStatus("Tipo de carga seleccionado.", "ok");
    },

    updateEditorHint: function () {
      var type = MAT.state.data.selectedLoadType;
      var text = "Primero elige una carrera y luego el tipo de carga. Después usa Abrir carga masiva.";
      if (type === "materias-carrera") text = "Carga materias por niveles. Puedes pegar texto desde Word, PDF o Excel.";
      else if (type === "transversales") text = "Carga materias transversales por niveles o sin nivel.";
      else if (type === "nucleos") text = "Deben ser 4 núcleos.";
      else if (type === "ejes") text = "Universitaria espera 6 ejes; superior o técnica espera 4.";
      MAT.ui.setEditorHint(text);
    },

    setCareerTypeDisplay: function (value) {
      var input = MAT.ui.getEl("careerTypeDisplay");
      if (input) input.value = clean(value) || "Sin seleccionar";
    },

    resetProcessedArea: function (editorMessage) {
      MAT.state.clearPreview();
      MAT.state.setDirty(false);
      MAT.ui.clearPreview();
      MAT.ui.setSaveEnabled(false);
      MAT.editor.base.renderEmpty(editorMessage || "Aquí podrás editar los datos después de importarlos.");
      if (MAT.tabla && MAT.tabla.render && typeof MAT.tabla.render.empty === "function") {
        MAT.tabla.render.empty(editorMessage || "Aún no hay datos para mostrar.");
      }
      if (MAT.masiva && MAT.masiva.modal && typeof MAT.masiva.modal.resetTemp === "function") {
        MAT.masiva.modal.resetTemp();
      }
    },

    applyImportedPreview: function (analysis) {
      var validation;
      if (!analysis || typeof analysis !== "object") {
        MAT.ui.setStatus("No hay una importación válida para aplicar.", "warn");
        return null;
      }

      validation = validationFor(analysis);
      MAT.state.setPreview(clone(analysis));
      MAT.state.setDirty(true);
      MAT.ui.renderPreview(analysis);
      MAT.editor.base.renderFromPreview(analysis, MAT.state.data.selectedCareerType);
      MAT.tabla.render.fromPreview(analysis, MAT.state.data.selectedCareerType, { source: "importado", title: "Datos del bloque actual" });
      MAT.ui.setSaveEnabled(!!validation.ok);
      if (MAT.ui.resumen && typeof MAT.ui.resumen.renderValidation === "function") MAT.ui.resumen.renderValidation(validation);

      if (!validation.ok) MAT.ui.setStatus(validation.errors[0] || "La estructura no es válida.", "error");
      else if (validation.warnings.length) MAT.ui.setStatus("Importación aplicada con advertencias. Revisa el resumen.", "warn");
      else MAT.ui.setStatus("Importación aplicada correctamente. Ahora puedes revisar y guardar.", "ok");

      return { preview: analysis, validation: validation };
    },

    openMassive: function () {
      if (!MAT.state.data.selectedCareerId || !MAT.state.data.selectedLoadType) {
        MAT.ui.setStatus("Primero selecciona carrera y tipo de carga.", "warn");
        return;
      }
      if (MAT.ui.modal && typeof MAT.ui.modal.open === "function") {
        MAT.ui.modal.open();
        MAT.ui.modal.focusInput();
      }
    },

    handleSave: async function () {
      var preview = MAT.state.data.preview;
      var validation;
      var result;

      try {
        if (!MAT.state.data.selectedCareerId) {
          MAT.ui.setStatus("Primero selecciona una carrera.", "warn");
          return null;
        }
        if (!MAT.state.data.selectedLoadType) {
          MAT.ui.setStatus("Primero selecciona qué vas a subir.", "warn");
          return null;
        }
        if (!preview && MAT.editor.base && typeof MAT.editor.base.collectPreview === "function") {
          preview = MAT.editor.base.collectPreview(MAT.state.data.preview || { kind: MAT.state.data.selectedLoadType, summary: {} });
          MAT.state.setPreview(preview);
        }
        if (!preview) {
          MAT.ui.setStatus("No hay datos para guardar.", "warn");
          return null;
        }

        validation = validationFor(preview);
        if (!validation.ok) {
          MAT.ui.resumen.renderValidation(validation);
          MAT.ui.setStatus(validation.errors[0] || "No se puede guardar.", "error");
          return null;
        }

        MAT.ui.setSaveEnabled(false);
        MAT.ui.setStatus("Guardando en base local/Firebase...", "");
        result = await MAT.carga.guardarDesdePreview({ careerId: MAT.state.data.selectedCareerId, preview: preview });
        MAT.state.setPreview(result && result.preview ? result.preview : preview);
        MAT.state.setSaved();
        MAT.ui.resumen.renderSaveResult(result);
        MAT.ui.setStatus(result.mensaje || "Cambios guardados correctamente.", "ok");
        await this.loadCareerQuickSummary(MAT.state.data.selectedCareerId, MAT.state.getCareerById(MAT.state.data.selectedCareerId));
        await MAT.ui.refreshSyncStatus();
        return result;
      } catch (error) {
        console.error(error);
        MAT.ui.setSaveEnabled(true);
        MAT.ui.setStatus(error.message || "No se pudo guardar.", "error");
        return null;
      }
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () { MAT.main.init(); });
  } else {
    MAT.main.init();
  }
})(window, document);
