/*
=========================================================
Nombre completo: coordi.app.js
Ruta o ubicación: /Docentes/coordi/coordi.app.js
Función o funciones:
- Inicializar la pantalla Coordi.
- Cargar datos guardados o tabla base.
- Conectar eventos de búsqueda, guardado, validación, restauración, importación y exportación.
- Coordinar estado, repositorio, tabla y validaciones.
Con qué se une:
- coordi.index.html
- coordi.state.js
- coordi.dom.js
- coordi.seed.js
- coordi.normalize.js
- coordi.validate.js
- coordi.repo.js
- coordi.table.js
- coordi.import.js
- coordi.export.js
=========================================================
*/

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    bindEvents();
    await loadInitialData();
  }

  async function loadInitialData() {
    window.CoordiState.setLoading(true);

    try {
      const savedRows = await window.CoordiRepo.readAll();

      if (savedRows.length > 0) {
        window.CoordiState.setRows(savedRows, {
          source: "storage",
          dirty: false
        });

        window.CoordiDOM.setSaveStatus("Datos cargados desde almacenamiento local", "success");
      } else {
        const seedRows = window.CoordiSeed.getRows();

        window.CoordiState.setRows(seedRows, {
          source: "seed",
          dirty: true
        });

        window.CoordiDOM.setSaveStatus("Tabla base cargada. Presiona Guardar.", "warning");
      }

      render();
    } catch (error) {
      console.error(error);
      window.CoordiDOM.setSaveStatus("Error al cargar datos", "danger");
    } finally {
      window.CoordiState.setLoading(false);
    }
  }

  function bindEvents() {
    const elements = window.CoordiDOM.getElements();

    if (elements.search) {
      elements.search.addEventListener("input", handleSearch);
    }

    if (elements.btnAddRow) {
      elements.btnAddRow.addEventListener("click", handleAddRow);
    }

    if (elements.btnValidate) {
      elements.btnValidate.addEventListener("click", handleValidate);
    }

    if (elements.btnSave) {
      elements.btnSave.addEventListener("click", handleSave);
    }

    if (elements.btnRestoreSeed) {
      elements.btnRestoreSeed.addEventListener("click", handleRestoreSeed);
    }

    if (elements.btnImport) {
      elements.btnImport.addEventListener("click", handleImportClick);
    }

    if (elements.importFile) {
      elements.importFile.addEventListener("change", handleImportFile);
    }

    if (elements.btnExport) {
      elements.btnExport.addEventListener("click", handleExport);
    }
  }

  function handleSearch(event) {
    window.CoordiState.setFilterText(event.target.value);
    render();
  }

  function handleAddRow() {
    window.CoordiState.addRow({
      carrera: "",
      coordinador: "",
      programa: "",
      telegram: ""
    });

    render();
    window.CoordiDOM.setSaveStatus("Cambios pendientes", "warning");
  }

  function handleValidate() {
    const result = validateCurrentRows();
    const message = result.valid
      ? "Validación correcta. No hay errores."
      : "Existen observaciones pendientes.";

    window.CoordiDOM.setSaveStatus(message, result.valid ? "success" : "danger");
  }

  async function handleSave() {
    const result = validateCurrentRows();

    if (!result.valid) {
      window.CoordiDOM.setSaveStatus("Corrige las observaciones antes de guardar", "danger");
      return;
    }

    const rows = window.CoordiState.getRows().map((row) => {
      if (!window.CoordiNormalize) {
        return row;
      }

      return window.CoordiNormalize.normalizeRow(row);
    });

    await window.CoordiRepo.saveAll(rows);

    window.CoordiState.setRows(rows, {
      source: "storage",
      dirty: false
    });

    window.CoordiState.markSaved();
    window.CoordiDOM.setSaveStatus("Guardado correctamente", "success");
    render();
  }

  async function handleRestoreSeed() {
    const confirmed = confirm(
      "¿Deseas restaurar la tabla base? Esto reemplazará los cambios actuales de Coordi."
    );

    if (!confirmed) {
      return;
    }

    const seedRows = window.CoordiSeed.getRows();

    window.CoordiState.setRows(seedRows, {
      source: "seed",
      dirty: true
    });

    await window.CoordiRepo.resetWithSeed(seedRows);
    window.CoordiState.markSaved();

    window.CoordiDOM.showErrors([]);
    window.CoordiDOM.setSaveStatus("Tabla base restaurada", "success");
    render();
  }

  function handleImportClick() {
    const elements = window.CoordiDOM.getElements();

    if (!window.CoordiImport) {
      alert("La importación se activará cuando se agregue el archivo coordi.import.js.");
      return;
    }

    if (elements.importFile) {
      elements.importFile.click();
    }
  }

  async function handleImportFile(event) {
    if (!window.CoordiImport) {
      return;
    }

    const file = event.target.files && event.target.files[0];

    if (!file) {
      return;
    }

    try {
      const importedRows = await window.CoordiImport.readFile(file);
      window.CoordiState.setRows(importedRows, {
        source: "excel",
        dirty: true
      });

      window.CoordiDOM.setSaveStatus("Excel importado. Revisa y guarda.", "warning");
      render();
    } catch (error) {
      console.error(error);
      alert("No se pudo importar el archivo. Revisa que tenga las columnas correctas.");
    } finally {
      event.target.value = "";
    }
  }

  function handleExport() {
    if (!window.CoordiExport) {
      alert("La exportación se activará cuando se agregue el archivo coordi.export.js.");
      return;
    }

    window.CoordiExport.download(window.CoordiState.getRows());
  }

  function validateCurrentRows() {
    const rows = window.CoordiState.getRows();
    const result = window.CoordiValidate.validateRows(rows);
    const invalidCellMap = window.CoordiValidate.getInvalidCellMap(result.errors);

    window.CoordiState.setErrors(result.errors);
    window.CoordiDOM.showErrors(result.errors);
    window.CoordiTable.render(rows, { invalidCellMap });

    return result;
  }

  function render() {
    const rows = window.CoordiState.getRows();
    window.CoordiTable.render(rows);
  }
})();