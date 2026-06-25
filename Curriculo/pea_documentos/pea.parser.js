/*
Nombre del archivo: pea.parser.js
Ubicación: /Curriculo/pea_documentos/pea.parser.js
Función:
- Leer archivos Excel del PEA
- Normalizar carga triple o consolidada
- Separar base, unidades y actividades
- Generar resumen para historial, comparación y exportación
*/
(function (window) {
  "use strict";

  window.PEA = window.PEA || {};
  var PEA = window.PEA;

  function cleanText(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
  function slugify(value) { return cleanText(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " y ").replace(/[^a-z0-9\s_-]/g, "").replace(/[\s-]+/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, ""); }

  function arrayBufferFromFile(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function (event) { resolve(event.target.result); };
      reader.onerror = function () { reject(new Error("No se pudo leer el archivo: " + (file && file.name ? file.name : "desconocido"))); };
      reader.readAsArrayBuffer(file);
    });
  }

  function worksheetToRows(sheet) { return XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false }); }

  function parseWorkbookPayload(workbook, fileName) {
    return { fileName: fileName || "archivo.xlsx", sheetCount: workbook.SheetNames.length, sheets: workbook.SheetNames.map(function (sheetName) { var rows = worksheetToRows(workbook.Sheets[sheetName]); return { name: sheetName, rows: rows, rowCount: rows.length }; }) };
  }

  function detectSectionByNameOrContent(text) {
    var value = cleanText(text).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (value.indexOf("pea base") >= 0 || value.indexOf("datos generales") >= 0 || value.indexOf("descripcion de la asignatura") >= 0 || value.indexOf("objetivo") >= 0 || value.indexOf("competencia de asignatura") >= 0) return "base";
    if (value.indexOf("unidad") >= 0 || value.indexOf("resultado de aprendizaje") >= 0 || value.indexOf("contenidos") >= 0) return "unidades";
    if (value.indexOf("actividad") >= 0 || value.indexOf("taller") >= 0 || value.indexOf("proyecto final") >= 0 || value.indexOf("trabajo autonomo") >= 0 || value.indexOf("trabajo autónomo") >= 0) return "actividades";
    return "";
  }

  function createEmptySection(label) { return { label: label, fileName: "", sheetCount: 0, sheets: [] }; }
  function pushSheet(section, sheet) { section.sheets.push({ name: sheet.name, rows: Array.isArray(sheet.rows) ? sheet.rows : [], rowCount: Array.isArray(sheet.rows) ? sheet.rows.length : 0 }); section.sheetCount = section.sheets.length; }
  function detectSheetSection(sheet) { return detectSectionByNameOrContent(String(sheet.name || "")) || detectSectionByNameOrContent(((sheet.rows || []).slice(0, 12).flat().join(" ")) || ""); }

  function splitConsolidatedPayload(consolidated) {
    var base = createEmptySection("base"), unidades = createEmptySection("unidades"), actividades = createEmptySection("actividades"), unknown = [];
    base.fileName = unidades.fileName = actividades.fileName = consolidated.fileName || "";
    (consolidated.sheets || []).forEach(function (sheet) { var kind = detectSheetSection(sheet); if (kind === "base") pushSheet(base, sheet); else if (kind === "unidades") pushSheet(unidades, sheet); else if (kind === "actividades") pushSheet(actividades, sheet); else unknown.push(sheet); });
    unknown.forEach(function (sheet) { if (!base.sheets.length) pushSheet(base, sheet); else if (!unidades.sheets.length) pushSheet(unidades, sheet); else pushSheet(actividades, sheet); });
    return { base: base, unidades: unidades, actividades: actividades };
  }

  function countRows(section) { return (section && section.sheets || []).reduce(function (acc, sheet) { return acc + Number(sheet.rowCount || 0); }, 0); }
  function buildSummary(payload) { return { tieneBase: !!(payload.base && payload.base.sheets && payload.base.sheets.length), tieneUnidades: !!(payload.unidades && payload.unidades.sheets && payload.unidades.sheets.length), tieneActividades: !!(payload.actividades && payload.actividades.sheets && payload.actividades.sheets.length), totalHojasBase: payload.base && payload.base.sheets ? payload.base.sheets.length : 0, totalHojasUnidades: payload.unidades && payload.unidades.sheets ? payload.unidades.sheets.length : 0, totalHojasActividades: payload.actividades && payload.actividades.sheets ? payload.actividades.sheets.length : 0, totalFilasBase: countRows(payload.base), totalFilasUnidades: countRows(payload.unidades), totalFilasActividades: countRows(payload.actividades) }; }

  async function readWorkbookFromFile(file) { if (!file) throw new Error("No se recibió un archivo para procesar."); var buffer = await arrayBufferFromFile(file); return parseWorkbookPayload(XLSX.read(buffer, { type: "array" }), file.name); }
  async function parseTripleFiles(baseFile, unidadesFile, actividadesFile) { if (!baseFile || !unidadesFile || !actividadesFile) throw new Error("Debes cargar los 3 archivos: Base, Unidades y Actividades."); return { origenTipo: "triple", base: await readWorkbookFromFile(baseFile), unidades: await readWorkbookFromFile(unidadesFile), actividades: await readWorkbookFromFile(actividadesFile), consolidado: null }; }
  async function parseConsolidatedFile(file) { if (!file) throw new Error("Debes cargar el archivo consolidado."); var consolidado = await readWorkbookFromFile(file); var split = splitConsolidatedPayload(consolidado); return { origenTipo: "consolidado", base: split.base, unidades: split.unidades, actividades: split.actividades, consolidado: consolidado }; }

  PEA.parser = {
    cleanText: cleanText,
    slugify: slugify,
    createMateriaId: function (nombre, codigo) { var code = cleanText(codigo), name = cleanText(nombre); if (code) return slugify(code); if (!name) throw new Error("Debes indicar el nombre de la materia o un código."); return slugify(name); },
    buildNormalizedUpload: async function (params) {
      var input = params || {};
      var materiaNombre = cleanText(input.materiaNombre), materiaCodigo = cleanText(input.materiaCodigo), materiaId = cleanText(input.materiaId), versionNota = cleanText(input.versionNota), modo = cleanText(input.modo || "triple"), parsed;
      if (!materiaNombre && !materiaCodigo && !materiaId) throw new Error("Debes indicar el nombre de la materia o un código.");
      if (modo === "triple") parsed = await parseTripleFiles(input.baseFile, input.unidadesFile, input.actividadesFile);
      else if (modo === "consolidado") parsed = await parseConsolidatedFile(input.consolidadoFile);
      else throw new Error("Modo de carga no reconocido.");
      return { materiaId: materiaId || PEA.parser.createMateriaId(materiaNombre, materiaCodigo), materiaNombre: materiaNombre || materiaCodigo || materiaId, materiaCodigo: materiaCodigo, versionNota: versionNota, origenTipo: parsed.origenTipo, createdAtClient: new Date().toISOString(), contenido: { base: parsed.base || createEmptySection("base"), unidades: parsed.unidades || createEmptySection("unidades"), actividades: parsed.actividades || createEmptySection("actividades"), consolidado: parsed.consolidado || null }, resumen: buildSummary({ base: parsed.base, unidades: parsed.unidades, actividades: parsed.actividades }) };
    }
  };
})(window);
