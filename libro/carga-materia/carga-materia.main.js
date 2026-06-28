/* =========================================================
Nombre completo: carga-materia.main.js
Ruta o ubicación: /desarrollo/libro/carga-materia/carga-materia.main.js
Función o funciones:
1. Controlar la pantalla de carga del módulo Libro.
2. Validar campos manuales: carrera y materia.
3. Validar selección de los tres archivos fuente.
4. Leer archivos Excel para detectar hojas, filas, columnas y vista previa.
5. Preparar un expediente inicial con metadatos y lecturas técnicas.
========================================================= */

(function iniciarCargaMateria(window, document) {
  "use strict";

  var Constants = window.LibroCargaMateriaConstants || null;
  var ExcelReader = window.LibroCargaMateriaExcelReader || null;

  var ALLOWED = Constants ? {
    base: Constants.getAllowedExtensions("base"),
    contenidos: Constants.getAllowedExtensions("contenidos"),
    actividades: Constants.getAllowedExtensions("actividades")
  } : {
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
    lecturas: {
      base: null,
      contenidos: null,
      actividades: null
    },
    expediente: null,
    isReading: false
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

  function isExcelFile(file) {
    var ext = getExtension(file);
    return ext === "xlsx" || ext === "xls";
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

  function buildChecklist() {
    return [
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

  function lecturaStatus(kind) {
    var lectura = state.lecturas[kind];

    if (!lectura) return null;
    if (lectura.tipo === "pdf") return "PDF pendiente";
    if (lectura.ok) return "Leído";

    return "Error";
  }

  function updateFileStatus(elements, kind) {
    var file = state.files[kind];
    var status = elements[kind + "Status"];
    var name = elements[kind + "FileName"];
    var lecturaTexto = lecturaStatus(kind);

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

    if (lecturaTexto === "Leído") {
      setStatus(status, "is-ok", "Leído");
    } else if (lecturaTexto === "PDF pendiente") {
      setStatus(status, "is-warning", "PDF pendiente");
    } else if (lecturaTexto === "Error") {
      setStatus(status, "is-error", "Error");
    } else {
      setStatus(status, "is-ok", "Cargado");
    }

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

  function resumenLecturaParaPreview(lectura) {
    if (!lectura) return null;

    if (lectura.tipo === "pdf") {
      return {
        tipo: "pdf",
        archivo: lectura.archivo,
        mensaje: lectura.mensaje,
        pendienteBloque3: true
      };
    }

    return {
      tipo: "excel",
      archivo: lectura.archivo,
      totalHojas: lectura.totalHojas,
      hojaPrincipal: lectura.hojaPrincipal,
      resumen: lectura.resumen,
      hojas: (lectura.hojas || []).map(function mapSheet(sheet) {
        return {
          nombreHoja: sheet.nombreHoja,
          totalFilas: sheet.totalFilas,
          totalFilasConDatos: sheet.totalFilasConDatos,
          totalColumnas: sheet.totalColumnas,
          columnas: sheet.columnas,
          columnasDetectadas: sheet.columnasDetectadas,
          vistaPrevia: sheet.vistaPrevia
        };
      })
    };
  }

  function updatePreviewBeforePrepare(elements) {
    if (state.expediente) return;

    elements.previewBox.textContent = JSON.stringify(
      {
        bloque: 2,
        estado: "esperando_analisis_de_archivos",
        carrera: state.carrera || "",
        materia: state.materia || "",
        archivos: {
          base: fileToMeta(state.files.base),
          contenidos: fileToMeta(state.files.contenidos),
          actividades: fileToMeta(state.files.actividades)
        },
        lecturaExcel: {
          disponible: Boolean(ExcelReader),
          pendiente: true
        },
        siguiente: "Presiona Analizar archivos para leer hojas, filas y columnas."
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

    elements.analizarBtn.disabled = !canPrepare() || state.isReading;
    elements.analizarBtn.textContent = state.isReading ? "Analizando..." : "Analizar archivos";

    if (!state.expediente) {
      setStatus(elements.expedienteStatus, "is-pending", "Sin analizar");
      updatePreviewBeforePrepare(elements);
    }
  }

  async function readAllFiles() {
    if (!ExcelReader || typeof ExcelReader.readFileForKind !== "function") {
      throw new Error("No está disponible el lector de Excel del Bloque 2.");
    }

    var lecturas = {};

    lecturas.base = await ExcelReader.readFileForKind(state.files.base, "base");
    lecturas.contenidos = await ExcelReader.readFileForKind(state.files.contenidos, "contenidos");
    lecturas.actividades = await ExcelReader.readFileForKind(state.files.actividades, "actividades");

    return lecturas;
  }

  function buildExpedienteFromLecturas(lecturas) {
    return {
      modulo: "libro",
      pantalla: "carga-materia",
      bloque: 2,
      estado: "archivos_leidos",
      carrera: state.carrera,
      materia: state.materia,
      archivos: {
        informacionBase: fileToMeta(state.files.base),
        contenidosUnidades: fileToMeta(state.files.contenidos),
        actividadesMateria: fileToMeta(state.files.actividades)
      },
      lecturas: {
        informacionBase: resumenLecturaParaPreview(lecturas.base),
        contenidosUnidades: resumenLecturaParaPreview(lecturas.contenidos),
        actividadesMateria: resumenLecturaParaPreview(lecturas.actividades)
      },
      reglas: {
        unidadesEsperadas: Constants ? Constants.RULES.unidadesEsperadas : 4,
        archivo1: "descripcion_objetivo_unidades_competencias_resultados_bibliografia_justificacion",
        archivo2: "contenidos_de_unidades",
        archivo3: "actividades_de_la_materia"
      },
      pendienteBloque3: true,
      creadoEn: new Date().toISOString()
    };
  }

  async function prepareExpediente(elements) {
    if (!canPrepare()) {
      setStatus(elements.expedienteStatus, "is-warning", "Incompleto");
      elements.previewBox.textContent = "Faltan datos o archivos para analizar.";
      return;
    }

    state.isReading = true;
    state.expediente = null;
    setStatus(elements.expedienteStatus, "is-warning", "Analizando");
    elements.previewBox.textContent = "Leyendo archivos Excel. Espera un momento...";
    refresh(elements);

    try {
      var lecturas = await readAllFiles();
      state.lecturas = lecturas;
      state.expediente = buildExpedienteFromLecturas(lecturas);

      setStatus(elements.expedienteStatus, "is-ok", "Analizado");
      elements.previewBox.textContent = JSON.stringify(state.expediente, null, 2);
    } catch (error) {
      state.expediente = null;
      setStatus(elements.expedienteStatus, "is-error", "Error");
      elements.previewBox.textContent = JSON.stringify(
        {
          bloque: 2,
          estado: "error_lectura_archivos",
          mensaje: error && error.message ? error.message : String(error)
        },
        null,
        2
      );
    } finally {
      state.isReading = false;
      refresh(elements);
    }
  }

  function clearAll(elements) {
    state.carrera = "";
    state.materia = "";
    state.files.base = null;
    state.files.contenidos = null;
    state.files.actividades = null;
    state.lecturas.base = null;
    state.lecturas.contenidos = null;
    state.lecturas.actividades = null;
    state.expediente = null;
    state.isReading = false;

    elements.carreraInput.value = "";
    elements.materiaInput.value = "";
    elements.baseFileInput.value = "";
    elements.contenidosFileInput.value = "";
    elements.actividadesFileInput.value = "";

    refresh(elements);
  }

  function resetLecturas() {
    state.lecturas.base = null;
    state.lecturas.contenidos = null;
    state.lecturas.actividades = null;
    state.expediente = null;
  }

  function bindFileInput(elements, kind) {
    var input = elements[kind + "FileInput"];

    input.addEventListener("change", function onChange() {
      state.files[kind] = input.files && input.files.length ? input.files[0] : null;
      resetLecturas();
      refresh(elements);
    });
  }

  function boot() {
    Constants = window.LibroCargaMateriaConstants || Constants;
    ExcelReader = window.LibroCargaMateriaExcelReader || ExcelReader;

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
      resetLecturas();
      refresh(elements);
    });

    elements.materiaInput.addEventListener("input", function onMateriaInput() {
      resetLecturas();
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
          lecturas: {
            base: resumenLecturaParaPreview(state.lecturas.base),
            contenidos: resumenLecturaParaPreview(state.lecturas.contenidos),
            actividades: resumenLecturaParaPreview(state.lecturas.actividades)
          },
          expediente: state.expediente
        }));
      }
    };
  }

  document.addEventListener("DOMContentLoaded", boot);
})(window, document);
