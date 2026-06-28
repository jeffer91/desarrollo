/* =========================================================
Nombre completo: generador-libro.main.js
Ruta o ubicación: /desarrollo/libro/generador-libro/generador-libro.main.js
Función o funciones:
1. Controlar la pantalla Generador de libro.
2. Cargar materias consolidadas desde localStorage o JSON externo.
3. Generar el libro académico en formato textual.
4. Exportar TXT y JSON.
5. Mantener el estado visible para el usuario.
========================================================= */

(function iniciarGeneradorLibro(window, document) {
  "use strict";

  var Builder = window.GeneradorLibroBuilder || null;
  var Storage = window.GeneradorLibroStorage || null;

  var state = {
    materia: null,
    payload: null,
    libro: null,
    isExporting: false
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function setStatus(element, type, label) {
    if (!element) return;

    element.classList.remove("is-pending", "is-ok", "is-warning", "is-error");
    element.classList.add(type || "is-pending");
    element.textContent = label || "Pendiente";
  }

  function buildSummary(materia) {
    if (!materia) {
      return "Carga una materia consolidada para generar el libro.";
    }

    var unidades = safeArray(materia.unidades);
    var contenidos = unidades.reduce(function sum(total, unit) {
      return total + safeArray(unit.contenidos).length;
    }, 0);
    var actividades = unidades.reduce(function sum(total, unit) {
      return total + safeArray(unit.actividades).length;
    }, 0);

    return [
      "Materia cargada:",
      "Carrera: " + (text(materia.carrera) || "[No registrada]"),
      "Materia: " + (text(materia.materia) || "[No registrada]"),
      "Unidades: " + unidades.length,
      "Contenidos: " + contenidos,
      "Actividades: " + actividades,
      "Estado: " + (text(materia.estado) || "sin_estado")
    ].join("\n");
  }

  function refreshSavedOptions(elements) {
    var items = Storage && typeof Storage.readIndex === "function" ? Storage.readIndex() : [];
    elements.savedSelect.innerHTML = "";

    if (!items.length) {
      var emptyOption = document.createElement("option");
      emptyOption.value = "";
      emptyOption.textContent = "No hay materias guardadas todavía";
      elements.savedSelect.appendChild(emptyOption);
      return;
    }

    items.forEach(function eachItem(item) {
      var option = document.createElement("option");
      option.value = item.idLocal || "";
      option.textContent = [
        item.materia || "Materia sin nombre",
        item.carrera ? " · " + item.carrera : "",
        item.estado ? " · " + item.estado : ""
      ].join("");
      elements.savedSelect.appendChild(option);
    });
  }

  function refresh(elements) {
    elements.summary.textContent = buildSummary(state.materia);
    elements.buildBtn.disabled = !state.materia;
    elements.exportTxtBtn.disabled = !state.libro || state.isExporting;
    elements.exportJsonBtn.disabled = !state.libro || state.isExporting;

    if (!state.materia) {
      setStatus(elements.status, "is-pending", "Sin cargar");
    } else if (!state.libro) {
      setStatus(elements.status, "is-ok", "Cargada");
    }
  }

  function loadSaved(elements) {
    var id = elements.savedSelect.value;

    if (!id) {
      setStatus(elements.status, "is-warning", "Sin selección");
      return;
    }

    var payload = Storage.readSavedById(id);
    var materia = Storage.extractMateria(payload);

    if (!materia) {
      setStatus(elements.status, "is-error", "No válida");
      elements.preview.textContent = "No se pudo leer la materia guardada.";
      return;
    }

    state.payload = payload;
    state.materia = materia;
    state.libro = null;
    setStatus(elements.status, "is-ok", "Cargada");
    setStatus(elements.bookStatus, "is-pending", "Sin generar");
    elements.preview.textContent = "Materia cargada. Presiona Generar libro.";
    refresh(elements);
  }

  async function loadJsonFile(elements, file) {
    if (!file) return;

    elements.jsonName.textContent = file.name;

    try {
      var result = await Storage.loadJsonFile(file);
      state.payload = result.payload;
      state.materia = result.materia;
      state.libro = null;
      setStatus(elements.status, "is-ok", "JSON cargado");
      setStatus(elements.bookStatus, "is-pending", "Sin generar");
      elements.preview.textContent = "JSON cargado. Presiona Generar libro.";
    } catch (error) {
      state.payload = null;
      state.materia = null;
      state.libro = null;
      setStatus(elements.status, "is-error", "Error JSON");
      elements.preview.textContent = error && error.message ? error.message : String(error);
    }

    refresh(elements);
  }

  function buildBook(elements) {
    if (!Builder || typeof Builder.build !== "function") {
      setStatus(elements.bookStatus, "is-error", "Error");
      elements.preview.textContent = "No está disponible el builder del generador.";
      return;
    }

    if (!state.materia) {
      setStatus(elements.bookStatus, "is-warning", "Sin materia");
      elements.preview.textContent = "Primero carga una materia consolidada.";
      return;
    }

    try {
      state.libro = Builder.build(state.materia);
      setStatus(elements.bookStatus, "is-ok", "Generado");
      elements.preview.textContent = state.libro.libro.texto;
    } catch (error) {
      state.libro = null;
      setStatus(elements.bookStatus, "is-error", "Error");
      elements.preview.textContent = error && error.message ? error.message : String(error);
    }

    refresh(elements);
  }

  async function exportTxt(elements) {
    if (!state.libro) return;

    state.isExporting = true;
    refresh(elements);

    try {
      var result = await Storage.exportTxt(state.libro);
      setStatus(elements.bookStatus, result.ok ? "is-ok" : "is-error", result.ok ? "TXT listo" : "Error");
      elements.preview.textContent += "\n\nEXPORTACIÓN TXT";
      elements.preview.textContent += "\nRuta: " + (result.path || "sin_ruta");
      elements.preview.textContent += "\nMensaje: " + (result.message || "sin_mensaje");
    } catch (error) {
      setStatus(elements.bookStatus, "is-error", "Error TXT");
      elements.preview.textContent += "\n\nError al exportar TXT: " + (error && error.message ? error.message : String(error));
    } finally {
      state.isExporting = false;
      refresh(elements);
    }
  }

  async function exportJson(elements) {
    if (!state.libro) return;

    state.isExporting = true;
    refresh(elements);

    try {
      var result = await Storage.exportJson(state.libro);
      setStatus(elements.bookStatus, result.ok ? "is-ok" : "is-error", result.ok ? "JSON listo" : "Error");
      elements.preview.textContent += "\n\nEXPORTACIÓN JSON";
      elements.preview.textContent += "\nRuta: " + (result.path || "sin_ruta");
      elements.preview.textContent += "\nMensaje: " + (result.message || "sin_mensaje");
    } catch (error) {
      setStatus(elements.bookStatus, "is-error", "Error JSON");
      elements.preview.textContent += "\n\nError al exportar JSON: " + (error && error.message ? error.message : String(error));
    } finally {
      state.isExporting = false;
      refresh(elements);
    }
  }

  function boot() {
    Builder = window.GeneradorLibroBuilder || Builder;
    Storage = window.GeneradorLibroStorage || Storage;

    var elements = {
      savedSelect: byId("gl-saved-select"),
      loadSavedBtn: byId("gl-load-saved-btn"),
      refreshBtn: byId("gl-refresh-btn"),
      jsonInput: byId("gl-json-input"),
      jsonName: byId("gl-json-name"),
      buildBtn: byId("gl-build-btn"),
      exportTxtBtn: byId("gl-export-txt-btn"),
      exportJsonBtn: byId("gl-export-json-btn"),
      summary: byId("gl-summary"),
      preview: byId("gl-preview"),
      status: byId("gl-status"),
      bookStatus: byId("gl-book-status")
    };

    refreshSavedOptions(elements);

    elements.refreshBtn.addEventListener("click", function onRefresh() {
      refreshSavedOptions(elements);
    });

    elements.loadSavedBtn.addEventListener("click", function onLoadSaved() {
      loadSaved(elements);
    });

    elements.jsonInput.addEventListener("change", function onJsonChange() {
      var file = elements.jsonInput.files && elements.jsonInput.files.length ? elements.jsonInput.files[0] : null;
      loadJsonFile(elements, file);
    });

    elements.buildBtn.addEventListener("click", function onBuild() {
      buildBook(elements);
    });

    elements.exportTxtBtn.addEventListener("click", function onExportTxt() {
      exportTxt(elements);
    });

    elements.exportJsonBtn.addEventListener("click", function onExportJson() {
      exportJson(elements);
    });

    refresh(elements);

    window.GeneradorLibro = {
      getState: function getState() {
        return JSON.parse(JSON.stringify(state));
      }
    };
  }

  document.addEventListener("DOMContentLoaded", boot);
})(window, document);
