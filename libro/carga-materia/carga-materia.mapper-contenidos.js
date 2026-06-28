/* =========================================================
Nombre completo: carga-materia.mapper-contenidos.js
Ruta o ubicación: /desarrollo/libro/carga-materia/carga-materia.mapper-contenidos.js
Función o funciones:
1. Interpretar el Archivo 2 de contenidos de unidades.
2. Detectar unidad, numeración/código y contenido aunque las columnas cambien de nombre.
3. Respetar la estructura de 4 unidades y la numeración tipo 1.1, 1.1.1, 1.1.2.
4. Separar contenidos relacionados y contenidos sin unidad detectada.
5. Entregar advertencias sin perder información original.
========================================================= */

(function attachCargaMateriaMapperContenidos(window) {
  "use strict";

  function deps() {
    return {
      constants: window.LibroCargaMateriaConstants || null,
      normalizer: window.LibroCargaMateriaNormalizer || null
    };
  }

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function normalize(value) {
    var normalizer = deps().normalizer;
    return normalizer && typeof normalizer.normalize === "function"
      ? normalizer.normalize(value)
      : text(value).toLowerCase();
  }

  function compact(value) {
    var normalizer = deps().normalizer;
    return normalizer && typeof normalizer.compact === "function"
      ? normalizer.compact(value)
      : normalize(value).replace(/\s+/g, "");
  }

  function unique(values) {
    var seen = {};
    var output = [];

    (values || []).forEach(function eachValue(value) {
      var current = text(value);
      var key = compact(current);

      if (!current || seen[key]) return;

      seen[key] = true;
      output.push(current);
    });

    return output;
  }

  function cleanContent(value) {
    return text(value)
      .replace(/^[\s:;\-.]+/, "")
      .replace(/[\t\r\n]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getPrimarySheetRows(lectura) {
    if (!lectura || lectura.tipo !== "excel") return [];

    var hojas = lectura.hojas || [];
    var selected = hojas.find(function findMain(sheet) {
      return sheet.nombreHoja === lectura.hojaPrincipal;
    }) || hojas[0];

    return selected && Array.isArray(selected.filas) ? selected.filas : [];
  }

  function getHeaders(rows) {
    var headers = [];

    (rows || []).forEach(function eachRow(row) {
      Object.keys(row || {}).forEach(function eachKey(key) {
        headers.push(key);
      });
    });

    return unique(headers);
  }

  function findColumn(headers, aliases) {
    var normalizer = deps().normalizer;

    if (normalizer && typeof normalizer.findColumn === "function") {
      return normalizer.findColumn(headers, aliases || []);
    }

    var aliasKeys = (aliases || []).map(compact);

    return (headers || []).find(function findHeader(header) {
      return aliasKeys.indexOf(compact(header)) >= 0;
    }) || "";
  }

  function getExpectedContentFields() {
    var constants = deps().constants;
    return constants && constants.EXPECTED_FIELDS ? constants.EXPECTED_FIELDS.contenidos || {} : {};
  }

  function detectCodigo(value) {
    var raw = text(value);
    var match = raw.match(/(^|\s|\|)([1-4](?:\.\d+){1,5})(?=\s|\||$)/);

    if (match && match[2]) return match[2];

    var simple = raw.match(/(^|\s|\|)([1-4])(?=\s|\||$)/);
    return simple && simple[2] ? simple[2] : "";
  }

  function getUnidadNumero(value) {
    var raw = text(value);
    var normalized = normalize(raw);

    if (!raw) return 0;

    var fromCode = detectCodigo(raw);
    if (fromCode) {
      var first = Number(String(fromCode).split(".")[0]);
      if (first >= 1 && first <= 4) return first;
    }

    var matchUnidad = normalized.match(/unidad\s*([1-4])/);
    if (matchUnidad && matchUnidad[1]) return Number(matchUnidad[1]);

    var matchNumber = normalized.match(/^([1-4])$/);
    if (matchNumber && matchNumber[1]) return Number(matchNumber[1]);

    return 0;
  }

  function getNivelCodigo(codigo) {
    var clean = text(codigo);
    if (!clean) return 0;
    return clean.split(".").length;
  }

  function buildRowText(row) {
    return Object.keys(row || {})
      .map(function mapKey(key) {
        return text(row[key]);
      })
      .filter(Boolean)
      .join(" | ");
  }

  function removeCodeFromContent(content, codigo) {
    var value = cleanContent(content);
    var code = text(codigo);

    if (!code) return value;

    return value
      .replace(new RegExp("^" + code.replace(/\./g, "\\.") + "\\s*[-–—:.]*\\s*", "i"), "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function pickContentFromRow(row, columns) {
    var values = [];

    if (columns.contenido && text(row[columns.contenido])) {
      return cleanContent(row[columns.contenido]);
    }

    Object.keys(row || {}).forEach(function eachKey(key) {
      if (key === columns.unidad || key === columns.codigo) return;
      if (text(row[key])) values.push(text(row[key]));
    });

    return cleanContent(values.join(" "));
  }

  function mapRowsToContents(rows) {
    var expected = getExpectedContentFields();
    var headers = getHeaders(rows);
    var columns = {
      unidad: findColumn(headers, expected.unidad || ["unidad"]),
      codigo: findColumn(headers, expected.codigo || ["codigo", "código", "tema", "subtema"]),
      contenido: findColumn(headers, expected.contenido || ["contenido", "tema", "descripcion"])
    };

    var unidades = [1, 2, 3, 4].map(function buildUnit(numero) {
      return {
        numero: numero,
        contenidos: []
      };
    });

    var sinUnidad = [];
    var usados = {};

    (rows || []).forEach(function eachRow(row, index) {
      var rowText = buildRowText(row);
      var unidadRaw = columns.unidad ? row[columns.unidad] : "";
      var codigoRaw = columns.codigo ? row[columns.codigo] : "";
      var codigo = detectCodigo(codigoRaw) || detectCodigo(rowText);
      var unidadNumero = getUnidadNumero(unidadRaw) || getUnidadNumero(codigo) || getUnidadNumero(rowText);
      var contenido = removeCodeFromContent(pickContentFromRow(row, columns), codigo);

      if (!contenido && !codigo) return;

      var item = {
        orden: index + 1,
        unidad: unidadNumero || null,
        codigo: codigo,
        nivel: getNivelCodigo(codigo),
        contenido: contenido || codigo,
        textoOriginal: rowText
      };

      var dedupeKey = [item.unidad || "x", item.codigo || "sin-codigo", compact(item.contenido)].join("|");
      if (usados[dedupeKey]) return;
      usados[dedupeKey] = true;

      if (unidadNumero >= 1 && unidadNumero <= 4) {
        unidades[unidadNumero - 1].contenidos.push(item);
      } else {
        sinUnidad.push(item);
      }
    });

    return {
      columnasDetectadas: columns,
      unidades: unidades,
      sinUnidad: sinUnidad
    };
  }

  function buildWarnings(mapped, rows) {
    var warnings = [];

    if (!rows.length) {
      warnings.push("El Archivo 2 no contiene filas con datos en la hoja principal.");
    }

    mapped.unidades.forEach(function eachUnit(unit) {
      if (!unit.contenidos.length) {
        warnings.push("La Unidad " + unit.numero + " no tiene contenidos detectados.");
      }
    });

    if (mapped.sinUnidad.length) {
      warnings.push("Hay " + mapped.sinUnidad.length + " contenidos sin unidad detectada.");
    }

    if (!mapped.columnasDetectadas.unidad) {
      warnings.push("No se detectó una columna clara de unidad; se intentó inferir desde la numeración.");
    }

    if (!mapped.columnasDetectadas.codigo) {
      warnings.push("No se detectó una columna clara de código/numeración; se intentó inferir desde el texto.");
    }

    if (!mapped.columnasDetectadas.contenido) {
      warnings.push("No se detectó una columna clara de contenido; se construyó el contenido combinando columnas.");
    }

    return warnings;
  }

  function summarize(mapped, rows) {
    return {
      totalFilasAnalizadas: rows.length,
      totalContenidos: mapped.unidades.reduce(function sum(total, unit) {
        return total + unit.contenidos.length;
      }, 0),
      totalSinUnidad: mapped.sinUnidad.length,
      porUnidad: mapped.unidades.map(function mapUnit(unit) {
        return {
          unidad: unit.numero,
          contenidos: unit.contenidos.length
        };
      })
    };
  }

  function interpret(lectura) {
    if (!lectura) {
      throw new Error("No se recibió lectura del Archivo 2.");
    }

    if (lectura.tipo !== "excel") {
      throw new Error("El Archivo 2 debe ser Excel para interpretar contenidos de unidades.");
    }

    var rows = getPrimarySheetRows(lectura);
    var mapped = mapRowsToContents(rows);

    return {
      tipoFuente: "excel",
      hojaPrincipal: lectura.hojaPrincipal || "",
      columnasDetectadas: mapped.columnasDetectadas,
      unidades: mapped.unidades,
      sinUnidad: mapped.sinUnidad,
      resumen: summarize(mapped, rows),
      advertencias: buildWarnings(mapped, rows),
      reglas: {
        unidadesEsperadas: 4,
        numeracionEsperada: "1 1.1 / 1 1.1.1 / 1 1.1.2 / 2 2.1 ... hasta 4 unidades"
      }
    };
  }

  window.LibroCargaMateriaMapperContenidos = {
    interpret: interpret
  };
})(window);
