/*
=========================================================
Nombre completo: coordi.import.js
Ruta o ubicación: /Docentes/coordi/coordi.import.js
Función o funciones:
- Leer archivos Excel o CSV para cargar datos en la pantalla Coordi.
- Detectar columnas Carrera, Coordinador, Programa y Telegram.
- Normalizar registros importados.
- Preparar filas compatibles con coordi.state.js y coordi.table.js.
Con qué se une:
- coordi.index.html
- coordi.app.js
- coordi.state.js
- coordi.normalize.js
- coordi.table.js
=========================================================
*/

(function () {
  "use strict";

  const COLUMN_ALIASES = {
    carrera: [
      "carrera",
      "nombre carrera",
      "programa academico",
      "programa académico",
      "nombre del programa"
    ],
    coordinador: [
      "coordinador",
      "coordinadores",
      "coordinador carrera",
      "coordinador de carrera"
    ],
    programa: [
      "programa",
      "nivel",
      "tipo programa",
      "tipo de programa"
    ],
    telegram: [
      "telegram",
      "usuario telegram",
      "contacto telegram"
    ]
  };

  async function readFile(file) {
    if (!file) {
      throw new Error("No se recibió ningún archivo para importar.");
    }

    const extension = getExtension(file.name);

    if (extension === "csv") {
      return readCsvFile(file);
    }

    return readExcelFile(file);
  }

  async function readExcelFile(file) {
    if (!window.XLSX) {
      throw new Error(
        "No se encontró la librería XLSX. Agrega SheetJS o usa un archivo CSV."
      );
    }

    const buffer = await file.arrayBuffer();
    const workbook = window.XLSX.read(buffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new Error("El archivo no contiene hojas disponibles.");
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows = window.XLSX.utils.sheet_to_json(sheet, { defval: "" });

    return mapRows(rows);
  }

  async function readCsvFile(file) {
    const text = await file.text();
    const rows = parseCsv(text);

    return mapRows(rows);
  }

  function parseCsv(text) {
    const lines = String(text || "")
      .split(/\r?\n/)
      .filter((line) => line.trim());

    if (lines.length === 0) {
      return [];
    }

    const separator = detectSeparator(lines[0]);
    const headers = splitCsvLine(lines[0], separator);

    return lines.slice(1).map((line) => {
      const values = splitCsvLine(line, separator);
      const row = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });

      return row;
    });
  }

  function detectSeparator(headerLine) {
    const commas = (headerLine.match(/,/g) || []).length;
    const semicolons = (headerLine.match(/;/g) || []).length;
    const tabs = (headerLine.match(/\t/g) || []).length;

    if (tabs >= commas && tabs >= semicolons) {
      return "\t";
    }

    return semicolons > commas ? ";" : ",";
  }

  function splitCsvLine(line, separator) {
    const result = [];
    let current = "";
    let insideQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1];

      if (char === '"' && next === '"') {
        current += '"';
        index += 1;
        continue;
      }

      if (char === '"') {
        insideQuotes = !insideQuotes;
        continue;
      }

      if (char === separator && !insideQuotes) {
        result.push(current.trim());
        current = "";
        continue;
      }

      current += char;
    }

    result.push(current.trim());

    return result;
  }

  function mapRows(rawRows) {
    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return [];
    }

    const columns = detectColumns(Object.keys(rawRows[0] || {}));

    return rawRows
      .map((rawRow) => ({
        id: window.CoordiState
          ? window.CoordiState.createId()
          : `coordi_import_${Date.now()}_${Math.random()}`,
        carrera: getValue(rawRow, columns.carrera),
        coordinador: getValue(rawRow, columns.coordinador),
        programa: getValue(rawRow, columns.programa),
        telegram: getValue(rawRow, columns.telegram),
        updatedAt: new Date().toISOString()
      }))
      .filter((row) => {
        return row.carrera || row.coordinador || row.programa || row.telegram;
      })
      .map((row) => {
        if (!window.CoordiNormalize) {
          return row;
        }

        return window.CoordiNormalize.normalizeRow(row);
      });
  }

  function detectColumns(headers) {
    const normalizedHeaders = headers.map((header) => ({
      original: header,
      key: normalizeHeader(header)
    }));

    return {
      carrera: findColumn(normalizedHeaders, COLUMN_ALIASES.carrera),
      coordinador: findColumn(normalizedHeaders, COLUMN_ALIASES.coordinador),
      programa: findColumn(normalizedHeaders, COLUMN_ALIASES.programa),
      telegram: findColumn(normalizedHeaders, COLUMN_ALIASES.telegram)
    };
  }

  function findColumn(headers, aliases) {
    const aliasKeys = aliases.map(normalizeHeader);

    const exact = headers.find((header) => aliasKeys.includes(header.key));

    if (exact) {
      return exact.original;
    }

    const partial = headers.find((header) => {
      return aliasKeys.some((alias) => header.key.includes(alias));
    });

    return partial ? partial.original : null;
  }

  function normalizeHeader(value) {
    if (window.CoordiNormalize) {
      return window.CoordiNormalize.toKey(value);
    }

    return String(value || "").trim().toLowerCase();
  }

  function getValue(row, columnName) {
    if (!columnName) {
      return "";
    }

    return String(row[columnName] || "").trim();
  }

  function getExtension(filename) {
    return String(filename || "")
      .split(".")
      .pop()
      .toLowerCase();
  }

  window.CoordiImport = {
    readFile
  };
})();