/* =========================================================
Nombre completo: carga-materia.mapper-actividades.js
Ruta o ubicación: /desarrollo/libro/carga-materia/carga-materia.mapper-actividades.js
Función o funciones:
1. Interpretar el Archivo 3 de actividades de la materia.
2. Detectar unidad, actividad, tipo, semana y resultado de aprendizaje aunque las columnas cambien.
3. Relacionar actividades con las cuatro unidades cuando sea posible.
4. Separar actividades sin unidad detectada para no perder información.
5. Entregar advertencias y resumen para el siguiente bloque de unión inteligente.
========================================================= */

(function attachCargaMateriaMapperActividades(window) {
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

  function cleanValue(value) {
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

  function getExpectedActivityFields() {
    var constants = deps().constants;
    return constants && constants.EXPECTED_FIELDS ? constants.EXPECTED_FIELDS.actividades || {} : {};
  }

  function buildRowText(row) {
    return Object.keys(row || {})
      .map(function mapKey(key) {
        return text(row[key]);
      })
      .filter(Boolean)
      .join(" | ");
  }

  function detectCode(value) {
    var raw = text(value);
    var match = raw.match(/(^|\s|\|)([1-4](?:\.\d+){0,5})(?=\s|\||$)/);

    return match && match[2] ? match[2] : "";
  }

  function detectUnit(value) {
    var raw = text(value);
    var normalized = normalize(raw);

    if (!raw) return 0;

    var code = detectCode(raw);
    if (code) {
      var first = Number(String(code).split(".")[0]);
      if (first >= 1 && first <= 4) return first;
    }

    var matchUnidad = normalized.match(/unidad\s*([1-4])/);
    if (matchUnidad && matchUnidad[1]) return Number(matchUnidad[1]);

    var matchSimple = normalized.match(/^([1-4])$/);
    if (matchSimple && matchSimple[1]) return Number(matchSimple[1]);

    return 0;
  }

  function pick(row, column) {
    return column ? cleanValue(row[column]) : "";
  }

  function pickActivityDescription(row, columns) {
    if (columns.actividad && text(row[columns.actividad])) {
      return cleanValue(row[columns.actividad]);
    }

    var values = [];

    Object.keys(row || {}).forEach(function eachKey(key) {
      if (
        key === columns.unidad ||
        key === columns.tipo ||
        key === columns.semana ||
        key === columns.resultadoAprendizaje ||
        key === columns.tema
      ) {
        return;
      }

      if (text(row[key])) values.push(text(row[key]));
    });

    return cleanValue(values.join(" "));
  }

  function mapRowsToActivities(rows) {
    var expected = getExpectedActivityFields();
    var headers = getHeaders(rows);
    var columns = {
      unidad: findColumn(headers, expected.unidad || ["unidad", "n unidad", "numero unidad", "número unidad"]),
      actividad: findColumn(headers, expected.actividad || ["actividad", "actividades", "descripcion", "descripción", "nombre actividad"]),
      tipo: findColumn(headers, expected.tipo || ["tipo", "tipo actividad", "tipo de actividad"]),
      semana: findColumn(headers, expected.semana || ["semana", "semanas"]),
      resultadoAprendizaje: findColumn(headers, expected.resultadoAprendizaje || ["resultado de aprendizaje", "resultado aprendizaje", "ra"]),
      tema: findColumn(headers, ["tema", "subtema", "contenido", "contenidos", "codigo", "código", "numeracion", "numeración"])
    };

    var unidades = [1, 2, 3, 4].map(function buildUnit(numero) {
      return {
        numero: numero,
        actividades: []
      };
    });

    var sinUnidad = [];
    var usados = {};

    (rows || []).forEach(function eachRow(row, index) {
      var rowText = buildRowText(row);
      var unidadRaw = pick(row, columns.unidad);
      var temaRaw = pick(row, columns.tema);
      var actividad = pickActivityDescription(row, columns);
      var tipo = pick(row, columns.tipo);
      var semana = pick(row, columns.semana);
      var resultadoAprendizaje = pick(row, columns.resultadoAprendizaje);
      var codigoRelacionado = detectCode(temaRaw) || detectCode(rowText);
      var unidadNumero = detectUnit(unidadRaw) || detectUnit(temaRaw) || detectUnit(rowText);

      if (!actividad && !tipo && !semana && !resultadoAprendizaje && !temaRaw) return;

      var item = {
        orden: index + 1,
        unidad: unidadNumero || null,
        codigoRelacionado: codigoRelacionado,
        temaRelacionado: temaRaw,
        actividad: actividad || rowText,
        tipo: tipo,
        semana: semana,
        resultadoAprendizaje: resultadoAprendizaje,
        textoOriginal: rowText
      };

      var dedupeKey = [
        item.unidad || "x",
        compact(item.codigoRelacionado || "sin-codigo"),
        compact(item.actividad),
        compact(item.semana)
      ].join("|");

      if (usados[dedupeKey]) return;
      usados[dedupeKey] = true;

      if (unidadNumero >= 1 && unidadNumero <= 4) {
        unidades[unidadNumero - 1].actividades.push(item);
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
      warnings.push("El Archivo 3 no contiene filas con datos en la hoja principal.");
    }

    mapped.unidades.forEach(function eachUnit(unit) {
      if (!unit.actividades.length) {
        warnings.push("La Unidad " + unit.numero + " no tiene actividades detectadas.");
      }
    });

    if (mapped.sinUnidad.length) {
      warnings.push("Hay " + mapped.sinUnidad.length + " actividades sin unidad detectada.");
    }

    if (!mapped.columnasDetectadas.unidad) {
      warnings.push("No se detectó una columna clara de unidad; se intentó inferir desde el texto.");
    }

    if (!mapped.columnasDetectadas.actividad) {
      warnings.push("No se detectó una columna clara de actividad; se construyó la actividad combinando columnas.");
    }

    return warnings;
  }

  function summarize(mapped, rows) {
    return {
      totalFilasAnalizadas: rows.length,
      totalActividades: mapped.unidades.reduce(function sum(total, unit) {
        return total + unit.actividades.length;
      }, 0),
      totalSinUnidad: mapped.sinUnidad.length,
      porUnidad: mapped.unidades.map(function mapUnit(unit) {
        return {
          unidad: unit.numero,
          actividades: unit.actividades.length
        };
      })
    };
  }

  function interpret(lectura) {
    if (!lectura) {
      throw new Error("No se recibió lectura del Archivo 3.");
    }

    if (lectura.tipo !== "excel") {
      throw new Error("El Archivo 3 debe ser Excel para interpretar actividades.");
    }

    var rows = getPrimarySheetRows(lectura);
    var mapped = mapRowsToActivities(rows);

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
        asignacion: "Por columna de unidad, por código relacionado o por texto que mencione Unidad 1 a Unidad 4."
      }
    };
  }

  window.LibroCargaMateriaMapperActividades = {
    interpret: interpret
  };
})(window);
