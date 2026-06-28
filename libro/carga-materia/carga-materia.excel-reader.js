/* =========================================================
Nombre completo: carga-materia.excel-reader.js
Ruta o ubicación: /desarrollo/libro/carga-materia/carga-materia.excel-reader.js
Función o funciones:
1. Leer archivos Excel .xlsx y .xls desde la pantalla Carga de materia.
2. Convertir cada hoja en filas JSON conservando encabezados originales.
3. Resumir hojas, columnas, filas y vista previa.
4. Detectar columnas esperadas usando el normalizador inteligente.
5. No interpretar todavía contenidos académicos; eso se realiza en bloques posteriores.
========================================================= */

(function attachCargaMateriaExcelReader(window) {
  "use strict";

  function getDeps() {
    var constants = window.LibroCargaMateriaConstants;
    var normalizer = window.LibroCargaMateriaNormalizer;
    var loader = window.LibroCargaMateriaXlsxLoader;

    if (!constants) {
      throw new Error("No se encontró LibroCargaMateriaConstants.");
    }

    if (!normalizer) {
      throw new Error("No se encontró LibroCargaMateriaNormalizer.");
    }

    if (!loader) {
      throw new Error("No se encontró LibroCargaMateriaXlsxLoader.");
    }

    return {
      constants: constants,
      normalizer: normalizer,
      loader: loader
    };
  }

  function getExtension(file) {
    var name = file && file.name ? String(file.name) : "";
    var parts = name.split(".");

    if (parts.length < 2) return "";

    return parts.pop().toLowerCase();
  }

  function isExcel(file) {
    var ext = getExtension(file);
    return ext === "xlsx" || ext === "xls";
  }

  function readAsArrayBuffer(file) {
    return new Promise(function readPromise(resolve, reject) {
      var reader = new FileReader();

      reader.onload = function onLoad(event) {
        resolve(event.target.result);
      };

      reader.onerror = function onError() {
        reject(new Error("No se pudo leer el archivo: " + (file ? file.name : "sin nombre")));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  function worksheetToRows(XLSX, worksheet) {
    return XLSX.utils.sheet_to_json(worksheet, {
      defval: "",
      raw: false,
      blankrows: false
    });
  }

  function worksheetToMatrix(XLSX, worksheet) {
    return XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
      raw: false,
      blankrows: false
    });
  }

  function limitColumnsInPreview(rows, maxColumns) {
    var limit = Number.isFinite(Number(maxColumns)) ? Number(maxColumns) : 18;

    return (rows || []).map(function mapRow(row) {
      var output = {};
      var keys = Object.keys(row || {}).slice(0, limit);

      keys.forEach(function eachKey(key) {
        output[key] = row[key];
      });

      return output;
    });
  }

  function buildSheetSummary(kind, sheetName, rows, matrix) {
    var deps = getDeps();
    var expected = deps.constants.EXPECTED_FIELDS[kind] || {};
    var analysis = deps.normalizer.analyzeRows(rows, expected);

    analysis.vistaPrevia = limitColumnsInPreview(
      analysis.vistaPrevia,
      deps.constants.RULES.maxColumnasVistaPrevia
    );

    return {
      nombreHoja: sheetName,
      rango: matrix && matrix.length ? matrix.length + " filas visibles" : "Sin filas visibles",
      totalFilas: analysis.totalFilas,
      totalFilasConDatos: analysis.totalFilasConDatos,
      totalColumnas: analysis.totalColumnas,
      columnas: analysis.columnas,
      columnasNormalizadas: analysis.columnasNormalizadas,
      columnasDetectadas: analysis.columnasDetectadas,
      vistaPrevia: analysis.vistaPrevia,
      filas: rows
    };
  }

  async function readExcelFile(file, kind) {
    var deps = getDeps();

    if (!file) {
      throw new Error("No se recibió archivo Excel.");
    }

    if (!isExcel(file)) {
      throw new Error("El archivo " + file.name + " no es Excel.");
    }

    await deps.loader.ensureXLSX();

    var buffer = await readAsArrayBuffer(file);
    var data = new Uint8Array(buffer);
    var workbook = window.XLSX.read(data, {
      type: "array",
      cellDates: true
    });

    var sheetNames = workbook.SheetNames || [];

    if (!sheetNames.length) {
      throw new Error("El archivo Excel no contiene hojas: " + file.name);
    }

    var hojas = sheetNames.map(function mapSheet(sheetName) {
      var worksheet = workbook.Sheets[sheetName];
      var rows = worksheetToRows(window.XLSX, worksheet);
      var matrix = worksheetToMatrix(window.XLSX, worksheet);

      return buildSheetSummary(kind, sheetName, rows, matrix);
    });

    var hojasConDatos = hojas.filter(function filterSheet(sheet) {
      return sheet.totalFilasConDatos > 0;
    });

    var primeraHojaConDatos = hojasConDatos[0] || hojas[0];

    return {
      ok: true,
      tipo: "excel",
      kind: kind,
      archivo: {
        nombre: file.name,
        extension: getExtension(file),
        tamanoBytes: file.size || 0,
        ultimaModificacion: file.lastModified ? new Date(file.lastModified).toISOString() : null
      },
      totalHojas: hojas.length,
      hojas: hojas,
      hojaPrincipal: primeraHojaConDatos ? primeraHojaConDatos.nombreHoja : "",
      resumen: {
        totalFilas: hojas.reduce(function sumRows(total, sheet) {
          return total + sheet.totalFilas;
        }, 0),
        totalFilasConDatos: hojas.reduce(function sumRowsWithData(total, sheet) {
          return total + sheet.totalFilasConDatos;
        }, 0),
        totalColumnasHojaPrincipal: primeraHojaConDatos ? primeraHojaConDatos.totalColumnas : 0,
        columnasHojaPrincipal: primeraHojaConDatos ? primeraHojaConDatos.columnas : [],
        columnasDetectadasHojaPrincipal: primeraHojaConDatos ? primeraHojaConDatos.columnasDetectadas : {}
      }
    };
  }

  async function readFileForKind(file, kind) {
    var ext = getExtension(file);

    if (ext === "pdf") {
      return {
        ok: true,
        tipo: "pdf",
        kind: kind,
        archivo: {
          nombre: file.name,
          extension: ext,
          tamanoBytes: file.size || 0,
          ultimaModificacion: file.lastModified ? new Date(file.lastModified).toISOString() : null
        },
        pendienteBloque3: true,
        mensaje: "PDF detectado. La lectura de texto PDF se implementa en el Bloque 3."
      };
    }

    return readExcelFile(file, kind);
  }

  window.LibroCargaMateriaExcelReader = {
    isExcel: isExcel,
    readExcelFile: readExcelFile,
    readFileForKind: readFileForKind
  };
})(window);
