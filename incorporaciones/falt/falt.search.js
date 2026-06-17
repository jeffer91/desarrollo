/*
=========================================================
Nombre completo: falt.search.js
Ruta o ubicación: /incorporaciones/falt/falt.search.js

Función o funciones:
1. Procesar el texto pegado en el pop-up de búsqueda.
2. Separar cédulas y nombres mezclados.
3. Buscar estudiantes únicamente dentro del período seleccionado.
4. Buscar cédulas de forma flexible, incluyendo casos sin cero inicial.
5. Buscar nombres con coincidencia flexible.
6. Clasificar resultados en encontrados, múltiples coincidencias y no encontrados.
7. Evitar duplicados antes de agregar estudiantes a la tabla.
8. Entregar resultados limpios a falt.app.js.

Con qué se conecta:
- falt.utils.js
- falt.state.js
- falt.data.js
- falt.app.js
- falt.table.js
=========================================================
*/

(function (window) {
  "use strict";

  var U = window.FaltUtils || {};

  function asText(value) {
    if (U.asText) return U.asText(value);
    return String(value == null ? "" : value).trim();
  }

  function normalizeText(value) {
    var text = asText(value);

    if (U.normalizeText) {
      return U.normalizeText(text);
    }

    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function keyText(value) {
    var text = normalizeText(value);
    return text.toUpperCase();
  }

  function onlyDigits(value) {
    return asText(value).replace(/\D+/g, "");
  }

  function normalizeCedula(value) {
    var digits = onlyDigits(value);

    if (!digits) return "";

    if (digits.length === 9) {
      return "0" + digits;
    }

    return digits;
  }

  function normalizeCedulaLoose(value) {
    var digits = onlyDigits(value);

    if (!digits) return "";

    return digits.replace(/^0+/, "");
  }

  function getCedula(row) {
    if (U.getCedula) return asText(U.getCedula(row));

    return asText(
      row &&
        (
          row.cedula ||
          row.Cedula ||
          row.CEDULA ||
          row.numeroIdentificacion ||
          row.identificacion ||
          row.documento
        )
    );
  }

  function getNombres(row) {
    if (U.getNombres) return asText(U.getNombres(row));

    return asText(
      row &&
        (
          row.Nombres ||
          row.nombres ||
          row.nombre ||
          row.Nombre ||
          row.estudiante ||
          row.Estudiante
        )
    );
  }

  function getCarrera(row) {
    if (U.getCarrera) return asText(U.getCarrera(row));

    return asText(
      row &&
        (
          row.Carrera ||
          row.carrera ||
          row.nombreCarrera ||
          row.NOMBRE_CARRERA ||
          row.programa
        )
    );
  }

  function getPeriodo(row, fallback) {
    return asText(
      row &&
        (
          row.periodo ||
          row.Periodo ||
          row.periodoAcademico ||
          row.periodoTexto ||
          row.periodoId
        )
    ) || asText(fallback);
  }

  function splitInput(rawText) {
    var text = asText(rawText);

    if (!text) return [];

    return text
      .split(/[\n,;|]+/g)
      .map(function (item) {
        return item.replace(/\s+/g, " ").trim();
      })
      .filter(Boolean);
  }

  function isCedulaQuery(query) {
    var digits = onlyDigits(query);
    return digits.length >= 6 && /^[\d\s.\-]+$/.test(asText(query));
  }

  function buildStudentSearchRecord(row, index, periodoId, periodoTexto) {
    var cedula = getCedula(row);
    var nombre = getNombres(row);
    var carrera = getCarrera(row);
    var periodo = getPeriodo(row, periodoTexto || periodoId);

    var cedulaNormal = normalizeCedula(cedula);
    var cedulaLoose = normalizeCedulaLoose(cedula);
    var nombreKey = normalizeText(nombre);
    var carreraKey = normalizeText(carrera);

    return {
      id: cedulaNormal || cedulaLoose || "falt_row_" + index,
      cedula: cedula,
      cedulaNormal: cedulaNormal,
      cedulaLoose: cedulaLoose,
      nombre: nombre,
      nombreKey: nombreKey,
      carrera: carrera,
      carreraKey: carreraKey,
      periodo: periodo,
      periodoId: asText(periodoId),
      periodoTexto: asText(periodoTexto) || asText(periodoId),
      raw: row,
      index: index
    };
  }

  function buildIndex(rows, periodoId, periodoTexto) {
    return (Array.isArray(rows) ? rows : []).map(function (row, index) {
      return buildStudentSearchRecord(row, index, periodoId, periodoTexto);
    });
  }

  function scoreName(query, student) {
    var q = normalizeText(query);
    var name = student.nombreKey;
    var carrera = student.carreraKey;

    if (!q || !name) return 0;

    if (name === q) return 100;
    if (name.indexOf(q) >= 0) return 88;

    var qParts = q.split(" ").filter(Boolean);
    var nameParts = name.split(" ").filter(Boolean);

    if (!qParts.length || !nameParts.length) return 0;

    var hits = 0;
    var starts = 0;

    qParts.forEach(function (part) {
      var foundExact = nameParts.indexOf(part) >= 0;
      var foundStart = nameParts.some(function (namePart) {
        return namePart.indexOf(part) === 0 || part.indexOf(namePart) === 0;
      });

      if (foundExact) hits += 1;
      else if (foundStart) starts += 1;
    });

    var ratio = (hits + starts * 0.7) / qParts.length;
    var score = Math.round(ratio * 78);

    if (qParts.length >= 2 && hits >= 2) {
      score += 10;
    }

    if (carrera && carrera.indexOf(q) >= 0) {
      score += 3;
    }

    return Math.min(score, 98);
  }

  function findByCedula(query, index) {
    var qNormal = normalizeCedula(query);
    var qLoose = normalizeCedulaLoose(query);

    if (!qNormal && !qLoose) return [];

    return index.filter(function (student) {
      return (
        (qNormal && student.cedulaNormal === qNormal) ||
        (qLoose && student.cedulaLoose === qLoose)
      );
    });
  }

  function findByName(query, index) {
    return index
      .map(function (student) {
        return {
          student: student,
          score: scoreName(query, student)
        };
      })
      .filter(function (item) {
        return item.score >= 58;
      })
      .sort(function (a, b) {
        return b.score - a.score;
      });
  }

  function uniqueByCedulaOrId(list) {
    var seen = {};
    var result = [];

    (list || []).forEach(function (item) {
      var student = item.student || item;
      var key =
        normalizeCedula(student.cedula) ||
        normalizeCedulaLoose(student.cedula) ||
        asText(student.id);

      if (!key || seen[key]) return;

      seen[key] = true;
      result.push(item);
    });

    return result;
  }

  function toSelectedStudent(student, motivoGeneral) {
    var raw = student.raw || {};
    var cedula = student.cedula || getCedula(raw);
    var nombre = student.nombre || getNombres(raw);
    var carrera = student.carrera || getCarrera(raw);

    var clone = Object.assign({}, raw);

    clone._falt = Object.assign({}, clone._falt || {}, {
      id: normalizeCedula(cedula) || normalizeCedulaLoose(cedula) || asText(student.id),
      cedula: cedula,
      nombre: nombre,
      carrera: carrera,
      periodo: student.periodo,
      periodoId: student.periodoId,
      periodoTexto: student.periodoTexto,
      motivo: motivoGeneral || "Pendiente de incorporación",
      origen: "busqueda_manual",
      agregadoEn: new Date().toISOString()
    });

    return clone;
  }

  function analyzeOne(query, index, options) {
    var opts = options || {};
    var motivoGeneral = opts.motivoGeneral || "Pendiente de incorporación";

    if (isCedulaQuery(query)) {
      var cedulaMatches = uniqueByCedulaOrId(findByCedula(query, index));

      if (cedulaMatches.length === 1) {
        return {
          query: query,
          type: "encontrado",
          selected: toSelectedStudent(cedulaMatches[0], motivoGeneral),
          matches: cedulaMatches
        };
      }

      if (cedulaMatches.length > 1) {
        return {
          query: query,
          type: "multiple",
          matches: cedulaMatches.map(function (student) {
            return {
              score: 100,
              selected: toSelectedStudent(student, motivoGeneral),
              student: student
            };
          })
        };
      }
    }

    var nameMatches = uniqueByCedulaOrId(findByName(query, index));

    if (nameMatches.length === 1 && nameMatches[0].score >= 72) {
      return {
        query: query,
        type: "encontrado",
        selected: toSelectedStudent(nameMatches[0].student, motivoGeneral),
        matches: nameMatches
      };
    }

    if (nameMatches.length > 0) {
      var bestScore = nameMatches[0].score;
      var strongMatches = nameMatches.filter(function (item) {
        return item.score >= Math.max(58, bestScore - 18);
      });

      return {
        query: query,
        type: "multiple",
        matches: strongMatches.slice(0, 8).map(function (item) {
          return {
            score: item.score,
            selected: toSelectedStudent(item.student, motivoGeneral),
            student: item.student
          };
        })
      };
    }

    return {
      query: query,
      type: "no_encontrado",
      matches: []
    };
  }

  function procesar(rawText, rows, options) {
    var opts = options || {};
    var queries = splitInput(rawText);
    var index = buildIndex(rows, opts.periodoId, opts.periodoTexto);

    var encontrados = [];
    var multiples = [];
    var noEncontrados = [];

    queries.forEach(function (query) {
      var result = analyzeOne(query, index, opts);

      if (result.type === "encontrado") {
        encontrados.push(result);
      } else if (result.type === "multiple") {
        multiples.push(result);
      } else {
        noEncontrados.push(result);
      }
    });

    return {
      totalConsultas: queries.length,
      encontrados: encontrados,
      multiples: multiples,
      noEncontrados: noEncontrados,
      creadoEn: new Date().toISOString()
    };
  }

  function deduplicarSeleccionados(list) {
    var seen = {};
    var result = [];

    (list || []).forEach(function (row) {
      var meta = row && row._falt ? row._falt : {};
      var cedula = meta.cedula || getCedula(row);
      var key = normalizeCedula(cedula) || normalizeCedulaLoose(cedula) || asText(meta.id);

      if (!key || seen[key]) return;

      seen[key] = true;
      result.push(row);
    });

    return result;
  }

  window.FaltSearch = {
    procesar: procesar,
    splitInput: splitInput,
    normalizeCedula: normalizeCedula,
    normalizeCedulaLoose: normalizeCedulaLoose,
    deduplicarSeleccionados: deduplicarSeleccionados,
    toSelectedStudent: toSelectedStudent
  };
})(window);