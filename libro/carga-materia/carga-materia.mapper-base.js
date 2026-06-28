/* =========================================================
Nombre completo: carga-materia.mapper-base.js
Ruta o ubicación: /desarrollo/libro/carga-materia/carga-materia.mapper-base.js
Función o funciones:
1. Interpretar el Archivo 1 de información base.
2. Extraer descripción, objetivo, unidades, competencias, resultados de aprendizaje, bibliografía y justificación.
3. Trabajar con Excel leído por el Bloque 2 o PDF leído por el Bloque 3.
4. Entregar advertencias sin perder información original.
========================================================= */

(function attachCargaMateriaMapperBase(window) {
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

  function cleanSentence(value) {
    return text(value)
      .replace(/^[\s:;\-.]+/, "")
      .replace(/[\s]+/g, " ")
      .trim();
  }

  function isSectionTitle(line) {
    var value = normalize(line);

    return [
      "descripcion",
      "descripcion de la materia",
      "objetivo",
      "objetivo de la materia",
      "unidades",
      "unidad",
      "competencias",
      "competencia",
      "resultados de aprendizaje",
      "resultado de aprendizaje",
      "bibliografia",
      "referencias",
      "justificacion bibliografia",
      "justificacion de la bibliografia"
    ].some(function someTitle(title) {
      return value === normalize(title);
    });
  }

  function splitLines(rawText) {
    return text(rawText)
      .replace(/\r/g, "\n")
      .split("\n")
      .map(cleanSentence)
      .filter(Boolean);
  }

  function rowsToText(rows) {
    var lines = [];

    (rows || []).forEach(function eachRow(row) {
      var values = Object.keys(row || {})
        .map(function mapKey(key) {
          return text(row[key]);
        })
        .filter(Boolean);

      if (values.length) {
        lines.push(values.join(" | "));
      }
    });

    return lines.join("\n");
  }

  function getPrimarySheetRows(lectura) {
    if (!lectura || lectura.tipo !== "excel") return [];

    var hojas = lectura.hojas || [];
    var selected = hojas.find(function findMain(sheet) {
      return sheet.nombreHoja === lectura.hojaPrincipal;
    }) || hojas[0];

    return selected && Array.isArray(selected.filas) ? selected.filas : [];
  }

  function findColumn(headers, aliases) {
    var normalizer = deps().normalizer;

    if (normalizer && typeof normalizer.findColumn === "function") {
      return normalizer.findColumn(headers, aliases);
    }

    var aliasKeys = (aliases || []).map(compact);

    return (headers || []).find(function findHeader(header) {
      return aliasKeys.indexOf(compact(header)) >= 0;
    }) || "";
  }

  function getExpectedBaseFields() {
    var constants = deps().constants;
    return constants && constants.EXPECTED_FIELDS ? constants.EXPECTED_FIELDS.base || {} : {};
  }

  function detectDirectFieldsFromRows(rows) {
    var expected = getExpectedBaseFields();
    var headers = [];
    var output = {
      descripcion: "",
      objetivo: "",
      bibliografia: "",
      justificacionBibliografia: "",
      unidades: [],
      competencias: [],
      resultadosAprendizaje: []
    };

    (rows || []).forEach(function eachRow(row) {
      Object.keys(row || {}).forEach(function eachKey(key) {
        headers.push(key);
      });
    });

    headers = unique(headers);

    var colDescripcion = findColumn(headers, expected.descripcion || []);
    var colObjetivo = findColumn(headers, expected.objetivo || []);
    var colUnidad = findColumn(headers, expected.unidad || []);
    var colCompetencia = findColumn(headers, expected.competencia || []);
    var colResultado = findColumn(headers, expected.resultadoAprendizaje || []);
    var colBibliografia = findColumn(headers, expected.bibliografia || []);
    var colJustificacion = findColumn(headers, expected.justificacionBibliografia || []);

    (rows || []).forEach(function eachRow(row) {
      if (colDescripcion && !output.descripcion && text(row[colDescripcion])) {
        output.descripcion = cleanSentence(row[colDescripcion]);
      }

      if (colObjetivo && !output.objetivo && text(row[colObjetivo])) {
        output.objetivo = cleanSentence(row[colObjetivo]);
      }

      if (colBibliografia && text(row[colBibliografia])) {
        output.bibliografia = [output.bibliografia, cleanSentence(row[colBibliografia])].filter(Boolean).join("\n");
      }

      if (colJustificacion && text(row[colJustificacion])) {
        output.justificacionBibliografia = [output.justificacionBibliografia, cleanSentence(row[colJustificacion])].filter(Boolean).join("\n");
      }

      if (colUnidad && text(row[colUnidad])) {
        output.unidades.push(cleanSentence(row[colUnidad]));
      }

      if (colCompetencia && text(row[colCompetencia])) {
        output.competencias.push(cleanSentence(row[colCompetencia]));
      }

      if (colResultado && text(row[colResultado])) {
        output.resultadosAprendizaje.push(cleanSentence(row[colResultado]));
      }
    });

    output.unidades = unique(output.unidades).slice(0, 4);
    output.competencias = unique(output.competencias).slice(0, 4);
    output.resultadosAprendizaje = unique(output.resultadosAprendizaje).slice(0, 4);

    return output;
  }

  function detectKeyValueFieldsFromRows(rows) {
    var output = {
      descripcion: "",
      objetivo: "",
      bibliografia: "",
      justificacionBibliografia: "",
      unidades: [],
      competencias: [],
      resultadosAprendizaje: []
    };

    (rows || []).forEach(function eachRow(row) {
      var keys = Object.keys(row || {});
      var values = keys.map(function mapKey(key) {
        return text(row[key]);
      }).filter(Boolean);

      if (values.length < 2) return;

      var label = normalize(values[0]);
      var value = cleanSentence(values.slice(1).join(" "));

      if (!value) return;

      if (label.indexOf("descripcion") >= 0 && !output.descripcion) output.descripcion = value;
      if (label.indexOf("objetivo") >= 0 && !output.objetivo) output.objetivo = value;
      if (label.indexOf("bibliografia") >= 0 && label.indexOf("justificacion") < 0) output.bibliografia = [output.bibliografia, value].filter(Boolean).join("\n");
      if (label.indexOf("justificacion") >= 0 && label.indexOf("bibliografia") >= 0) output.justificacionBibliografia = [output.justificacionBibliografia, value].filter(Boolean).join("\n");
      if (/unidad\s*[1-4]/.test(label) || /^unidad$/.test(label)) output.unidades.push(value);
      if (/competencia\s*[1-4]/.test(label) || /^competencia$/.test(label)) output.competencias.push(value);
      if ((label.indexOf("resultado") >= 0 && label.indexOf("aprendizaje") >= 0) || /^ra\s*[1-4]?$/.test(label)) output.resultadosAprendizaje.push(value);
    });

    output.unidades = unique(output.unidades).slice(0, 4);
    output.competencias = unique(output.competencias).slice(0, 4);
    output.resultadosAprendizaje = unique(output.resultadosAprendizaje).slice(0, 4);

    return output;
  }

  function extractLineAfterKeyword(lines, keywords) {
    for (var i = 0; i < lines.length; i += 1) {
      var line = lines[i];
      var normalizedLine = normalize(line);

      for (var j = 0; j < keywords.length; j += 1) {
        var keyword = normalize(keywords[j]);

        if (normalizedLine.indexOf(keyword) >= 0) {
          var parts = line.split(/[:|\-–—]/);

          if (parts.length > 1) {
            var inlineValue = cleanSentence(parts.slice(1).join(" "));
            if (inlineValue) return inlineValue;
          }

          for (var k = i + 1; k < Math.min(lines.length, i + 8); k += 1) {
            if (!isSectionTitle(lines[k])) return cleanSentence(lines[k]);
          }
        }
      }
    }

    return "";
  }

  function collectSection(lines, startKeywords, stopKeywords) {
    var collecting = false;
    var values = [];

    (lines || []).forEach(function eachLine(line) {
      var normalizedLine = normalize(line);
      var starts = startKeywords.some(function someStart(keyword) {
        return normalizedLine.indexOf(normalize(keyword)) >= 0;
      });
      var stops = stopKeywords.some(function someStop(keyword) {
        return normalizedLine.indexOf(normalize(keyword)) >= 0;
      });

      if (starts) {
        collecting = true;
        var parts = line.split(/[:|]/);
        if (parts.length > 1) {
          values.push(cleanSentence(parts.slice(1).join(" ")));
        }
        return;
      }

      if (collecting && stops) {
        collecting = false;
        return;
      }

      if (collecting && line) {
        values.push(cleanSentence(line));
      }
    });

    return values.filter(Boolean).join("\n").trim();
  }

  function extractNumberedItems(lines, keyword) {
    var items = [];
    var normalizedKeyword = normalize(keyword);

    (lines || []).forEach(function eachLine(line) {
      var n = normalize(line);
      var regex = new RegExp(normalizedKeyword + "\\s*([1-4])", "i");
      var match = n.match(regex);

      if (!match) return;

      var parts = line.split(/[:|\-–—]/);
      var value = parts.length > 1 ? cleanSentence(parts.slice(1).join(" ")) : cleanSentence(line.replace(/unidad\s*[1-4]/i, ""));

      if (value) {
        items[Number(match[1]) - 1] = value;
      }
    });

    return items.filter(Boolean);
  }

  function extractTextFields(rawText) {
    var lines = splitLines(rawText);
    var descripcion = extractLineAfterKeyword(lines, ["descripcion", "descripción", "descripcion de la materia"]);
    var objetivo = extractLineAfterKeyword(lines, ["objetivo", "objetivo de la materia", "objetivo general"]);
    var unidades = extractNumberedItems(lines, "unidad");
    var competencias = extractNumberedItems(lines, "competencia");
    var resultados = extractNumberedItems(lines, "resultado");

    var bibliografia = collectSection(
      lines,
      ["bibliografia", "bibliografía", "referencias"],
      ["justificacion", "justificación", "unidad", "competencia", "resultado"]
    );

    var justificacion = collectSection(
      lines,
      ["justificacion de la bibliografia", "justificación de la bibliografía", "justificacion bibliografia", "justificación bibliografía"],
      ["unidad", "competencia", "resultado", "descripcion", "objetivo"]
    );

    return {
      descripcion: descripcion,
      objetivo: objetivo,
      unidades: unique(unidades).slice(0, 4),
      competencias: unique(competencias).slice(0, 4),
      resultadosAprendizaje: unique(resultados).slice(0, 4),
      bibliografia: bibliografia,
      justificacionBibliografia: justificacion
    };
  }

  function mergePreferFirst() {
    var output = {
      descripcion: "",
      objetivo: "",
      bibliografia: "",
      justificacionBibliografia: "",
      unidades: [],
      competencias: [],
      resultadosAprendizaje: []
    };

    Array.prototype.slice.call(arguments).forEach(function eachSource(source) {
      if (!source) return;

      if (!output.descripcion && source.descripcion) output.descripcion = source.descripcion;
      if (!output.objetivo && source.objetivo) output.objetivo = source.objetivo;
      if (!output.bibliografia && source.bibliografia) output.bibliografia = source.bibliografia;
      if (!output.justificacionBibliografia && source.justificacionBibliografia) output.justificacionBibliografia = source.justificacionBibliografia;

      if (output.unidades.length < 4 && source.unidades && source.unidades.length) {
        output.unidades = unique(output.unidades.concat(source.unidades)).slice(0, 4);
      }

      if (output.competencias.length < 4 && source.competencias && source.competencias.length) {
        output.competencias = unique(output.competencias.concat(source.competencias)).slice(0, 4);
      }

      if (output.resultadosAprendizaje.length < 4 && source.resultadosAprendizaje && source.resultadosAprendizaje.length) {
        output.resultadosAprendizaje = unique(output.resultadosAprendizaje.concat(source.resultadosAprendizaje)).slice(0, 4);
      }
    });

    return output;
  }

  function buildWarnings(data) {
    var warnings = [];

    if (!data.descripcion) warnings.push("No se detectó la descripción de la materia.");
    if (!data.objetivo) warnings.push("No se detectó el objetivo de la materia.");
    if (data.unidades.length !== 4) warnings.push("Se detectaron " + data.unidades.length + " unidades; deben ser exactamente 4.");
    if (data.competencias.length !== 4) warnings.push("Se detectaron " + data.competencias.length + " competencias; deben ser exactamente 4.");
    if (data.resultadosAprendizaje.length !== 4) warnings.push("Se detectaron " + data.resultadosAprendizaje.length + " resultados de aprendizaje; deben ser exactamente 4.");
    if (!data.bibliografia) warnings.push("No se detectó bibliografía.");
    if (!data.justificacionBibliografia) warnings.push("No se detectó justificación de bibliografía.");

    return warnings;
  }

  function buildUnits(data) {
    var units = [];

    for (var i = 0; i < 4; i += 1) {
      units.push({
        numero: i + 1,
        nombre: data.unidades[i] || "",
        competencia: data.competencias[i] || "",
        resultadoAprendizaje: data.resultadosAprendizaje[i] || ""
      });
    }

    return units;
  }

  function interpretFromExcel(lectura) {
    var rows = getPrimarySheetRows(lectura);
    var direct = detectDirectFieldsFromRows(rows);
    var keyValue = detectKeyValueFieldsFromRows(rows);
    var rawText = rowsToText(rows);
    var textFields = extractTextFields(rawText);
    var merged = mergePreferFirst(direct, keyValue, textFields);

    return {
      tipoFuente: "excel",
      hojaPrincipal: lectura ? lectura.hojaPrincipal : "",
      campos: {
        descripcion: merged.descripcion,
        objetivo: merged.objetivo,
        unidades: buildUnits(merged),
        bibliografia: merged.bibliografia,
        justificacionBibliografia: merged.justificacionBibliografia
      },
      conteo: {
        unidades: merged.unidades.length,
        competencias: merged.competencias.length,
        resultadosAprendizaje: merged.resultadosAprendizaje.length
      },
      advertencias: buildWarnings(merged),
      evidencia: {
        filasAnalizadas: rows.length,
        textoAnalizado: rawText.slice(0, 5000)
      }
    };
  }

  function interpretFromPdf(lectura) {
    var rawText = lectura && lectura.textoCompleto ? lectura.textoCompleto : "";
    var textFields = extractTextFields(rawText);

    return {
      tipoFuente: "pdf",
      totalPaginas: lectura ? lectura.totalPaginas || 0 : 0,
      campos: {
        descripcion: textFields.descripcion,
        objetivo: textFields.objetivo,
        unidades: buildUnits(textFields),
        bibliografia: textFields.bibliografia,
        justificacionBibliografia: textFields.justificacionBibliografia
      },
      conteo: {
        unidades: textFields.unidades.length,
        competencias: textFields.competencias.length,
        resultadosAprendizaje: textFields.resultadosAprendizaje.length
      },
      advertencias: buildWarnings(textFields),
      evidencia: {
        caracteresAnalizados: rawText.length,
        textoAnalizado: rawText.slice(0, 5000)
      }
    };
  }

  function interpret(lectura) {
    if (!lectura) {
      throw new Error("No se recibió lectura del Archivo 1.");
    }

    if (lectura.tipo === "excel") {
      return interpretFromExcel(lectura);
    }

    if (lectura.tipo === "pdf") {
      return interpretFromPdf(lectura);
    }

    throw new Error("Tipo de lectura no soportado para Archivo 1.");
  }

  window.LibroCargaMateriaMapperBase = {
    interpret: interpret,
    interpretFromExcel: interpretFromExcel,
    interpretFromPdf: interpretFromPdf
  };
})(window);
