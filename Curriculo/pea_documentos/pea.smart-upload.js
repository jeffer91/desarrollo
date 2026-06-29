/*
Nombre del archivo: pea.smart-upload.js
Ubicación: /Curriculo/pea_documentos/pea.smart-upload.js
Función:
- Crear carga inteligente por arrastrar y soltar para PEA
- Detectar si el usuario sube 1 Excel consolidado o 3 Excel separados
- Leer cantidad de hojas y clasificar Base, Unidades y Actividades
- Entregar los archivos clasificados a pea.app.js para guardar la versión
*/
(function (window, document) {
  "use strict";

  window.PEA = window.PEA || {};
  var PEA = window.PEA;

  var state = {
    valid: false,
    mode: "",
    files: [],
    baseFile: null,
    unidadesFile: null,
    actividadesFile: null,
    consolidadoFile: null,
    analyses: []
  };

  function el(id) { return document.getElementById(id); }
  function clean(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }
  function normalize(value) {
    return clean(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setStatus(message, type) {
    var app = PEA.app;
    var node = el("peaSmartSummary");
    if (node) {
      node.className = "pea-smart-summary" + (type ? " is-" + type : "");
      node.innerHTML = String(message || "");
    }
    if (app && typeof app.setStatus === "function") {
      app.setStatus(clean(String(message || "").replace(/<[^>]+>/g, " ")), type);
    }
  }

  function arrayBufferFromFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (event) { resolve(event.target.result); };
      reader.onerror = function () { reject(new Error("No se pudo leer: " + (file && file.name ? file.name : "archivo"))); };
      reader.readAsArrayBuffer(file);
    });
  }

  async function analyzeFile(file) {
    var buffer = await arrayBufferFromFile(file);
    var workbook = XLSX.read(buffer, { type: "array" });
    var sheetNames = workbook.SheetNames || [];
    var sheets = sheetNames.map(function (name) {
      var rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: "", raw: false });
      var sample = rows.slice(0, 18).map(function (row) { return Array.isArray(row) ? row.join(" ") : ""; }).join(" ");
      return { name: name, rowCount: rows.length, sample: sample, kind: detectKind(name + " " + sample) };
    });

    return {
      file: file,
      fileName: file.name || "archivo.xlsx",
      sheetCount: sheetNames.length,
      sheets: sheets,
      kind: detectFileKind(file.name || "", sheets)
    };
  }

  function detectKind(text) {
    var value = normalize(text);
    if (value.indexOf("pea base") >= 0 || value.indexOf("datos generales") >= 0 || value.indexOf("descripcion de la asignatura") >= 0 || value.indexOf("descripcion materia") >= 0 || value.indexOf("objetivo") >= 0 || value.indexOf("bibliografia") >= 0 || value.indexOf("competencia de asignatura") >= 0) return "base";
    if (value.indexOf("unidad") >= 0 || value.indexOf("resultado de aprendizaje") >= 0 || value.indexOf("contenidos") >= 0 || value.indexOf("subcontenido") >= 0) return "unidades";
    if (value.indexOf("actividad") >= 0 || value.indexOf("taller") >= 0 || value.indexOf("proyecto final") >= 0 || value.indexOf("trabajo autonomo") >= 0 || value.indexOf("trabajo autónomo") >= 0 || value.indexOf("mecanismo") >= 0) return "actividades";
    return "";
  }

  function detectFileKind(fileName, sheets) {
    var byName = detectKind(fileName);
    var counts = { base: 0, unidades: 0, actividades: 0 };
    var best = "";
    var bestCount = 0;

    if (byName) return byName;

    (sheets || []).forEach(function (sheet) {
      if (sheet.kind && counts.hasOwnProperty(sheet.kind)) counts[sheet.kind] += 1;
    });

    Object.keys(counts).forEach(function (key) {
      if (counts[key] > bestCount) {
        best = key;
        bestCount = counts[key];
      }
    });

    return best;
  }

  function resetState() {
    state.valid = false;
    state.mode = "";
    state.files = [];
    state.baseFile = null;
    state.unidadesFile = null;
    state.actividadesFile = null;
    state.consolidadoFile = null;
    state.analyses = [];
  }

  function setMode(mode) {
    var radios = document.querySelectorAll('input[name="peaModoCarga"]');
    Array.prototype.slice.call(radios).forEach(function (radio) {
      radio.checked = radio.value === mode;
    });
  }

  function classifyTriple(analyses) {
    var map = { base: null, unidades: null, actividades: null };
    var used = [];
    var fallback = false;

    analyses.forEach(function (analysis, index) {
      if (analysis.kind && map.hasOwnProperty(analysis.kind) && !map[analysis.kind]) {
        map[analysis.kind] = analysis.file;
        used.push(index);
      }
    });

    if (!map.base || !map.unidades || !map.actividades) {
      fallback = true;
      map.base = map.base || analyses[0].file;
      map.unidades = map.unidades || analyses[1].file;
      map.actividades = map.actividades || analyses[2].file;
    }

    return { map: map, fallback: fallback };
  }

  function consolidatedCounts(analysis) {
    var counts = { base: 0, unidades: 0, actividades: 0, sinClasificar: 0 };
    (analysis.sheets || []).forEach(function (sheet) {
      if (sheet.kind && counts.hasOwnProperty(sheet.kind)) counts[sheet.kind] += 1;
      else counts.sinClasificar += 1;
    });
    return counts;
  }

  function renderFileList(analyses) {
    return '<div class="pea-smart-files">' + analyses.map(function (analysis) {
      return '<div class="pea-smart-file"><strong>' + esc(analysis.fileName) + '</strong><span>' + esc(String(analysis.sheetCount)) + ' hojas' + (analysis.kind ? ' · ' + esc(labelKind(analysis.kind)) : '') + '</span></div>';
    }).join("") + '</div>';
  }

  function labelKind(kind) {
    if (kind === "base") return "Base";
    if (kind === "unidades") return "Unidades";
    if (kind === "actividades") return "Actividades";
    return "Sin clasificar";
  }

  async function processFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []).filter(function (file) {
      return /\.(xlsx|xls)$/i.test(file && file.name || "");
    });
    var analyses;
    var triple;
    var counts;

    resetState();

    if (!files.length) {
      setStatus("Arrastra o selecciona archivos Excel.", "warn");
      return;
    }

    if (files.length !== 1 && files.length !== 3) {
      setStatus("Carga inteligente: usa 1 Excel consolidado o 3 Excel separados.", "error");
      return;
    }

    setStatus("Leyendo hojas de Excel...", "");
    analyses = await Promise.all(files.map(analyzeFile));
    state.files = files;
    state.analyses = analyses;

    if (files.length === 1) {
      state.valid = true;
      state.mode = "consolidado";
      state.consolidadoFile = files[0];
      setMode("consolidado");
      counts = consolidatedCounts(analyses[0]);
      setStatus(
        '<b>Excel consolidado detectado.</b> ' + esc(analyses[0].sheetCount) + ' hojas leídas.' +
        '<br>Base: ' + counts.base + ' · Unidades: ' + counts.unidades + ' · Actividades: ' + counts.actividades + ' · Sin clasificar: ' + counts.sinClasificar +
        renderFileList(analyses),
        "ok"
      );
      return;
    }

    triple = classifyTriple(analyses);
    state.valid = true;
    state.mode = "triple";
    state.baseFile = triple.map.base;
    state.unidadesFile = triple.map.unidades;
    state.actividadesFile = triple.map.actividades;
    setMode("triple");

    setStatus(
      '<b>3 Excel detectados.</b> ' + (triple.fallback ? 'Se usó el orden Base, Unidades y Actividades porque faltó una coincidencia clara.' : 'Clasificación automática correcta.') +
      '<br>Base: ' + esc(state.baseFile && state.baseFile.name) +
      '<br>Unidades: ' + esc(state.unidadesFile && state.unidadesFile.name) +
      '<br>Actividades: ' + esc(state.actividadesFile && state.actividadesFile.name) +
      renderFileList(analyses),
      triple.fallback ? "warn" : "ok"
    );
  }

  function bind() {
    var zone = el("peaSmartDropzone");
    var input = el("peaSmartFiles");
    var button = el("peaSmartSelectBtn");
    if (!zone || !input) return;

    if (button) button.addEventListener("click", function () { input.click(); });
    input.addEventListener("change", function () {
      processFiles(input.files).catch(function (error) { console.error(error); setStatus(error.message || "No se pudo procesar la carga.", "error"); });
    });

    ["dragenter", "dragover"].forEach(function (name) {
      zone.addEventListener(name, function (event) {
        event.preventDefault();
        zone.classList.add("is-dragover");
      });
    });

    ["dragleave", "drop"].forEach(function (name) {
      zone.addEventListener(name, function (event) {
        event.preventDefault();
        zone.classList.remove("is-dragover");
      });
    });

    zone.addEventListener("drop", function (event) {
      processFiles(event.dataTransfer && event.dataTransfer.files).catch(function (error) { console.error(error); setStatus(error.message || "No se pudo procesar la carga.", "error"); });
    });
  }

  PEA.smartUpload = {
    getPayloadFiles: function () {
      if (!state.valid) return null;
      return {
        mode: state.mode,
        baseFile: state.baseFile,
        unidadesFile: state.unidadesFile,
        actividadesFile: state.actividadesFile,
        consolidadoFile: state.consolidadoFile,
        files: state.files.slice(),
        analyses: state.analyses.slice()
      };
    },
    clear: function () {
      resetState();
      if (el("peaSmartFiles")) el("peaSmartFiles").value = "";
      setStatus("Arrastra 1 Excel consolidado o 3 Excel separados.", "");
    },
    processFiles: processFiles,
    state: state
  };

  document.addEventListener("DOMContentLoaded", bind);
})(window, document);
