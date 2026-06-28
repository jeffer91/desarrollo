/* =========================================================
Nombre completo: carga-materia.main.js
Ruta o ubicación: /desarrollo/libro/carga-materia/carga-materia.main.js
Función o funciones:
1. Controlar la pantalla Carga de la materia.
2. Validar campos manuales y fuentes por archivo o texto pegado.
3. Leer Excel, PDF, TXT o texto pegado para información base, contenidos y actividades.
4. Permitir que un solo documento principal sirva como fuente completa cuando no existan archivos separados.
5. Guardar el resultado consolidado como JSON.
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

  var ALLOWED = {
    base: ["xlsx", "xls", "pdf", "txt"],
    contenidos: ["xlsx", "xls", "pdf", "txt"],
    actividades: ["xlsx", "xls", "pdf", "txt"]
  };

  var state = {
    carrera: "",
    materia: "",
    files: { base: null, contenidos: null, actividades: null },
    texts: { base: "", contenidos: "", actividades: "" },
    lecturas: { base: null, contenidos: null, actividades: null },
    interpretaciones: { base: null, contenidos: null, actividades: null },
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
    return parts.length < 2 ? "" : parts.pop().toLowerCase();
  }

  function isPdfFile(file) {
    return getExtension(file) === "pdf";
  }

  function isTextFile(file) {
    return getExtension(file) === "txt";
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
      tamanoBytes: file.size || 0,
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

  function hasText(kind) {
    return Boolean(clean(state.texts[kind]));
  }

  function hasSource(kind) {
    return Boolean(state.files[kind] && isFileAllowed(kind, state.files[kind])) || hasText(kind);
  }

  function hasMasterSource() {
    if (hasText("base")) return true;
    if (!state.files.base || !isFileAllowed("base", state.files.base)) return false;
    return isPdfFile(state.files.base) || isTextFile(state.files.base);
  }

  function hasSourceOrMaster(kind) {
    if (hasSource(kind)) return true;
    return kind !== "base" && hasMasterSource();
  }

  function buildChecklist() {
    return [
      { label: "Carrera escrita", ok: Boolean(state.carrera) },
      { label: "Materia escrita", ok: Boolean(state.materia) },
      { label: "Información base agregada", ok: hasSource("base") },
      { label: "Contenido de unidades agregado", ok: hasSourceOrMaster("contenidos") },
      { label: "Actividades agregadas", ok: hasSourceOrMaster("actividades") }
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
    return lectura.ok ? "Leído" : "Error";
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
    var usingMaster = kind !== "base" && !hasSource(kind) && hasMasterSource();

    if (!file && !hasText(kind) && !usingMaster) {
      setStatus(status, "is-pending", "Pendiente");
      if (name) name.textContent = "Excel, PDF o TXT.";
      return;
    }

    if (file && !isFileAllowed(kind, file)) {
      setStatus(status, "is-error", "Formato no válido");
      if (name) name.textContent = file.name + " · formato no permitido";
      return;
    }

    if (lecturaTexto === "Leído") {
      setStatus(status, "is-ok", isInterpreted(kind) ? "Interpretado" : "Leído");
    } else if (lecturaTexto === "Error") {
      setStatus(status, "is-error", "Error");
    } else if (usingMaster) {
      setStatus(status, "is-ok", "Desde documento principal");
    } else {
      setStatus(status, "is-ok", file ? "Archivo listo" : "Texto listo");
    }

    if (name) {
      if (file) {
        name.textContent = file.name + " · " + formatSize(file.size);
      } else if (usingMaster) {
        name.textContent = "Se usará información base.";
      } else {
        name.textContent = "Texto pegado.";
      }
    }
  }

  function renderChecklist(elements) {
    elements.checklist.innerHTML = "";
    buildChecklist().forEach(function renderItem(item) {
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

  function extractUnit(value) {
    var raw = clean(value);
    var code = raw.match(/(^|\s|\|)([1-4](?:\.\d+){1,5})(?=\s|\||$)/);
    if (code && code[2]) return Number(String(code[2]).split(".")[0]);
    var unit = raw.toLowerCase().match(/unidad\s*([1-4])/);
    if (unit && unit[1]) return Number(unit[1]);
    return null;
  }

  function extractCode(value) {
    var match = clean(value).match(/(^|\s|\|)([1-4](?:\.\d+){1,5})(?=\s|\||$)/);
    return match && match[2] ? match[2] : "";
  }

  function linesFromText(value) {
    return clean(value)
      .split(/\n+/)
      .map(function mapLine(line) { return clean(line); })
      .filter(Boolean);
  }

  function rowsFromText(kind, value) {
    return linesFromText(value).map(function mapLine(line, index) {
      var unidad = extractUnit(line);
      var codigo = extractCode(line);

      if (kind === "contenidos") {
        return {
          Unidad: unidad || "",
          Codigo: codigo,
          Contenido: line,
          Texto: line,
          Orden: index + 1
        };
      }

      return {
        Unidad: unidad || "",
        Codigo: codigo,
        Actividad: line,
        Texto: line,
        Orden: index + 1
      };
    });
  }

  function textToReading(kind, value, meta, origin) {
    var content = clean(value);
    var sourceMeta = meta || {
      nombre: origin || "texto-pegado",
      extension: "txt",
      tamanoBytes: content.length,
      ultimaModificacion: new Date().toISOString()
    };

    if (kind === "base") {
      return {
        ok: true,
        tipo: "pdf",
        kind: "base",
        origen: origin || "texto",
        archivo: sourceMeta,
        totalPaginas: 1,
        caracteresTexto: content.length,
        textoCompleto: content,
        paginas: [{ pagina: 1, texto: content, caracteres: content.length }],
        vistaPrevia: content.slice(0, 5000)
      };
    }

    var rows = rowsFromText(kind, content);
    var columns = kind === "contenidos" ? ["Unidad", "Codigo", "Contenido", "Texto", "Orden"] : ["Unidad", "Codigo", "Actividad", "Texto", "Orden"];

    return {
      ok: true,
      tipo: "excel",
      kind: kind,
      origen: origin || "texto",
      archivo: sourceMeta,
      totalHojas: 1,
      hojaPrincipal: "Texto pegado",
      resumen: { hojas: 1, filas: rows.length, columnas: columns.length },
      hojas: [{
        nombreHoja: "Texto pegado",
        totalFilas: rows.length,
        totalFilasConDatos: rows.length,
        totalColumnas: columns.length,
        columnas: columns,
        columnasDetectadas: {},
        filas: rows,
        vistaPrevia: rows.slice(0, 8)
      }]
    };
  }

  function readFileAsText(file) {
    return new Promise(function promiseRead(resolve, reject) {
      var reader = new FileReader();
      reader.onload = function onLoad(event) {
        resolve(String(event.target.result || ""));
      };
      reader.onerror = function onError() {
        reject(new Error("No se pudo leer el archivo de texto: " + (file ? file.name : "sin nombre")));
      };
      reader.readAsText(file, "utf-8");
    });
  }

  async function readFileSource(kind, file) {
    if (isTextFile(file)) {
      var textContent = await readFileAsText(file);
      return textToReading(kind, textContent, fileToMeta(file), "archivo_txt");
    }

    if (isPdfFile(file)) {
      if (!ExcelReader || typeof ExcelReader.readFileForKind !== "function") {
        throw new Error("No está disponible el lector PDF.");
      }

      var pdfReading = await ExcelReader.readFileForKind(file, kind);
      if (kind === "base") return pdfReading;
      return textToReading(kind, pdfReading.textoCompleto || pdfReading.vistaPrevia || "", pdfReading.archivo, "archivo_pdf");
    }

    if (isExcelFile(file)) {
      if (!ExcelReader || typeof ExcelReader.readFileForKind !== "function") {
        throw new Error("No está disponible el lector Excel.");
      }
      return ExcelReader.readFileForKind(file, kind);
    }

    throw new Error("Formato no permitido: " + (file ? file.name : "sin archivo"));
  }

  function resumenLecturaParaPreview(lectura) {
    if (!lectura) return null;
    if (lectura.tipo === "pdf") {
      return { tipo: "pdf", archivo: lectura.archivo, totalPaginas: lectura.totalPaginas || 0, caracteresTexto: lectura.caracteresTexto || 0, vistaPrevia: lectura.vistaPrevia || "" };
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
    return { tipoFuente: interpretacion.tipoFuente, campos: interpretacion.campos, conteo: interpretacion.conteo, advertencias: interpretacion.advertencias, evidencia: interpretacion.evidencia };
  }

  function resumenInterpretacionContenidos(interpretacion) {
    if (!interpretacion) return null;
    return { tipoFuente: interpretacion.tipoFuente, hojaPrincipal: interpretacion.hojaPrincipal, columnasDetectadas: interpretacion.columnasDetectadas, unidades: interpretacion.unidades, sinUnidad: interpretacion.sinUnidad, resumen: interpretacion.resumen, advertencias: interpretacion.advertencias, reglas: interpretacion.reglas };
  }

  function resumenInterpretacionActividades(interpretacion) {
    if (!interpretacion) return null;
    return { tipoFuente: interpretacion.tipoFuente, hojaPrincipal: interpretacion.hojaPrincipal, columnasDetectadas: interpretacion.columnasDetectadas, unidades: interpretacion.unidades, sinUnidad: interpretacion.sinUnidad, resumen: interpretacion.resumen, advertencias: interpretacion.advertencias, reglas: interpretacion.reglas };
  }

  function updatePreviewBeforePrepare(elements) {
    if (state.expediente) return;
    elements.previewBox.textContent = JSON.stringify({
      bloque: 4,
      estado: "esperando_proceso",
      carrera: state.carrera || "",
      materia: state.materia || "",
      fuentes: {
        base: state.files.base ? "archivo" : (hasText("base") ? "texto" : "pendiente"),
        contenidos: state.files.contenidos ? "archivo" : (hasText("contenidos") ? "texto" : (hasMasterSource() ? "desde_documento_principal" : "pendiente")),
        actividades: state.files.actividades ? "archivo" : (hasText("actividades") ? "texto" : (hasMasterSource() ? "desde_documento_principal" : "pendiente"))
      }
    }, null, 2);
  }

  function refresh(elements) {
    state.carrera = clean(elements.carreraInput.value);
    state.materia = clean(elements.materiaInput.value);
    state.texts.base = clean(elements.baseTextInput ? elements.baseTextInput.value : "");
    state.texts.contenidos = clean(elements.contenidosTextInput ? elements.contenidosTextInput.value : "");
    state.texts.actividades = clean(elements.actividadesTextInput ? elements.actividadesTextInput.value : "");

    updateManualStatus(elements);
    updateFileStatus(elements, "base");
    updateFileStatus(elements, "contenidos");
    updateFileStatus(elements, "actividades");
    renderChecklist(elements);

    elements.analizarBtn.disabled = !canPrepare() || state.isReading || state.isSaving;
    elements.analizarBtn.textContent = state.isReading ? "Procesando..." : "Procesar materia";

    if (elements.guardarBtn) {
      elements.guardarBtn.disabled = !canSave();
      elements.guardarBtn.textContent = state.isSaving ? "Guardando..." : "Guardar";
    }

    if (!state.expediente) {
      setStatus(elements.expedienteStatus, "is-pending", "Sin procesar");
      updatePreviewBeforePrepare(elements);
    }
  }

  async function readSource(kind, baseReading) {
    if (state.files[kind]) {
      return readFileSource(kind, state.files[kind]);
    }

    if (hasText(kind)) {
      return textToReading(kind, state.texts[kind], null, "texto_pegado");
    }

    if (kind !== "base" && baseReading && clean(baseReading.textoCompleto)) {
      return textToReading(kind, baseReading.textoCompleto, {
        nombre: "informacion-base-completa",
        extension: "txt",
        tamanoBytes: clean(baseReading.textoCompleto).length,
        ultimaModificacion: new Date().toISOString()
      }, "documento_principal");
    }

    throw new Error("Falta información para " + kind + ".");
  }

  async function readAllSources() {
    var base = await readSource("base", null);
    return {
      base: base,
      contenidos: await readSource("contenidos", base),
      actividades: await readSource("actividades", base)
    };
  }

  function interpretBase(lecturaBase) {
    if (!MapperBase || typeof MapperBase.interpret !== "function") throw new Error("No está disponible el mapeador de información base.");
    return MapperBase.interpret(lecturaBase);
  }

  function interpretContenidos(lecturaContenidos) {
    if (!MapperContenidos || typeof MapperContenidos.interpret !== "function") throw new Error("No está disponible el mapeador de contenidos.");
    return MapperContenidos.interpret(lecturaContenidos);
  }

  function interpretActividades(lecturaActividades) {
    if (!MapperActividades || typeof MapperActividades.interpret !== "function") throw new Error("No está disponible el mapeador de actividades.");
    return MapperActividades.interpret(lecturaActividades);
  }

  function buildMateriaConsolidada(lecturas, interpretacionBase, interpretacionContenidos, interpretacionActividades) {
    if (!Builder || typeof Builder.build !== "function") throw new Error("No está disponible el constructor de materia consolidada.");
    return Builder.build({
      carrera: state.carrera,
      materia: state.materia,
      archivos: {
        informacionBase: fileToMeta(state.files.base) || { nombre: "texto-pegado", extension: "txt" },
        contenidosUnidades: fileToMeta(state.files.contenidos) || { nombre: lecturas.contenidos.origen === "documento_principal" ? "informacion-base-completa" : "texto-pegado", extension: "txt" },
        actividadesMateria: fileToMeta(state.files.actividades) || { nombre: lecturas.actividades.origen === "documento_principal" ? "informacion-base-completa" : "texto-pegado", extension: "txt" }
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
    if (!Validator || typeof Validator.validate !== "function") throw new Error("No está disponible el validador.");
    return Validator.validate(materiaConsolidada);
  }

  function sourceName(kind, lectura) {
    if (state.files[kind]) return "archivo";
    if (hasText(kind)) return "texto";
    if (lectura && lectura.origen === "documento_principal") return "documento_principal";
    return "pendiente";
  }

  function buildExpediente(lecturas, interpretacionBase, interpretacionContenidos, interpretacionActividades, materiaConsolidada, validacion) {
    return {
      modulo: "libro",
      pantalla: "carga-materia",
      bloque: 4,
      estado: validacion.estado,
      carrera: state.carrera,
      materia: state.materia,
      fuentes: {
        informacionBase: sourceName("base", lecturas.base),
        contenidosUnidades: sourceName("contenidos", lecturas.contenidos),
        actividadesMateria: sourceName("actividades", lecturas.actividades)
      },
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
      pendienteBloque5: true,
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
    output += "\nRuta: " + (result && result.path ? result.path : "sin_ruta");
    output += "\nMensaje: " + (result && result.message ? result.message : "sin_mensaje");
    elements.previewBox.textContent = output;
  }

  function statusFromValidation(validacion) {
    if (!validacion) return { type: "is-error", text: "Error" };
    if (validacion.errores && validacion.errores.length) return { type: "is-error", text: "Incompleto" };
    if (validacion.advertencias && validacion.advertencias.length) return { type: "is-warning", text: "Con alertas" };
    return { type: "is-ok", text: "Procesado" };
  }

  async function prepareExpediente(elements) {
    if (!canPrepare()) {
      setStatus(elements.expedienteStatus, "is-warning", "Incompleto");
      elements.previewBox.textContent = "Faltan datos para procesar.";
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
    setStatus(elements.expedienteStatus, "is-warning", "Procesando");
    elements.previewBox.textContent = "Procesando materia...";
    refresh(elements);

    try {
      var lecturas = await readAllSources();
      var interpretacionBase = interpretBase(lecturas.base);
      var interpretacionContenidos = interpretContenidos(lecturas.contenidos);
      var interpretacionActividades = interpretActividades(lecturas.actividades);
      var materiaConsolidada = buildMateriaConsolidada(lecturas, interpretacionBase, interpretacionContenidos, interpretacionActividades);
      var validacion = validateMateria(materiaConsolidada);

      state.lecturas = lecturas;
      state.interpretaciones.base = interpretacionBase;
      state.interpretaciones.contenidos = interpretacionContenidos;
      state.interpretaciones.actividades = interpretacionActividades;
      state.materiaConsolidada = materiaConsolidada;
      state.validacion = validacion;
      state.expediente = buildExpediente(lecturas, interpretacionBase, interpretacionContenidos, interpretacionActividades, materiaConsolidada, validacion);

      var status = statusFromValidation(validacion);
      setStatus(elements.expedienteStatus, status.type, status.text);
      renderFinalPreview(elements, state.expediente, materiaConsolidada, validacion);
    } catch (error) {
      state.expediente = null;
      state.materiaConsolidada = null;
      state.validacion = null;
      state.guardado = null;
      setStatus(elements.expedienteStatus, "is-error", "Error");
      elements.previewBox.textContent = error && error.message ? error.message : String(error);
    } finally {
      state.isReading = false;
      refresh(elements);
    }
  }

  async function saveCurrent(elements) {
    if (!state.expediente || !state.materiaConsolidada) {
      setStatus(elements.expedienteStatus, "is-warning", "Sin guardar");
      return;
    }

    if (!Storage || typeof Storage.save !== "function") {
      setStatus(elements.expedienteStatus, "is-error", "Error");
      return;
    }

    state.isSaving = true;
    refresh(elements);

    try {
      var result = await Storage.save(state.expediente);
      state.guardado = result;
      state.expediente.guardado = result;
      setStatus(elements.expedienteStatus, result.ok ? "is-ok" : "is-error", result.ok ? "Guardado" : "Error");
      appendSaveResult(elements, result);
    } catch (error) {
      state.guardado = { ok: false, message: error && error.message ? error.message : String(error) };
      setStatus(elements.expedienteStatus, "is-error", "Error");
      appendSaveResult(elements, state.guardado);
    } finally {
      state.isSaving = false;
      refresh(elements);
    }
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

  function clearAll(elements) {
    state.carrera = "";
    state.materia = "";
    state.files.base = null;
    state.files.contenidos = null;
    state.files.actividades = null;
    state.texts.base = "";
    state.texts.contenidos = "";
    state.texts.actividades = "";
    resetLecturas();
    state.isReading = false;
    state.isSaving = false;

    elements.carreraInput.value = "";
    elements.materiaInput.value = "";
    elements.baseFileInput.value = "";
    elements.contenidosFileInput.value = "";
    elements.actividadesFileInput.value = "";
    if (elements.baseTextInput) elements.baseTextInput.value = "";
    if (elements.contenidosTextInput) elements.contenidosTextInput.value = "";
    if (elements.actividadesTextInput) elements.actividadesTextInput.value = "";

    refresh(elements);
  }

  function bindFileInput(elements, kind) {
    var input = elements[kind + "FileInput"];
    input.addEventListener("change", function onChange() {
      state.files[kind] = input.files && input.files.length ? input.files[0] : null;
      resetLecturas();
      refresh(elements);
    });
  }

  function bindTextInput(elements, kind) {
    var input = elements[kind + "TextInput"];
    if (!input) return;
    input.addEventListener("input", function onInput() {
      state.texts[kind] = clean(input.value);
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
      baseTextInput: byId("base-text-input"),
      contenidosTextInput: byId("contenidos-text-input"),
      actividadesTextInput: byId("actividades-text-input"),
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

    elements.carreraInput.addEventListener("input", function onCarreraInput() { resetLecturas(); refresh(elements); });
    elements.materiaInput.addEventListener("input", function onMateriaInput() { resetLecturas(); refresh(elements); });

    bindFileInput(elements, "base");
    bindFileInput(elements, "contenidos");
    bindFileInput(elements, "actividades");
    bindTextInput(elements, "base");
    bindTextInput(elements, "contenidos");
    bindTextInput(elements, "actividades");

    elements.analizarBtn.addEventListener("click", function onPrepareClick() { prepareExpediente(elements); });
    if (elements.guardarBtn) elements.guardarBtn.addEventListener("click", function onSaveClick() { saveCurrent(elements); });
    elements.limpiarBtn.addEventListener("click", function onClearClick() { clearAll(elements); });

    refresh(elements);

    window.LibroCargaMateria = {
      getState: function getState() {
        return JSON.parse(JSON.stringify({
          carrera: state.carrera,
          materia: state.materia,
          textos: state.texts,
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
