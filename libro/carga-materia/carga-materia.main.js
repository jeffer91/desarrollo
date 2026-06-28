/* =========================================================
Nombre completo: carga-materia.main.js
Ruta o ubicación: /desarrollo/libro/carga-materia/carga-materia.main.js
Función o funciones:
1. Controlar la pantalla de carga del módulo Libro.
2. Validar campos manuales y archivos fuente.
3. Leer, interpretar, consolidar y validar los tres archivos fuente.
4. Mostrar una vista previa legible de la materia consolidada.
5. Guardar el resultado consolidado como JSON en el Bloque 8.
========================================================= */

(function iniciarCargaMateria(window, document) {
  "use strict";

  var Constants = window.LibroCargaMateriaConstants || null;
  var ExcelReader = window.LibroCargaMateriaExcelReader || null;
  var MapperBase = window.LibroCargaMateriaMapperBase || null;
  var MapperContenidos = window.LibroCargaMateriaMapperContenidos || null;
  var MapperActividades = window.LibroCargaMateriaMapperActividades || null;
  var Builder = window.LibroCargaMateriaBuilder || null;
  var Validator = window.LibroCargaMateriaValidator || null;
  var Preview = window.LibroCargaMateriaPreview || null;
  var Storage = window.LibroCargaMateriaStorage || null;

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
    interpretaciones: {
      base: null,
      contenidos: null,
      actividades: null
    },
    materiaConsolidada: null,
    validacion: null,
    guardado: null,
    expediente: null,
    isReading: false,
    isSaving: false
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
    return ALLOWED[kind].indexOf(getExtension(file)) >= 0;
  }

  function buildChecklist() {
    return [
      { label: "Carrera escrita", ok: Boolean(state.carrera) },
      { label: "Materia escrita", ok: Boolean(state.materia) },
      { label: "Archivo 1 cargado", ok: Boolean(state.files.base) && isFileAllowed("base", state.files.base) },
      { label: "Archivo 2 cargado", ok: Boolean(state.files.contenidos) && isFileAllowed("contenidos", state.files.contenidos) },
      { label: "Archivo 3 cargado", ok: Boolean(state.files.actividades) && isFileAllowed("actividades", state.files.actividades) }
    ];
  }

  function canPrepare() {
    return buildChecklist().every(function everyCheck(item) {
      return item.ok;
    });
  }

  function canSave() {
    return Boolean(state.expediente && state.materiaConsolidada && state.validacion) && !state.isReading && !state.isSaving;
  }

  function updateManualStatus(elements) {
    var complete = Boolean(state.carrera && state.materia);
    setStatus(elements.manualStatus, complete ? "is-ok" : "is-pending", complete ? "Completo" : "Pendiente");
  }

  function lecturaStatus(kind) {
    var lectura = state.lecturas[kind];
    if (!lectura) return null;
    if (lectura.ok) return "Leído";
    return "Error";
  }

  function isInterpreted(kind) {
    if (kind === "base") return Boolean(state.interpretaciones.base);
    if (kind === "contenidos") return Boolean(state.interpretaciones.contenidos);
    if (kind === "actividades") return Boolean(state.interpretaciones.actividades);
    return false;
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
      if (name) name.textContent = file.name + " · formato no permitido";
      return;
    }

    if (lecturaTexto === "Leído") {
      setStatus(status, "is-ok", isInterpreted(kind) ? "Interpretado" : "Leído");
    } else if (lecturaTexto === "Error") {
      setStatus(status, "is-error", "Error");
    } else {
      setStatus(status, "is-ok", "Cargado");
    }

    if (name) name.textContent = file.name + " · " + formatSize(file.size);
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
        totalPaginas: lectura.totalPaginas || 0,
        caracteresTexto: lectura.caracteresTexto || 0,
        vistaPrevia: lectura.vistaPrevia || ""
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

  function resumenInterpretacionBase(interpretacion) {
    if (!interpretacion) return null;
    return {
      tipoFuente: interpretacion.tipoFuente,
      campos: interpretacion.campos,
      conteo: interpretacion.conteo,
      advertencias: interpretacion.advertencias,
      evidencia: interpretacion.evidencia
    };
  }

  function resumenInterpretacionContenidos(interpretacion) {
    if (!interpretacion) return null;
    return {
      tipoFuente: interpretacion.tipoFuente,
      hojaPrincipal: interpretacion.hojaPrincipal,
      columnasDetectadas: interpretacion.columnasDetectadas,
      unidades: interpretacion.unidades,
      sinUnidad: interpretacion.sinUnidad,
      resumen: interpretacion.resumen,
      advertencias: interpretacion.advertencias,
      reglas: interpretacion.reglas
    };
  }

  function resumenInterpretacionActividades(interpretacion) {
    if (!interpretacion) return null;
    return {
      tipoFuente: interpretacion.tipoFuente,
      hojaPrincipal: interpretacion.hojaPrincipal,
      columnasDetectadas: interpretacion.columnasDetectadas,
      unidades: interpretacion.unidades,
      sinUnidad: interpretacion.sinUnidad,
      resumen: interpretacion.resumen,
      advertencias: interpretacion.advertencias,
      reglas: interpretacion.reglas
    };
  }

  function updatePreviewBeforePrepare(elements) {
    if (state.expediente) return;

    elements.previewBox.textContent = JSON.stringify(
      {
        bloque: 8,
        estado: "esperando_validacion_y_guardado",
        carrera: state.carrera || "",
        materia: state.materia || "",
        archivos: {
          base: fileToMeta(state.files.base),
          contenidos: fileToMeta(state.files.contenidos),
          actividades: fileToMeta(state.files.actividades)
        },
        lectura: {
          excelDisponible: Boolean(ExcelReader),
          builderDisponible: Boolean(Builder),
          validatorDisponible: Boolean(Validator),
          previewDisponible: Boolean(Preview),
          storageDisponible: Boolean(Storage),
          pendiente: true
        },
        siguiente: "Presiona Validar materia y luego Guardar resultado."
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

    elements.analizarBtn.disabled = !canPrepare() || state.isReading || state.isSaving;
    elements.analizarBtn.textContent = state.isReading ? "Validando..." : "Validar materia";

    if (elements.guardarBtn) {
      elements.guardarBtn.disabled = !canSave();
      elements.guardarBtn.textContent = state.isSaving ? "Guardando..." : "Guardar resultado";
    }

    if (!state.expediente) {
      setStatus(elements.expedienteStatus, "is-pending", "Sin validar");
      updatePreviewBeforePrepare(elements);
    }
  }

  async function readAllFiles() {
    if (!ExcelReader || typeof ExcelReader.readFileForKind !== "function") {
      throw new Error("No está disponible el lector de archivos del Bloque 8.");
    }

    return {
      base: await ExcelReader.readFileForKind(state.files.base, "base"),
      contenidos: await ExcelReader.readFileForKind(state.files.contenidos, "contenidos"),
      actividades: await ExcelReader.readFileForKind(state.files.actividades, "actividades")
    };
  }

  function interpretBase(lecturaBase) {
    if (!MapperBase || typeof MapperBase.interpret !== "function") {
      throw new Error("No está disponible el mapeador del Archivo 1 del Bloque 8.");
    }
    return MapperBase.interpret(lecturaBase);
  }

  function interpretContenidos(lecturaContenidos) {
    if (!MapperContenidos || typeof MapperContenidos.interpret !== "function") {
      throw new Error("No está disponible el mapeador de contenidos del Bloque 8.");
    }
    return MapperContenidos.interpret(lecturaContenidos);
  }

  function interpretActividades(lecturaActividades) {
    if (!MapperActividades || typeof MapperActividades.interpret !== "function") {
      throw new Error("No está disponible el mapeador de actividades del Bloque 8.");
    }
    return MapperActividades.interpret(lecturaActividades);
  }

  function buildMateriaConsolidada(lecturas, interpretacionBase, interpretacionContenidos, interpretacionActividades) {
    if (!Builder || typeof Builder.build !== "function") {
      throw new Error("No está disponible el builder de materia consolidada del Bloque 8.");
    }

    return Builder.build({
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
      interpretacionBase: interpretacionBase,
      interpretacionContenidos: interpretacionContenidos,
      interpretacionActividades: interpretacionActividades
    });
  }

  function validateMateria(materiaConsolidada) {
    if (!Validator || typeof Validator.validate !== "function") {
      throw new Error("No está disponible el validador del Bloque 8.");
    }

    return Validator.validate(materiaConsolidada);
  }

  function buildExpediente(lecturas, interpretacionBase, interpretacionContenidos, interpretacionActividades, materiaConsolidada, validacion) {
    return {
      modulo: "libro",
      pantalla: "carga-materia",
      bloque: 8,
      estado: validacion.estado,
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
      interpretacion: {
        informacionBase: resumenInterpretacionBase(interpretacionBase),
        contenidosUnidades: resumenInterpretacionContenidos(interpretacionContenidos),
        actividadesMateria: resumenInterpretacionActividades(interpretacionActividades)
      },
      materiaConsolidada: materiaConsolidada,
      validacion: validacion,
      guardado: null,
      pendienteBloque9: true,
      creadoEn: new Date().toISOString()
    };
  }

  function renderFinalPreview(elements, expediente, materiaConsolidada, validacion) {
    if (Preview && typeof Preview.render === "function") {
      Preview.render(elements.previewBox, expediente, materiaConsolidada, validacion);
      return;
    }

    elements.previewBox.textContent = JSON.stringify(expediente, null, 2);
  }

  function appendSaveResult(elements, result) {
    var output = elements.previewBox.textContent || "";
    output += "\n\nGUARDADO";
    output += "\nEstado: " + (result && result.ok ? "Guardado" : "Error");
    output += "\nModo: " + (result && result.modo ? result.modo : "sin_modo");
    output += "\nRuta: " + (result && result.path ? result.path : "sin_ruta");
    output += "\nMensaje: " + (result && result.message ? result.message : "sin_mensaje");

    if (result && result.warning) {
      output += "\nAviso: " + result.warning;
    }

    elements.previewBox.textContent = output;
  }

  function statusFromValidation(validacion) {
    if (!validacion) return { type: "is-error", text: "Error" };
    if (validacion.errores && validacion.errores.length) return { type: "is-error", text: "Incompleto" };
    if (validacion.advertencias && validacion.advertencias.length) return { type: "is-warning", text: "Con alertas" };
    return { type: "is-ok", text: "Completo" };
  }

  async function prepareExpediente(elements) {
    if (!canPrepare()) {
      setStatus(elements.expedienteStatus, "is-warning", "Incompleto");
      elements.previewBox.textContent = "Faltan datos o archivos para validar.";
      return;
    }

    state.isReading = true;
    state.expediente = null;
    state.materiaConsolidada = null;
    state.validacion = null;
    state.guardado = null;
    state.interpretaciones.base = null;
    state.interpretaciones.contenidos = null;
    state.interpretaciones.actividades = null;
    setStatus(elements.expedienteStatus, "is-warning", "Validando");
    elements.previewBox.textContent = "Leyendo, interpretando, consolidando y validando materia. Espera un momento...";
    refresh(elements);

    try {
      var lecturas = await readAllFiles();
      var interpretacionBase = interpretBase(lecturas.base);
      var interpretacionContenidos = interpretContenidos(lecturas.contenidos);
      var interpretacionActividades = interpretActividades(lecturas.actividades);
      var materiaConsolidada = buildMateriaConsolidada(
        lecturas,
        interpretacionBase,
        interpretacionContenidos,
        interpretacionActividades
      );
      var validacion = validateMateria(materiaConsolidada);

      state.lecturas = lecturas;
      state.interpretaciones.base = interpretacionBase;
      state.interpretaciones.contenidos = interpretacionContenidos;
      state.interpretaciones.actividades = interpretacionActividades;
      state.materiaConsolidada = materiaConsolidada;
      state.validacion = validacion;
      state.expediente = buildExpediente(
        lecturas,
        interpretacionBase,
        interpretacionContenidos,
        interpretacionActividades,
        materiaConsolidada,
        validacion
      );

      var status = statusFromValidation(validacion);
      setStatus(elements.expedienteStatus, status.type, status.text);
      renderFinalPreview(elements, state.expediente, materiaConsolidada, validacion);
    } catch (error) {
      state.expediente = null;
      state.materiaConsolidada = null;
      state.validacion = null;
      state.guardado = null;
      state.interpretaciones.base = null;
      state.interpretaciones.contenidos = null;
      state.interpretaciones.actividades = null;
      setStatus(elements.expedienteStatus, "is-error", "Error");
      elements.previewBox.textContent = JSON.stringify(
        {
          bloque: 8,
          estado: "error_validacion_materia",
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

  async function saveCurrent(elements) {
    if (!state.expediente || !state.materiaConsolidada) {
      setStatus(elements.expedienteStatus, "is-warning", "Sin guardar");
      elements.previewBox.textContent += "\n\nPrimero valida la materia antes de guardar.";
      return;
    }

    if (!Storage || typeof Storage.save !== "function") {
      setStatus(elements.expedienteStatus, "is-error", "Error");
      elements.previewBox.textContent += "\n\nNo está disponible el módulo de guardado del Bloque 8.";
      return;
    }

    state.isSaving = true;
    refresh(elements);

    try {
      var result = await Storage.save(state.expediente);
      state.guardado = result;
      state.expediente.guardado = result;
      state.expediente.pendienteBloque9 = true;

      setStatus(elements.expedienteStatus, result.ok ? "is-ok" : "is-error", result.ok ? "Guardado" : "Error");
      appendSaveResult(elements, result);
    } catch (error) {
      state.guardado = {
        ok: false,
        message: error && error.message ? error.message : String(error)
      };
      setStatus(elements.expedienteStatus, "is-error", "Error");
      appendSaveResult(elements, state.guardado);
    } finally {
      state.isSaving = false;
      refresh(elements);
    }
  }

  function clearAll(elements) {
    state.carrera = "";
    state.materia = "";
    state.files.base = null;
    state.files.contenidos = null;
    state.files.actividades = null;
    resetLecturas();
    state.isReading = false;
    state.isSaving = false;

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
    state.interpretaciones.base = null;
    state.interpretaciones.contenidos = null;
    state.interpretaciones.actividades = null;
    state.materiaConsolidada = null;
    state.validacion = null;
    state.guardado = null;
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
    MapperBase = window.LibroCargaMateriaMapperBase || MapperBase;
    MapperContenidos = window.LibroCargaMateriaMapperContenidos || MapperContenidos;
    MapperActividades = window.LibroCargaMateriaMapperActividades || MapperActividades;
    Builder = window.LibroCargaMateriaBuilder || Builder;
    Validator = window.LibroCargaMateriaValidator || Validator;
    Preview = window.LibroCargaMateriaPreview || Preview;
    Storage = window.LibroCargaMateriaStorage || Storage;

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
      guardarBtn: byId("guardar-btn"),
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

    if (elements.guardarBtn) {
      elements.guardarBtn.addEventListener("click", function onSaveClick() {
        saveCurrent(elements);
      });
    }

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
          interpretaciones: {
            base: resumenInterpretacionBase(state.interpretaciones.base),
            contenidos: resumenInterpretacionContenidos(state.interpretaciones.contenidos),
            actividades: resumenInterpretacionActividades(state.interpretaciones.actividades)
          },
          materiaConsolidada: state.materiaConsolidada,
          validacion: state.validacion,
          guardado: state.guardado,
          expediente: state.expediente
        }));
      }
    };
  }

  document.addEventListener("DOMContentLoaded", boot);
})(window, document);
