/* =========================================================
Nombre completo: scan.app.js
Ruta o ubicación: /audit/scan/scan.app.js
Función o funciones:
- Iniciar la pantalla autónoma de SCAN.
- Gestionar selección, arrastre y validación del archivo ZIP.
- Ejecutar el motor real de lectura del ZIP.
- Sincronizar controles, progreso, filtros, estado y resultados.
- Evitar que un escaneo anterior sobrescriba un ZIP nuevo.
- Preparar puntos públicos para TXT, PDF y BL.
- Seguir funcionando aunque no existan Audit Menu ni Base Local.
========================================================= */

(function bootScanApp(window, document) {
  "use strict";

  window.AuditScan = window.AuditScan || {};

  var State = window.AuditScan.State;
  var Dom = window.AuditScan.Dom;
  var operationSequence = 0;

  if (!State || !Dom) {
    console.error("SCAN no pudo iniciar: faltan scan.state.js o scan.dom.js.");
    return;
  }

  function isZipFile(file) {
    if (!file || typeof file.name !== "string") return false;
    return /\.zip$/i.test(file.name.trim());
  }

  function buildFileRecord(file) {
    return {
      raw: file,
      name: file.name || "archivo.zip",
      size: Number(file.size) || 0,
      type: file.type || "application/zip",
      lastModified: Number(file.lastModified) || Date.now()
    };
  }

  function resetFileInput() {
    var input = Dom.$("scanFileInput");
    if (input) input.value = "";
  }

  function cancelActiveEngine() {
    var engine = window.AuditScan.Engine;
    if (!engine || typeof engine.cancel !== "function") return false;

    try {
      return engine.cancel();
    } catch (error) {
      console.warn("No fue posible cancelar el motor de SCAN.", error);
      return false;
    }
  }

  function selectFile(file) {
    if (!file) return;

    operationSequence += 1;
    cancelActiveEngine();

    if (!isZipFile(file)) {
      resetFileInput();
      State.patch({
        file: null,
        status: "error",
        statusMessage: "El archivo seleccionado no es un ZIP válido.",
        error: "Seleccione un archivo cuyo nombre termine en .zip.",
        progress: 0,
        progressLabel: "Archivo rechazado",
        entries: [],
        metadata: null
      });
      return;
    }

    var record = buildFileRecord(file);
    var largeNotice = record.size >= 1024 * 1024 * 1024
      ? " Archivo grande detectado; el procesamiento puede requerir más memoria."
      : "";

    State.patch({
      file: record,
      status: "ready",
      statusMessage: "ZIP preparado: " + record.name + "." + largeNotice,
      error: "",
      progress: 0,
      progressLabel: "Listo para iniciar",
      entries: [],
      metadata: null,
      summary: {
        files: 0,
        folders: 0,
        totalSize: 0,
        compressedSize: 0,
        alerts: 0,
        emptyFiles: 0,
        unsafePaths: 0,
        duplicatePaths: 0,
        maxDepth: 0
      }
    });

    window.dispatchEvent(new CustomEvent("audit-scan:file-selected", {
      detail: { file: file, metadata: record }
    }));
  }

  function clearScan() {
    operationSequence += 1;
    cancelActiveEngine();
    resetFileInput();
    State.reset();

    var search = Dom.$("scanSearchInput");
    var type = Dom.$("scanTypeFilter");
    if (search) search.value = "";
    if (type) type.value = "all";
  }

  async function startScan() {
    var current = State.get();
    if (!current.file || !current.file.raw) return;

    var engine = window.AuditScan.Engine;

    if (!engine || typeof engine.scan !== "function") {
      State.patch({
        status: "error",
        statusMessage: "El motor ZIP no está disponible.",
        progress: 0,
        progressLabel: "Motor no disponible",
        error: "Verifique que scan.model.js, scan.zip.js y scan.engine.js estén cargados."
      });
      return;
    }

    operationSequence += 1;
    var operationId = operationSequence;

    State.patch({
      status: "running",
      statusMessage: "Analizando el contenido del ZIP...",
      progress: 0,
      progressLabel: "Preparando lectura",
      entries: [],
      metadata: null,
      summary: {
        files: 0,
        folders: 0,
        totalSize: 0,
        compressedSize: 0,
        alerts: 0,
        emptyFiles: 0,
        unsafePaths: 0,
        duplicatePaths: 0,
        maxDepth: 0
      },
      error: ""
    });

    try {
      var result = await engine.scan(current.file.raw, {
        onProgress: function onProgress(progress) {
          if (operationId !== operationSequence) return;

          progress = progress || {};
          State.patch({
            status: "running",
            statusMessage: "Analizando el contenido del ZIP...",
            progress: Number(progress.value) || 0,
            progressLabel: progress.label || "Procesando"
          });
        }
      });

      if (operationId !== operationSequence) return;

      result = result || {};
      var entries = Array.isArray(result.entries) ? result.entries : [];
      var summary = result.summary || {};

      State.patch({
        status: "completed",
        statusMessage: "Escaneo completado: " + entries.length + " elementos registrados.",
        progress: 100,
        progressLabel: "Completado",
        entries: entries,
        metadata: result.metadata || null,
        summary: summary,
        error: ""
      });

      window.dispatchEvent(new CustomEvent("audit-scan:completed", {
        detail: {
          entries: entries,
          summary: summary,
          metadata: result.metadata || null
        }
      }));
    } catch (error) {
      if (operationId !== operationSequence) return;

      if (error && error.name === "ScanCancelledError") {
        State.patch({
          status: "ready",
          statusMessage: "Escaneo cancelado. El ZIP continúa preparado.",
          progressLabel: "Cancelado",
          error: ""
        });
        return;
      }

      State.patch({
        status: "error",
        statusMessage: "No fue posible completar el escaneo.",
        progressLabel: "Error",
        error: error && error.message ? error.message : "Ocurrió un error inesperado al analizar el ZIP."
      });
    }
  }

  function cancelScan() {
    operationSequence += 1;
    var cancelled = cancelActiveEngine();

    State.patch({
      status: "ready",
      statusMessage: cancelled
        ? "Escaneo cancelado. El ZIP continúa preparado."
        : "No existe un escaneo activo para cancelar.",
      progressLabel: cancelled ? "Cancelado" : "Sin proceso activo",
      error: ""
    });
  }

  function requestAction(actionName, eventName) {
    var current = State.get();
    if (!current.entries.length) return;

    var handled = false;
    var detail = {
      state: current,
      markHandled: function markHandled() {
        handled = true;
      }
    };

    window.dispatchEvent(new CustomEvent(eventName, { detail: detail }));

    window.setTimeout(function reportMissingHandler() {
      if (handled) return;

      State.patch({
        status: "completed",
        statusMessage: actionName + " estará disponible al integrar su generador correspondiente.",
        error: ""
      });
    }, 0);
  }

  function openPreviousScreen() {
    if (window.parent && window.parent !== window) {
      try {
        window.parent.location.href = new URL("../../index.html", window.parent.location.href).href;
        return;
      } catch (error) {
        // Si el iframe está aislado, se intenta navegación local.
      }
    }

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = "../menu/menu.index.html#scan";
  }

  function bindDropZone() {
    var zone = Dom.$("scanDropZone");
    var input = Dom.$("scanFileInput");
    if (!zone || !input) return;

    zone.addEventListener("click", function openPicker() {
      input.click();
    });

    zone.addEventListener("keydown", function openPickerWithKeyboard(event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      input.click();
    });

    input.addEventListener("change", function onFileChange() {
      selectFile(input.files && input.files[0]);
    });

    zone.addEventListener("dragenter", function onDragEnter(event) {
      event.preventDefault();
      event.stopPropagation();
      zone.classList.add("is-dragover");
    });

    zone.addEventListener("dragover", function onDragOver(event) {
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      zone.classList.add("is-dragover");
    });

    zone.addEventListener("dragleave", function onDragLeave(event) {
      event.preventDefault();
      event.stopPropagation();

      var nextTarget = event.relatedTarget;
      if (!nextTarget || !zone.contains(nextTarget)) {
        zone.classList.remove("is-dragover");
      }
    });

    zone.addEventListener("drop", function onDrop(event) {
      event.preventDefault();
      event.stopPropagation();
      zone.classList.remove("is-dragover");

      var files = event.dataTransfer && event.dataTransfer.files;
      if (!files || !files.length) return;

      if (files.length > 1) {
        State.patch({
          status: "error",
          statusMessage: "Solo se puede preparar un ZIP por escaneo.",
          error: "Arrastre únicamente un archivo ZIP."
        });
        return;
      }

      selectFile(files[0]);
    });
  }

  function bindControls() {
    var start = Dom.$("scanStartButton");
    var cancel = Dom.$("scanCancelButton");
    var clear = Dom.$("scanClearButton");
    var back = Dom.$("scanBackButton");
    var search = Dom.$("scanSearchInput");
    var type = Dom.$("scanTypeFilter");
    var txt = Dom.$("scanExportTxtButton");
    var pdf = Dom.$("scanExportPdfButton");
    var bl = Dom.$("scanSaveBlButton");

    if (start) start.addEventListener("click", startScan);
    if (cancel) cancel.addEventListener("click", cancelScan);
    if (clear) clear.addEventListener("click", clearScan);
    if (back) back.addEventListener("click", openPreviousScreen);

    if (search) {
      search.addEventListener("input", function updateSearch() {
        State.patch({ filters: { search: search.value || "" } });
      });
    }

    if (type) {
      type.addEventListener("change", function updateType() {
        State.patch({ filters: { type: type.value || "all" } });
      });
    }

    if (txt) txt.addEventListener("click", function requestTxt() {
      requestAction("La exportación TXT", "audit-scan:export-txt");
    });

    if (pdf) pdf.addEventListener("click", function requestPdf() {
      requestAction("La exportación PDF", "audit-scan:export-pdf");
    });

    if (bl) bl.addEventListener("click", function requestBl() {
      requestAction("El guardado en BL", "audit-scan:save-bl");
    });
  }

  function boot() {
    bindDropZone();
    bindControls();
    State.subscribe(Dom.render);

    window.dispatchEvent(new CustomEvent("audit-scan:ready", {
      detail: { version: "1.1.0", standalone: true }
    }));
  }

  window.AuditScan.App = {
    selectFile: selectFile,
    start: startScan,
    cancel: cancelScan,
    clear: clearScan,
    getState: State.get
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})(window, document);
