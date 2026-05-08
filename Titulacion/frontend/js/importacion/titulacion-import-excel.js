/* =========================================================
Nombre completo: titulacion-import-excel.js
Ruta: /Titulacion/frontend/js/importacion/titulacion-import-excel.js
Función o funciones:
- Importar datos desde Excel o CSV.
- Convertir hojas en filas JSON.
- Normalizar nombres de columnas.
- Preparar datos para el generador de informes.
- Funcionar con SheetJS si está disponible y usar CSV como respaldo.
========================================================= */

(function (window) {
  "use strict";

  function utils() {
    return window.TITULACION_UTILS || {};
  }

  function cohorteBrain() {
    return window.TITULACION_BRAIN_COHORTE || {};
  }

  function asText(value) {
    var U = utils();
    if (typeof U.asText === "function") return U.asText(value);
    return String(value == null ? "" : value).trim();
  }

  function normalizeKey(value) {
    var U = utils();
    if (typeof U.normalizeKey === "function") return U.normalizeKey(value);

    return asText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function fileToArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();

      reader.onload = function () {
        resolve(reader.result);
      };

      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  function fileToText(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();

      reader.onload = function () {
        resolve(String(reader.result || ""));
      };

      reader.onerror = reject;
      reader.readAsText(file, "utf-8");
    });
  }

  function hasSheetJs() {
    return !!(
      window.XLSX &&
      typeof window.XLSX.read === "function"
    );
  }

  function normalizeRowKeys(row) {
    var out = {};
    var source = row || {};

    Object.keys(source).forEach(function (key) {
      var cleanKey = normalizeKey(key);
      out[cleanKey] = source[key];
      out[key] = source[key];
    });

    return out;
  }

  function normalizeRows(rows) {
    var C = cohorteBrain();
    var list = (Array.isArray(rows) ? rows : []).map(normalizeRowKeys);

    if (typeof C.normalizeRows === "function") {
      return C.normalizeRows(list);
    }

    return list;
  }

  function parseSheetJsWorkbook(arrayBuffer) {
    var workbook = window.XLSX.read(arrayBuffer, {
      type: "array",
      cellDates: true
    });

    var sheets = workbook.SheetNames.map(function (sheetName) {
      var worksheet = workbook.Sheets[sheetName];
      var rows = window.XLSX.utils.sheet_to_json(worksheet, {
        defval: "",
        raw: false
      });

      return {
        name: sheetName,
        rows: normalizeRows(rows)
      };
    });

    return {
      ok: true,
      type: "excel",
      sheets: sheets,
      rows: sheets.reduce(function (acc, sheet) {
        return acc.concat(sheet.rows);
      }, [])
    };
  }

  function splitCsvLine(line, delimiter) {
    var result = [];
    var current = "";
    var inQuotes = false;

    for (var i = 0; i < line.length; i += 1) {
      var char = line[i];
      var next = line[i + 1];

      if (char === '"' && inQuotes && next === '"') {
        current += '"';
        i += 1;
        continue;
      }

      if (char === '"') {
        inQuotes = !inQuotes;
        continue;
      }

      if (char === delimiter && !inQuotes) {
        result.push(current);
        current = "";
        continue;
      }

      current += char;
    }

    result.push(current);

    return result;
  }

  function detectDelimiter(text) {
    var firstLine = String(text || "").split(/\r?\n/)[0] || "";
    var comma = (firstLine.match(/,/g) || []).length;
    var semicolon = (firstLine.match(/;/g) || []).length;
    var tab = (firstLine.match(/\t/g) || []).length;

    if (semicolon >= comma && semicolon >= tab) return ";";
    if (tab >= comma && tab >= semicolon) return "\t";

    return ",";
  }

  function parseCsv(text) {
    var clean = String(text || "").replace(/^\uFEFF/, "");
    var delimiter = detectDelimiter(clean);
    var lines = clean.split(/\r?\n/).filter(function (line) {
      return asText(line).length > 0;
    });

    if (!lines.length) {
      return {
        ok: true,
        type: "csv",
        sheets: [{ name: "CSV", rows: [] }],
        rows: []
      };
    }

    var headers = splitCsvLine(lines[0], delimiter).map(asText);

    var rows = lines.slice(1).map(function (line) {
      var values = splitCsvLine(line, delimiter);
      var row = {};

      headers.forEach(function (header, index) {
        row[header || "columna_" + String(index + 1)] = values[index] || "";
      });

      return row;
    });

    var normalized = normalizeRows(rows);

    return {
      ok: true,
      type: "csv",
      sheets: [
        {
          name: "CSV",
          rows: normalized
        }
      ],
      rows: normalized
    };
  }

  async function parseFile(file) {
    if (!file) {
      return {
        ok: false,
        error: "No se recibió archivo.",
        sheets: [],
        rows: []
      };
    }

    var name = asText(file.name).toLowerCase();

    try {
      if (/\.(xlsx|xls|xlsm)$/i.test(name)) {
        if (!hasSheetJs()) {
          return {
            ok: false,
            error: "Para leer Excel se requiere cargar SheetJS XLSX.",
            sheets: [],
            rows: []
          };
        }

        var buffer = await fileToArrayBuffer(file);
        return parseSheetJsWorkbook(buffer);
      }

      if (/\.(csv|txt)$/i.test(name)) {
        var text = await fileToText(file);
        return parseCsv(text);
      }

      return {
        ok: false,
        error: "Formato no soportado. Use .xlsx, .xls, .xlsm, .csv o .txt.",
        sheets: [],
        rows: []
      };
    } catch (error) {
      return {
        ok: false,
        error: error && error.message ? error.message : String(error),
        sheets: [],
        rows: []
      };
    }
  }

  function getFirstSheet(result) {
    var sheets = result && Array.isArray(result.sheets) ? result.sheets : [];
    return sheets[0] || { name: "", rows: [] };
  }

  function buildImportSummary(result) {
    var safe = result || {};
    var sheets = Array.isArray(safe.sheets) ? safe.sheets : [];
    var rows = Array.isArray(safe.rows) ? safe.rows : [];

    return {
      ok: !!safe.ok,
      type: asText(safe.type),
      totalSheets: sheets.length,
      totalRows: rows.length,
      sheets: sheets.map(function (sheet) {
        return {
          name: sheet.name,
          totalRows: Array.isArray(sheet.rows) ? sheet.rows.length : 0
        };
      }),
      error: asText(safe.error)
    };
  }

  window.TITULACION_IMPORT_EXCEL = {
    fileToArrayBuffer: fileToArrayBuffer,
    fileToText: fileToText,
    hasSheetJs: hasSheetJs,
    normalizeRowKeys: normalizeRowKeys,
    normalizeRows: normalizeRows,
    parseSheetJsWorkbook: parseSheetJsWorkbook,
    parseCsv: parseCsv,
    parseFile: parseFile,
    getFirstSheet: getFirstSheet,
    buildImportSummary: buildImportSummary
  };
})(window);