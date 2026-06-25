/*
Nombre del archivo: mat.masiva.parser.js
Ubicación: /Curriculo/materias/frontend/carga-masiva/mat.masiva.parser.js
Función:
- Analizar texto pegado en carga masiva
- Limpiar ruido institucional, encabezados, numeración y filas de tabla
- Detectar niveles escritos como Nivel 1, 1 Nivel, Primer nivel, Ciclo 1 o Semestre 1
- Devolver vista previa consistente para materias, transversales, núcleos y ejes
*/

(function (window) {
  "use strict";

  window.MAT = window.MAT || {};
  var MAT = window.MAT;

  MAT.masiva = MAT.masiva || {};
  MAT.masiva.parser = MAT.masiva.parser || {};

  var NOISE_EXACT = Object.create(null);
  [
    "malla curricular",
    "plan de estudios",
    "pensum",
    "asignatura",
    "asignaturas",
    "materia",
    "materias",
    "codigo",
    "código",
    "creditos",
    "créditos",
    "horas",
    "nivel",
    "n nivel",
    "numero",
    "nro",
    "no"
  ].forEach(function (item) { NOISE_EXACT[normKey(item)] = true; });

  var NOISE_PATTERNS = [
    /^instituci[oó]n\s*:/i,
    /^nombre\s+completo\s+visible\s*:/i,
    /^nombre\s+visible\s*:/i,
    /^malla\s+curricular\b/i,
    /^listado\s+de\s+asignaturas\b/i,
    /^plan\s+de\s+estudios\b/i,
    /^pensum\b/i,
    /^c[oó]digo\b/i,
    /^cr[eé]ditos?\b/i,
    /^horas?\b/i,
    /^total\b/i,
    /^observaci[oó]n\b/i,
    /^modalidad\b/i,
    /^periodo\b/i,
    /^semestre\b$/i,
    /^ciclo\b$/i
  ];

  function stripAccents(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function cleanText(value) {
    return String(value || "")
      .replace(/\u00a0/g, " ")
      .replace(/[\t]+/g, " | ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normKey(value) {
    return stripAccents(cleanText(value))
      .toLowerCase()
      .replace(/[º°]/g, "")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value == null ? null : value)); }
    catch (error) { return value; }
  }

  function splitLines(raw) {
    return String(raw || "")
      .split(/\r?\n/)
      .map(cleanText)
      .filter(Boolean);
  }

  function listSummary() {
    return { nivel1: [], nivel2: [], nivel3: [], nivel4: [], sinNivel: [] };
  }

  function addMeta(meta, type, line, reason) {
    meta[type].push({ line: String(line || ""), reason: String(reason || "") });
  }

  function mapLevelToken(token) {
    var key = normKey(token);
    if (["1", "i", "primer", "primero", "1er", "uno"].indexOf(key) >= 0) return "1";
    if (["2", "ii", "segundo", "2do", "dos"].indexOf(key) >= 0) return "2";
    if (["3", "iii", "tercero", "3er", "tres"].indexOf(key) >= 0) return "3";
    if (["4", "iv", "cuarto", "4to", "cuatro"].indexOf(key) >= 0) return "4";
    return "";
  }

  function isCareerTitle(line, options, beforeFirstLevel) {
    var careerName = options && options.careerName ? String(options.careerName) : "";
    if (!careerName || !beforeFirstLevel) return false;
    return normKey(line) === normKey(careerName);
  }

  function isNoise(line) {
    var value = cleanText(line);
    var key = normKey(value);
    var i;
    if (!value) return true;
    if (NOISE_EXACT[key]) return true;
    for (i = 0; i < NOISE_PATTERNS.length; i += 1) {
      if (NOISE_PATTERNS[i].test(value)) return true;
    }
    return false;
  }

  function stripListPrefix(value) {
    return cleanText(value)
      .replace(/^[\-\*\•\·\▪\▫\‣\–\—]+\s*/, "")
      .replace(/^\(?\d{1,3}\)?\s*[\.\-\)]\s*/, "")
      .replace(/^[a-z]\)\s*/i, "")
      .trim();
  }

  function stripTablePrefix(value) {
    var text = stripListPrefix(value);
    var match = text.match(/^\(?([1-9]|[12]\d|30)\)?\s+(.*)$/);
    if (match && /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(match[2])) return cleanText(match[2]);
    return text;
  }

  function splitCells(line) {
    return String(line || "")
      .split(/\s*\|\s*|\t+/)
      .map(cleanText)
      .filter(Boolean);
  }

  function looksLikeLevelOnly(value) {
    var key = normKey(value);
    return /^(nivel|niv|ciclo|semestre|periodo|período)\s*(1|2|3|4|i|ii|iii|iv|primer|primero|segundo|tercero|cuarto|1er|2do|3er|4to)$/.test(key) ||
      /^(1|2|3|4|i|ii|iii|iv|primer|primero|segundo|tercero|cuarto|1er|2do|3er|4to)\s*(nivel|niv|ciclo|semestre|periodo)$/.test(key);
  }

  function extractLevel(line) {
    var value = stripListPrefix(line);
    var match;
    var level;
    var rest;

    match = value.match(/^(?:nivel|niv\.?|ciclo|semestre|per[ií]odo)\s*(1|2|3|4|i{1,3}|iv|primer|primero|segundo|tercero|cuarto|1er|2do|3er|4to)\b[\s:.\-–—|]*(.*)$/i);
    if (!match) match = value.match(/^(1|2|3|4|i{1,3}|iv|primer|primero|segundo|tercero|cuarto|1er|2do|3er|4to)\s*(?:nivel|niv\.?|ciclo|semestre|per[ií]odo)\b[\s:.\-–—|]*(.*)$/i);

    if (!match) return { level: "", text: value };

    level = mapLevelToken(match[1]);
    rest = cleanText(match[2] || "");
    return { level: level, text: rest };
  }

  function chooseBestCell(line) {
    var cells = splitCells(line);
    var best = "";

    if (cells.length <= 1) return line;

    cells.forEach(function (cell) {
      var cleaned = stripTablePrefix(cell);
      var key = normKey(cleaned);
      if (!cleaned) return;
      if (/^\d+$/.test(key)) return;
      if (/^(nivel|ciclo|semestre|periodo)\s*\d+$/.test(key)) return;
      if (/^(\d+|\d+\.\d+)$/.test(key)) return;
      if (isNoise(cleaned)) return;
      if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(cleaned)) return;
      if (cleaned.length > best.length) best = cleaned;
    });

    return best || line;
  }

  function sanitizeSubject(line) {
    var value = chooseBestCell(line);
    value = stripTablePrefix(value);
    value = cleanText(value)
      .replace(/^[:.\-–—|]+\s*/, "")
      .replace(/\s*[:.\-–—|]+\s*$/g, "")
      .replace(/\s+\d+(?:\.\d+)?\s*(?:cr[eé]ditos?|horas?)?$/i, "")
      .trim();

    if (!value) return "";
    if (isNoise(value)) return "";
    if (looksLikeLevelOnly(value)) return "";
    return value;
  }

  function addUnique(list, value, seen) {
    var item = cleanText(value);
    var key = normKey(item);
    if (!item || !key || seen[key]) return false;
    seen[key] = true;
    list.push(item);
    return true;
  }

  function parseGrouped(raw, options) {
    var lines = splitLines(raw);
    var summary = listSummary();
    var meta = { parser: "curriculo-masiva-v2", accepted: [], discarded: [], warnings: [], hasLevelHeaders: false };
    var currentLevel = "";
    var seen = Object.create(null);

    lines.forEach(function (line) {
      var beforeFirstLevel = !meta.hasLevelHeaders;
      var levelInfo;
      var candidate;
      var target;

      if (isCareerTitle(line, options, beforeFirstLevel)) {
        addMeta(meta, "discarded", line, "titulo-carrera");
        return;
      }

      if (isNoise(line)) {
        addMeta(meta, "discarded", line, "ruido");
        return;
      }

      levelInfo = extractLevel(line);
      if (levelInfo.level) {
        currentLevel = "nivel" + levelInfo.level;
        meta.hasLevelHeaders = true;
        if (!levelInfo.text) {
          addMeta(meta, "discarded", line, "encabezado-nivel");
          return;
        }
        candidate = sanitizeSubject(levelInfo.text);
        if (!candidate) {
          addMeta(meta, "discarded", line, "contenido-descartado");
          return;
        }
        target = currentLevel;
      } else {
        candidate = sanitizeSubject(line);
        if (!candidate) {
          addMeta(meta, "discarded", line, "linea-descartada");
          return;
        }
        target = currentLevel || "sinNivel";
      }

      if (addUnique(summary[target], candidate, seen)) meta.accepted.push(candidate);
      else addMeta(meta, "discarded", line, "duplicado");
    });

    if (!meta.hasLevelHeaders && meta.accepted.length) meta.warnings.push("No se detectaron niveles. Los elementos quedaron en Sin nivel.");
    else if (summary.sinNivel.length) meta.warnings.push("Hay elementos fuera de los niveles definidos.");

    return { lines: lines, summary: summary, meta: meta };
  }

  function parseFlat(raw, options) {
    var lines = splitLines(raw);
    var items = [];
    var meta = { parser: "curriculo-flat-v2", accepted: [], discarded: [], warnings: [], hasLevelHeaders: false };
    var seen = Object.create(null);

    lines.forEach(function (line) {
      var beforeFirstLevel = !meta.hasLevelHeaders;
      var levelInfo;
      var candidate;

      if (isCareerTitle(line, options, beforeFirstLevel)) {
        addMeta(meta, "discarded", line, "titulo-carrera");
        return;
      }

      if (isNoise(line)) {
        addMeta(meta, "discarded", line, "ruido");
        return;
      }

      levelInfo = extractLevel(line);
      if (levelInfo.level) {
        meta.hasLevelHeaders = true;
        candidate = sanitizeSubject(levelInfo.text || "");
      } else {
        candidate = sanitizeSubject(line);
      }

      if (!candidate) {
        addMeta(meta, "discarded", line, "linea-descartada");
        return;
      }

      if (addUnique(items, candidate, seen)) meta.accepted.push(candidate);
      else addMeta(meta, "discarded", line, "duplicado");
    });

    return { lines: lines, items: items, meta: meta };
  }

  function countGrouped(summary) {
    return ["nivel1", "nivel2", "nivel3", "nivel4", "sinNivel"].reduce(function (total, key) {
      return total + (Array.isArray(summary[key]) ? summary[key].length : 0);
    }, 0);
  }

  function buildGrouped(kind, parsed) {
    return {
      kind: kind,
      totalLines: countGrouped(parsed.summary),
      rawLines: parsed.lines.slice(),
      source: "massive",
      summary: clone(parsed.summary),
      meta: clone(parsed.meta)
    };
  }

  function buildFlat(kind, parsed, careerType) {
    var expected = 0;
    if (kind === "nucleos") expected = Number((MAT.config && MAT.config.limits && MAT.config.limits.nucleos && MAT.config.limits.nucleos.exactTotal) || 4);
    else if (kind === "ejes") expected = MAT.carreras && typeof MAT.carreras.getEjesEsperados === "function" ? MAT.carreras.getEjesEsperados(careerType || "") : 4;

    return {
      kind: kind,
      totalLines: parsed.items.length,
      rawLines: parsed.lines.slice(),
      source: "massive",
      summary: { expected: expected, total: parsed.items.length, items: parsed.items.slice() },
      meta: clone(parsed.meta)
    };
  }

  MAT.masiva.parser.analyze = function (raw, loadType, careerType, options) {
    var kind = cleanText(loadType || (MAT.state && MAT.state.data && MAT.state.data.selectedLoadType) || "");
    var opts = options || {};
    var careerName = opts.careerName || (MAT.state && MAT.state.data && MAT.state.data.selectedCareerName) || "";
    var parsed;

    opts.careerName = careerName;
    opts.loadType = kind;

    if (!kind) throw new Error("MAT: Debes seleccionar qué vas a subir.");

    if (kind === "materias-carrera" || kind === "transversales") {
      parsed = parseGrouped(raw, opts);
      return buildGrouped(kind, parsed);
    }

    if (kind === "nucleos" || kind === "ejes") {
      parsed = parseFlat(raw, opts);
      return buildFlat(kind, parsed, careerType || (MAT.state && MAT.state.data && MAT.state.data.selectedCareerType) || "");
    }

    throw new Error("MAT: Tipo de carga no reconocido: " + kind);
  };

  MAT.masiva.parser.countAccepted = function (analysis) {
    if (!analysis || !analysis.summary) return 0;
    if (analysis.kind === "materias-carrera" || analysis.kind === "transversales") return countGrouped(analysis.summary);
    return Array.isArray(analysis.summary.items) ? analysis.summary.items.length : 0;
  };
})(window);
