/* =========================================================
Nombre completo: carga-materia.main.js
Ruta o ubicación: /desarrollo/libro/carga-materia/carga-materia.main.js
Función o funciones:
1. Controlar la primera pantalla de carga del módulo Libro.
2. Validar campos manuales: carrera y materia.
3. Validar selección de los tres archivos fuente.
4. Preparar un expediente inicial con metadatos de carga.
5. Dejar lista la pantalla para conectar el lector inteligente de Excel/PDF en el Bloque 2.
========================================================= */

(function iniciarCargaMateria(window, document) {
  "use strict";

  var ALLOWED = {
    base: ["xlsx", "xls", "pdf"],
    contenidos: ["xlsx", "xls"],
    actividades: ["xlsx", "xls"]
  };

  var state = {
    carrera: "",
    materia: "",
    files: {
      base: null,
      contenidos: null,
      actividades: null
    },
    expediente: null
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function clean(value) {
    return String(value == null ? "" : value).trim();
  }

  function getExtension(file) {
    var name = file && file.name ? String(file.name) : "";
    var parts = name.split(".");

    if (parts.length < 2) return "";

    return parts.pop().toLowerCase();
  }

  function formatSize(bytes) {
    var value = Number(bytes || 0);

    if (!value) return "0 KB";
    if (value < 1024) return value + " B";
    if (value < 1024 * 1024) return (value / 1024).toFixed(1) + " KB";

    return (value / (1024 * 1024)).toFixed(2) + " MB";
  }

  function fileToMeta(file) {
    if (!file) return null;

    return {
      nombre: file.name,
      extension: getExtension(file),
      tamano: formatSize(file.size),
      tipo: file.type || "No detectado",
      ultimaModificacion: file.lastModified ? new Date(file.lastModified).toISOString() : null
    };
  }

  function setStatus(element, type, text) {
    if (!element) return;

    element.classList.remove("is-pending", "is-ok", "is-warning", "is-error");
    element.classList.add(type || "is-pending");
    element.textContent = text || "Pendiente";
  }

  function isFileAllowed(kind, file) {
    if (!file) return false;

    var extension = getExtension(file);
    return ALLOWED[kind].indexOf(extension) >= 0;
  }

  function fileLabel(kind) {
    if (kind === "base") return "Archivo 1: información base";
    if (kind === "contenidos") return "Archivo 2: contenidos de unidades";
    if (kind === "actividades") return "Archivo 3: actividades";
    return "Archivo";
  }

  function buildChecklist() {
    var checks = [
      {
        label: "Carrera escrita",
        ok: Boolean(state.carrera)
      },
      {
        label: "Materia escrita",
        ok: Boolean(state.materia)
      },
      {
        label: "Archivo 1 cargado",
        ok: Boolean(state.files.base) && isFileAllowed("base", state.files.base)
      },
      {
        label: "Archivo 2 cargado",
        ok: Boolean(state.files.contenidos) && isFileAllowed("contenidos", state.files.contenidos)
      },
      {
        label: "Archivo 3 cargado",
        ok: Boolean(state.files.actividades) && isFileAllowed("actividades", state.files.actividades)
      }
    ];

    return checks;
  }

  function canPrepare() {
    return buildChecklist().every(function everyCheck(item) {
      return item.ok;
    });
  }

  function updateManualStatus(elements) {
    var complete = Boolean(state.carrera && state.materia);
    setStatus(
      elements.manualStatus,
      complete ? "is-ok" : "is-pending",
      complete ? "Completo" : "Pendiente"
    );
  }

  function updateFileStatus(elements, kind) {
    var file = state.files[kind];
    var status = elements[kind + "Status"];
    var name = elements[kind + "FileName"];

    if (!file) {
      setStatus(status, "is-pending", "Pendiente");
      if (name) name.textContent = "Ningún archivo seleccionado.";
      return;
    }

    if (!isFileAllowed(kind, file)) {
      setStatus(status, "is-error", "Formato no válido");
      if (name) {
        name.textContent = file.name + " · formato no permitido";
      }
      return;
    }

    setStatus(status, "is-ok", "Cargado");
    if (name) {
      name.textContent = file.name + " · " + formatSize(file.size);
    }
  }

  function renderChecklist(elements) {
    var checklist = buildChecklist();
    elements.checklist.innerHTML = "";

    checklist.forEach(function renderItem(item) {
      var li = document.createElement("li");
      var label = document.createElement("strong");
      var badge = document.createElement("span");

      label.textContent = item.label;
      badge.className = "libro-status-pill " + (item.ok ? "is-ok" : "is-pending");
      badge.textContent = item.ok ? "Listo" : "Pendiente";

      li.appendChild(label);
      li.appendChild(badge);
      elements.checklist.appendChild(li);
    });
  }

  function updatePreviewBeforePrepare(elements) {
    if (state.expediente) return;

    elements.previewBox.textContent = JSON.stringify(
      {
        bloque: 1,
        estado: "pantalla_base_lista",
        carrera: state.carrera || "",
        materia: state.materia || "",
        archivos: {
          base: fileToMeta(state.files.base),
          contenidos: fileToMeta(state.files.contenidos),
          actividades: fileToMeta(state.files.actividades)
        },
        siguiente: "Bloque 2: lector de Excel"
      },
      null,
      2
    );
  }

  function refresh(elements) {
    state.carrera = clean(elements.carreraInput.value);
    state.materia = clean(elements.materiaInput.value);

    updateManualStatus(elements);
    updateFileStatus(elements, "base");
    updateFileStatus(elements, "contenidos");
    updateFileStatus(elements, "actividades");
    renderChecklist(elements);

    elements.analizarBtn.disabled = !canPrepare();

    if (!state.expediente) {
      setStatus(elements.expedienteStatus, "is-pending", "Sin preparar");
      updatePreviewBeforePrepare(elements);
    }
  }

  function prepareExpediente(elements) {
    if (!canPrepare()) {
      setStatus(elements.expedienteStatus, "is-warning", "Incompleto");
      elements.previewBox.textContent = "Faltan datos o archivos para preparar el expediente inicial.";
      return;
    }

    state.expediente = {
      modulo: "libro",
      pantalla: "carga-materia",
      bloque: 1,
      estado: "expediente_inicial_preparado",
      carrera: state.carrera,
      materia: state.materia,
      archivos: {
        informacionBase: fileToMeta(state.files.base),
        contenidosUnidades: fileToMeta(state.files.contenidos),
        actividadesMateria: fileToMeta(state.files.actividades)
      },
      reglas: {
        unidadesEsperadas: 4,
        archivo1: "descripcion_objetivo_unidades_competencias_resultados_bibliografia_justificacion",
        archivo2: "contenidos_de_unidades",
        archivo3: "actividades_de_la_materia"
      },
      pendienteBloque2: true,
      creadoEn: new Date().toISOString()
    };

    setStatus(elements.expedienteStatus, "is-ok", "Preparado");
    elements.previewBox.textContent = JSON.stringify(state.expediente, null, 2);
  }

  function clearAll(elements) {
    state.carrera = "";
    state.materia = "";
    state.files.base = null;
    state.files.contenidos = null;
    state.files.actividades = null;
    state.expediente = null;

    elements.carreraInput.value = "";
    elements.materiaInput.value = "";
    elements.baseFileInput.value = "";
    elements.contenidosFileInput.value = "";
    elements.actividadesFileInput.value = "";

    refresh(elements);
  }

  function bindFileInput(elements, kind) {
    var input = elements[kind + "FileInput"];

    input.addEventListener("change", function onChange() {
      state.files[kind] = input.files && input.files.length ? input.files[0] : null;
      state.expediente = null;
      refresh(elements);
    });
  }

  function boot() {
    var elements = {
      carreraInput: byId("carrera-input"),
      materiaInput: byId("materia-input"),
      baseFileInput: byId("base-file-input"),
      contenidosFileInput: byId("contenidos-file-input"),
      actividadesFileInput: byId("actividades-file-input"),
      manualStatus: byId("manual-status"),
      baseStatus: byId("base-status"),
      contenidosStatus: byId("contenidos-status"),
      actividadesStatus: byId("actividades-status"),
      baseFileName: byId("base-file-name"),
      contenidosFileName: byId("contenidos-file-name"),
      actividadesFileName: byId("actividades-file-name"),
      checklist: byId("checklist"),
      analizarBtn: byId("analizar-btn"),
      limpiarBtn: byId("limpiar-btn"),
      previewBox: byId("preview-box"),
      expedienteStatus: byId("expediente-status")
    };

    elements.carreraInput.addEventListener("input", function onCarreraInput() {
      state.expediente = null;
      refresh(elements);
    });

    elements.materiaInput.addEventListener("input", function onMateriaInput() {
      state.expediente = null;
      refresh(elements);
    });

    bindFileInput(elements, "base");
    bindFileInput(elements, "contenidos");
    bindFileInput(elements, "actividades");

    elements.analizarBtn.addEventListener("click", function onPrepareClick() {
      prepareExpediente(elements);
    });

    elements.limpiarBtn.addEventListener("click", function onClearClick() {
      clearAll(elements);
    });

    refresh(elements);

    window.LibroCargaMateria = {
      getState: function getState() {
        return JSON.parse(JSON.stringify({
          carrera: state.carrera,
          materia: state.materia,
          expediente: state.expediente
        }));
      }
    };
  }

  document.addEventListener("DOMContentLoaded", boot);
})(window, document);
