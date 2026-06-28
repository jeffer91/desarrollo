/* =========================================================
Nombre completo: carga-materia.normalizer.js
Ruta o ubicación: /desarrollo/libro/carga-materia/carga-materia.normalizer.js
Función o funciones:
1. Normalizar textos, columnas y claves detectadas en Excel.
2. Detectar columnas equivalentes aunque tengan nombres diferentes.
3. Construir resúmenes seguros de filas y hojas.
4. Preparar la base para los mapeadores inteligentes de los siguientes bloques.
========================================================= */

(function attachCargaMateriaNormalizer(window) {
  "use strict";

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalize(value) {
    return text(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[º°]/g, "")
      .replace(/[\n\r\t]+/g, " ")
      .replace(/[_\-./]+/g, " ")
      .replace(/[^a-z0-9ñ\s]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function compact(value) {
    return normalize(value).replace(/\s+/g, "");
  }

  function toKey(value) {
    return normalize(value)
      .replace(/ñ/g, "n")
      .replace(/\s+([a-z0-9])/g, function toCamel(_match, letter) {
        return letter.toUpperCase();
      })
      .replace(/\s+/g, "")
      .replace(/^[A-Z]/, function lowerInitial(letter) {
        return letter.toLowerCase();
      });
  }

  function unique(values) {
    var found = {};
    var result = [];

    (values || []).forEach(function eachValue(value) {
      var current = text(value);
      var key = compact(current);

      if (!current || found[key]) return;

      found[key] = true;
      result.push(current);
    });

    return result;
  }

  function isBlankRow(row) {
    if (!row) return true;

    return Object.keys(row).every(function everyKey(key) {
      return !text(row[key]);
    });
  }

  function cleanRow(row) {
    var cleaned = {};

    Object.keys(row || {}).forEach(function eachKey(key) {
      var originalKey = text(key);
      var value = row[key];

      if (!originalKey) return;

      cleaned[originalKey] = typeof value === "string" ? text(value) : value;
    });

    return cleaned;
  }

  function getHeadersFromRows(rows) {
    var headers = [];

    (rows || []).forEach(function eachRow(row) {
      Object.keys(row || {}).forEach(function eachKey(key) {
        headers.push(key);
      });
    });

    return unique(headers);
  }

  function findColumn(headers, aliases) {
    var normalizedHeaders = (headers || []).map(function mapHeader(header) {
      return {
        original: header,
        normalized: normalize(header),
        compacted: compact(header)
      };
    });

    var normalizedAliases = (aliases || []).map(function mapAlias(alias) {
      return {
        original: alias,
        normalized: normalize(alias),
        compacted: compact(alias)
      };
    });

    for (var i = 0; i < normalizedAliases.length; i += 1) {
      var alias = normalizedAliases[i];
      var exact = normalizedHeaders.find(function findExact(header) {
        return header.compacted === alias.compacted;
      });

      if (exact) return exact.original;
    }

    for (var j = 0; j < normalizedAliases.length; j += 1) {
      var partialAlias = normalizedAliases[j];
      var partial = normalizedHeaders.find(function findPartial(header) {
        return header.normalized.indexOf(partialAlias.normalized) >= 0 ||
          partialAlias.normalized.indexOf(header.normalized) >= 0;
      });

      if (partial) return partial.original;
    }

    return "";
  }

  function mapDetectedColumns(headers, expectedMap) {
    var result = {};

    Object.keys(expectedMap || {}).forEach(function eachField(fieldKey) {
      result[fieldKey] = findColumn(headers, expectedMap[fieldKey]);
    });

    return result;
  }

  function pickRowValue(row, headers, aliases) {
    var column = findColumn(headers, aliases);
    return column ? row[column] : "";
  }

  function sampleRows(rows, limit) {
    var max = Number.isFinite(Number(limit)) ? Number(limit) : 8;

    return (rows || [])
      .filter(function filterRow(row) {
        return !isBlankRow(row);
      })
      .slice(0, max)
      .map(cleanRow);
  }

  function analyzeRows(rows, expectedMap) {
    var safeRows = (rows || [])
      .map(cleanRow)
      .filter(function filterRow(row) {
        return !isBlankRow(row);
      });

    var headers = getHeadersFromRows(safeRows);

    return {
      totalFilas: rows ? rows.length : 0,
      totalFilasConDatos: safeRows.length,
      totalColumnas: headers.length,
      columnas: headers,
      columnasNormalizadas: headers.map(function mapHeader(header) {
        return {
          original: header,
          normalizada: normalize(header),
          claveSugerida: toKey(header)
        };
      }),
      columnasDetectadas: mapDetectedColumns(headers, expectedMap || {}),
      vistaPrevia: sampleRows(safeRows, 8)
    };
  }

  window.LibroCargaMateriaNormalizer = {
    text: text,
    normalize: normalize,
    compact: compact,
    toKey: toKey,
    unique: unique,
    cleanRow: cleanRow,
    isBlankRow: isBlankRow,
    getHeadersFromRows: getHeadersFromRows,
    findColumn: findColumn,
    mapDetectedColumns: mapDetectedColumns,
    pickRowValue: pickRowValue,
    sampleRows: sampleRows,
    analyzeRows: analyzeRows
  };
})(window);
