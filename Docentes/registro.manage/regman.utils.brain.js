/* =========================================================
Nombre del archivo: regman.utils.brain.js
Ruta - Ubicación: /registro.manage/regman.utils.brain.js
Función:
- "Cerebro" del parser: normalización + heurísticas + parsePegadoDocentes inteligente
- Soporta pegado con tabs, CSV, texto corrido y filas partidas
- Detecta carrera dentro de la línea usando el catálogo real
- Soporta cédulas de 9 dígitos agregando 0 adelante
- Mejora la separación de nombres/apellidos con heurística hispana
========================================================= */

// Helpers internos (evita dependencias/ciclos)
function s(x){
  return (x === null || x === undefined) ? "" : String(x);
}

function cleanSpaces(str){
  return s(str).replace(/\s+/g, " ").trim();
}

function removeDiacritics(x){
  return s(x).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normKey(x){
  // clave normalizada (minúsculas, sin tildes, espacios colapsados)
  return cleanSpaces(removeDiacritics(x).toLowerCase());
}

function cleanCell(x){
  // limpia una celda pegada (quita comillas, tabs, NBSP, colapsa espacios)
  let v = s(x).replace(/\u00A0/g, " ").trim();
  v = v.replace(/^"+|"+$/g, "").trim();
  v = v.replace(/\s+/g, " ").trim();
  return v;
}

function onlyDigits(x){
  return /^[0-9]+$/.test(s(x));
}

function isCedulaToken(x){
  return /^[0-9]{9,10}$/.test(cleanCell(x).replace(/\s+/g, ""));
}

function normalizeCedulaValue(x){
  let ced = cleanCell(x).replace(/\s+/g, "");
  if (/^[0-9]{9}$/.test(ced)) ced = `0${ced}`;
  return ced;
}

function splitLine(line){
  // Excel/Sheets pega TSV (tab) casi siempre
  // Soporta tabla Markdown con pipes: | col1 | col2 |
  const l = s(line);
  if (l.includes("\t")) return l.split("\t");
  if (l.includes(";")) return l.split(";");
  if (l.includes("|")) return l.split("|").map(x => x.trim()).filter(Boolean);
  return l.split(",");
}

function isSeparatorLine(line){
  // ignora separadores Markdown: |-----| y | -: | --- |
  const sepCheck = s(line).replace(/[|\-:]/g, "").trim();
  return !sepCheck;
}

function normalizeHeaderKey(k){
  const nk = normKey(k);

  if (
    nk === "cedula" ||
    nk === "ced." ||
    nk === "ced" ||
    nk === "ci" ||
    nk === "documento" ||
    nk === "id" ||
    nk === "cedula de identidad" ||
    nk === "cedula identidad" ||
    nk === "cedula de" ||
    nk === "cedula de identidad tiene"
  ) return "cedula";

  if (nk === "nombres" || nk === "nombre" || nk === "name") return "nombres";

  if (nk === "apellidos" || nk === "apellido" || nk === "lastname" || nk === "last name") {
    return "apellidos";
  }

  if (
    nk === "nombre completo" ||
    nk === "nombres y apellidos" ||
    nk === "nombre y apellido" ||
    nk === "full name" ||
    nk === "nombrecompleto" ||
    nk === "nombresapellidos"
  ) return "fullName";

  if (nk === "carrera" || nk === "plan" || nk === "tipo" || nk === "programa" || nk === "carrera/plan") {
    return "carrera";
  }

  if (nk === "sexo" || nk === "genero" || nk === "género" || nk === "gender") return "sexo";

  if (nk === "n" || nk === "no" || nk === "nº" || nk === "num" || nk === "numero" || nk === "número" || nk === "#") {
    return "num";
  }

  return nk;
}

function parseSexoCell(sexoCell){
  const sk = normKey(sexoCell);
  if (!sk) return "";
  if (sk === "f") return "F";
  if (sk === "m") return "M";
  if (sk.startsWith("muj") || sk.startsWith("fem")) return "F";
  if (sk.startsWith("hom") || sk.startsWith("masc")) return "M";
  return "";
}

const COMMON_GIVEN_NAMES = new Set([
  "aaron","adriana","alex","alexander","alexandra","alexis","alicia","ana","andrea","andres","angel","angela",
  "anthony","antonio","bayron","balwin","bryan","camila","carolina","carlos","carmen","cecilia","chenoa",
  "cinthia","cristian","daniel","daniela","danny","darwin","david","diego","domenica","edgar","eduardo",
  "evelyn","esteban","esthela","fabian","fabricio","fernando","francisco","gabriela","geovanny","gloria",
  "harold","hector","ivan","ivanna","ivonne","jairo","janneth","javier","jefferson","jessica",
  "jimmy","jorge","jose","joselyn","josue","juan","julio","karina","katherine","katheryn","kevin","kenia",
  "laura","lilibeth","lisbeth","luis","luisa","manuel","marcela","maria","marjorie",
  "martha","mateo","mayra","melissa","michael","miguel","mishell","monica","myra","nelson","nicole",
  "pablo","paola","pamela","patricio","paul","paulina","raul","ricardo","roberto","rodrigo","romina",
  "santiago","sebastian","sonia","stalin","steffi","tatiana","veronica","viviana","wladimir","willian","william",
  "ximena","yesenia","yolanda"
]);

function tokenizeWords(text){
  return cleanSpaces(text).split(" ").filter(Boolean);
}

function countLikelyGivenNames(tokens){
  let score = 0;
  for (const t of (tokens || [])){
    const k = normKey(t);
    if (COMMON_GIVEN_NAMES.has(k)) score += 1;
  }
  return score;
}

function scoreSplit(nameTokens, surnameTokens){
  let score = 0;
  const nameHits = countLikelyGivenNames(nameTokens);
  const surnameHits = countLikelyGivenNames(surnameTokens);

  score += (nameHits * 5);
  score -= (surnameHits * 3);

  if (nameTokens.length >= 1 && nameTokens.length <= 3) score += 2;
  if (surnameTokens.length >= 1 && surnameTokens.length <= 3) score += 1;
  if (nameTokens.length === 2) score += 1.5;
  if (surnameTokens.length === 2) score += 1;

  return score;
}

function splitFullNameSmart(full){
  const t = tokenizeWords(full);
  if (!t.length) return { nombres: "", apellidos: "" };
  if (t.length === 1) return { nombres: t[0], apellidos: "" };
  if (t.length === 2) return { nombres: t[0], apellidos: t[1] };

  let best = null;

  for (let cut = 1; cut < t.length; cut++){
    const left = t.slice(0, cut);
    const right = t.slice(cut);

    const optionNamesFirst = {
      nombres: left.join(" "),
      apellidos: right.join(" "),
      score: scoreSplit(left, right),
      tieBias: 1
    };

    const optionSurnamesFirst = {
      nombres: right.join(" "),
      apellidos: left.join(" "),
      score: scoreSplit(right, left),
      tieBias: 0
    };

    for (const option of [optionNamesFirst, optionSurnamesFirst]){
      if (!best || option.score > best.score || (option.score === best.score && option.tieBias > best.tieBias)){
        best = option;
      }
    }
  }

  if (!best) return { nombres: t.slice(0, -2).join(" "), apellidos: t.slice(-2).join(" ") };
  return { nombres: best.nombres, apellidos: best.apellidos };
}

function resolveCarrera({ carreraCell, careersIndex, careersNameToId }){
  const cell = cleanCell(carreraCell);
  const key = normKey(cell);

  let carreraId = "";

  if (cell && careersIndex && careersIndex[cell]){
    carreraId = cell;
  }else if (key && careersNameToId && careersNameToId[key]){
    carreraId = careersNameToId[key];
  }else if (key && careersIndex){
    for (const [id, name] of Object.entries(careersIndex)){
      if (normKey(name) === key){
        carreraId = id;
        break;
      }
    }
  }

  const carreraNombre = (careersIndex && carreraId) ? (careersIndex[carreraId] || "") : "";
  return { carreraId, carreraNombre };
}

function detectOffsetNoHeader(cols){
  const c0 = cleanCell(cols[0]);
  if (!c0) return 0;
  if (/^[0-9]{1,4}$/.test(c0) && cols.length >= 4) return 1;
  return 0;
}

function isPageFooterLine(line){
  const t = cleanSpaces(line);
  return /^p[aá]gina\s+\d+\s*\|\s*\d+/i.test(t);
}

function hasCedulaToken(tokens){
  return tokens.some(t => isCedulaToken(t));
}

function mergeWrappedLines(lines){
  const out = [];

  for (let i = 0; i < lines.length; i++){
    let cur = cleanSpaces(lines[i]);
    if (!cur) continue;
    if (isPageFooterLine(cur)) continue;

    if (/c[eé]dula\s+de$/i.test(cur) && lines[i + 1]){
      const nx = cleanSpaces(lines[i + 1]);
      cur = cleanSpaces(cur + " " + nx);
      i++;
      out.push(cur);
      continue;
    }

    if (lines[i + 1]){
      const t0 = cur.split(/\s+/).filter(Boolean);
      const next = cleanSpaces(lines[i + 1]);
      const t1 = next.split(/\s+/).filter(Boolean);

      if (!hasCedulaToken(t0) && hasCedulaToken(t1)){
        const looksRow = /^[0-9]{1,4}\b/.test(cur) || /[a-záéíóúñ]/i.test(cur);
        if (looksRow){
          cur = cleanSpaces(cur + " " + next);
          i++;
        }
      }
    }

    out.push(cur);
  }

  return out;
}

function buildCareerCatalog(careersIndex, careersNameToId){
  const map = new Map();

  for (const [id, name] of Object.entries(careersIndex || {})){
    const n = cleanCell(name);
    const key = normKey(n);
    if (!key) continue;
    map.set(key, {
      carreraId: String(id),
      carreraNombre: n,
      normName: key,
      tokens: key.split(" ").filter(Boolean)
    });
  }

  for (const [keyRaw, id] of Object.entries(careersNameToId || {})){
    const key = normKey(keyRaw);
    if (!key) continue;
    if (map.has(key)) continue;

    const display = (careersIndex && id && careersIndex[id]) ? careersIndex[id] : cleanCell(keyRaw);
    map.set(key, {
      carreraId: String(id || ""),
      carreraNombre: display,
      normName: key,
      tokens: key.split(" ").filter(Boolean)
    });
  }

  return Array.from(map.values()).sort((a, b) => {
    if (b.tokens.length !== a.tokens.length) return b.tokens.length - a.tokens.length;
    return b.normName.length - a.normName.length;
  });
}

function findCareerInTokenRange(tokens, careerCatalog, startIdx, endIdxExclusive){
  if (!Array.isArray(tokens) || !tokens.length || !Array.isArray(careerCatalog) || !careerCatalog.length){
    return null;
  }

  const normTokens = tokens.map(t => normKey(t));
  let best = null;

  for (const career of careerCatalog){
    const ct = career.tokens || [];
    if (!ct.length) continue;
    if ((endIdxExclusive - startIdx) < ct.length) continue;

    for (let i = startIdx; i <= (endIdxExclusive - ct.length); i++){
      let ok = true;
      for (let j = 0; j < ct.length; j++){
        if (normTokens[i + j] !== ct[j]){
          ok = false;
          break;
        }
      }

      if (!ok) continue;

      const hit = {
        start: i,
        end: i + ct.length,
        carreraId: career.carreraId || "",
        carreraNombre: career.carreraNombre || ""
      };

      if (!best){
        best = hit;
        continue;
      }

      const bestLen = best.end - best.start;
      const curLen = hit.end - hit.start;

      if (curLen > bestLen || (curLen === bestLen && hit.start < best.start)){
        best = hit;
      }
    }
  }

  return best;
}

function parseLoosePdfRow(line, ctx){
  const txt = cleanSpaces(line);
  if (!txt) return null;

  const tokens = txt.split(/\s+/).filter(Boolean);
  if (tokens.length < 3) return null;

  let startIdx = 0;
  if (/^[0-9]{1,4}$/.test(tokens[0])) startIdx = 1;

  const cedIdx = tokens.findIndex(t => isCedulaToken(t));
  if (cedIdx < 0) return null;

  const sexoCell = parseSexoCell(tokens[tokens.length - 1]) ? tokens[tokens.length - 1] : "";
  const cedula = normalizeCedulaValue(tokens[cedIdx]);

  let carreraCell = "";
  let fullName = "";

  const careerHit = findCareerInTokenRange(tokens, ctx.careerCatalog, startIdx, cedIdx);
  if (careerHit && careerHit.start >= startIdx && careerHit.end <= cedIdx){
    fullName = cleanSpaces(tokens.slice(startIdx, careerHit.start).join(" "));
    carreraCell = careerHit.carreraNombre || cleanSpaces(tokens.slice(careerHit.start, careerHit.end).join(" "));
  }else{
    fullName = cleanSpaces(tokens.slice(startIdx, cedIdx).join(" "));
  }

  if (!fullName || !cedula) return null;
  return { cedula, fullName, sexoCell, carreraCell };
}

function splitNameFromCells(nameCells){
  const cells = (nameCells || []).map(cleanCell).filter(Boolean);
  if (!cells.length) return { nombres: "", apellidos: "" };

  if (cells.length === 1){
    return splitFullNameSmart(cells[0]);
  }

  if (cells.length >= 2){
    const a = cells[0];
    const b = cells[1];
    const sa = scoreSplit(tokenizeWords(a), tokenizeWords(b));
    const sb = scoreSplit(tokenizeWords(b), tokenizeWords(a));

    if (sb > sa){
      return { nombres: b, apellidos: a };
    }

    return { nombres: a, apellidos: b };
  }

  return { nombres: "", apellidos: "" };
}

function parseStructuredNoHeader(cols, ctx){
  const cells = (cols || []).map(cleanCell).filter(x => x !== "");
  if (!cells.length) return null;

  const off = detectOffsetNoHeader(cells);
  const work = cells.slice(off);
  if (!work.length) return null;

  const cedIdx = work.findIndex(x => isCedulaToken(x));
  const careerHits = work.map((x, idx) => ({
    idx,
    res: resolveCarrera({
      carreraCell: x,
      careersIndex: ctx.careersIndex,
      careersNameToId: ctx.careersNameToId
    })
  })).filter(x => x.res && (x.res.carreraId || x.res.carreraNombre));

  const careerIdx = careerHits.length ? careerHits[0].idx : -1;
  const careerRes = careerHits.length ? careerHits[0].res : { carreraId: "", carreraNombre: "" };

  let cedula = cedIdx >= 0 ? normalizeCedulaValue(work[cedIdx]) : "";
  let carreraCell = careerIdx >= 0 ? (careerRes.carreraNombre || work[careerIdx]) : "";
  let sexoCell = "";
  let nombres = "";
  let apellidos = "";

  // Caso fuerte: [FullName, Carrera, Cédula]
  if (work.length === 3 && cedIdx === 2 && careerIdx === 1){
    const sp = splitFullNameSmart(work[0]);
    nombres = sp.nombres;
    apellidos = sp.apellidos;
    return { cedula, nombres, apellidos, carreraCell, sexoCell };
  }

  // Caso fuerte: [FullName, Cédula, Carrera]
  if (work.length === 3 && cedIdx === 1 && careerIdx === 2){
    const sp = splitFullNameSmart(work[0]);
    nombres = sp.nombres;
    apellidos = sp.apellidos;
    return { cedula, nombres, apellidos, carreraCell, sexoCell };
  }

  // Caso fuerte: [Cédula, FullName, Carrera]
  if (work.length === 3 && cedIdx === 0 && careerIdx === 2){
    const sp = splitFullNameSmart(work[1]);
    nombres = sp.nombres;
    apellidos = sp.apellidos;
    return { cedula, nombres, apellidos, carreraCell, sexoCell };
  }

  // Buscar sexo si viene explícito
  const sexoIdx = work.findIndex((x, idx) => idx !== cedIdx && parseSexoCell(x));
  if (sexoIdx >= 0) sexoCell = work[sexoIdx];

  const cutIdx = [cedIdx, careerIdx, sexoIdx].filter(x => x >= 0);
  const boundary = cutIdx.length ? Math.min(...cutIdx) : work.length;

  let nameCells = work
    .map((value, idx) => ({ value, idx }))
    .filter(item => item.idx < boundary)
    .filter(item => item.idx !== cedIdx && item.idx !== careerIdx && item.idx !== sexoIdx)
    .map(item => item.value)
    .filter(Boolean);

  if (!nameCells.length){
    nameCells = work
      .map((value, idx) => ({ value, idx }))
      .filter(item => item.idx !== cedIdx && item.idx !== careerIdx && item.idx !== sexoIdx)
      .map(item => item.value)
      .filter(Boolean);
  }

  // Caso muy común: [Nombres, Apellidos, Cédula, Carrera]
  if (nameCells.length >= 2){
    const split = splitNameFromCells(nameCells.slice(0, 2));
    nombres = split.nombres;
    apellidos = split.apellidos;
  }else if (nameCells.length === 1){
    const split = splitFullNameSmart(nameCells[0]);
    nombres = split.nombres;
    apellidos = split.apellidos;
  }

  // Fallback adicional: si no hubo carrera en columna, buscarla dentro del texto antes de la cédula
  if ((!carreraCell || !careerRes.carreraId) && cedIdx >= 0){
    const prefixText = cleanSpaces(work.slice(0, cedIdx).join(" "));
    const loose = parseLoosePdfRow(prefixText + " " + work[cedIdx], ctx);
    if (loose && loose.carreraCell){
      carreraCell = loose.carreraCell;
      if ((!nombres || !apellidos) && loose.fullName){
        const sp = splitFullNameSmart(loose.fullName);
        nombres = sp.nombres;
        apellidos = sp.apellidos;
      }
    }
  }

  return { cedula, nombres, apellidos, carreraCell, sexoCell };
}

/**
 * parsePegadoDocentes (CEREBRO)
 * Soporta:
 * - Markdown pipes con o sin Nº
 * - Sin header (autodetección)
 * - Nombre completo en una sola columna
 * - Pegado desde PDF / texto corrido (sin separadores) + nombres en 2 líneas
 * - [FullName, Carrera, Cédula]
 * - [FullName, Cédula, Carrera]
 * - [Cédula, FullName, Carrera]
 * - Cédulas de 9 dígitos -> se completa 0 adelante
 */
export function parsePegadoDocentes({ text, careersIndex, careersNameToId }){
  const raw = cleanSpaces(text || "");
  if (!raw){
    return { rows: [], stats: { total: 0, parsed: 0, skipped: 0, hasHeader: false } };
  }

  const lines = mergeWrappedLines(
    s(text)
      .split(/\r?\n/)
      .map(l => s(l).trim())
      .filter(Boolean)
  );

  if (!lines.length){
    return { rows: [], stats: { total: 0, parsed: 0, skipped: 0, hasHeader: false } };
  }

  const ctx = {
    careersIndex: careersIndex || {},
    careersNameToId: careersNameToId || {},
    careerCatalog: buildCareerCatalog(careersIndex || {}, careersNameToId || {})
  };

  let firstDataLineIdx = 0;
  while (firstDataLineIdx < lines.length && isSeparatorLine(lines[firstDataLineIdx])) firstDataLineIdx++;

  if (firstDataLineIdx >= lines.length){
    return { rows: [], stats: { total: 0, parsed: 0, skipped: 0, hasHeader: false } };
  }

  const firstColsRaw = splitLine(lines[firstDataLineIdx]).map(cleanCell);
  const firstKeysRaw = firstColsRaw.map(normalizeHeaderKey);

  const headerSignals = [
    "nombres","apellidos","cedula","carrera","sexo","fullName",
    "name","lastname","last name","genero","gender","plan","tipo",
    "cedula de identidad"
  ].map(normalizeHeaderKey);

  const hasHeader = firstKeysRaw.some(k => headerSignals.includes(k));
  const headerMap = Object.create(null);

  if (hasHeader){
    for (let i = 0; i < firstKeysRaw.length; i++){
      const k = firstKeysRaw[i];
      if (k) headerMap[k] = i;
    }
  }

  function getCol(cols, headerKey, fallbackIdx){
    if (hasHeader){
      const hk = normalizeHeaderKey(headerKey);
      const idx = headerMap[hk];
      return (idx !== undefined && idx !== null) ? cleanCell(cols[idx]) : "";
    }
    return cleanCell(cols[fallbackIdx]);
  }

  const out = [];
  let parsed = 0;
  let skipped = 0;
  const start = hasHeader ? (firstDataLineIdx + 1) : firstDataLineIdx;

  for (let i = start; i < lines.length; i++){
    if (isSeparatorLine(lines[i])) continue;
    if (isPageFooterLine(lines[i])) continue;

    const cols = splitLine(lines[i]).map(cleanCell);
    if (!cols.length) continue;

    let cedula = "";
    let nombres = "";
    let apellidos = "";
    let carreraCell = "";
    let sexoCell = "";

    if (hasHeader){
      cedula = normalizeCedulaValue(getCol(cols, "cedula", 0));
      nombres = getCol(cols, "nombres", 0);
      apellidos = getCol(cols, "apellidos", 1);
      carreraCell = getCol(cols, "carrera", 3);
      sexoCell = getCol(cols, "sexo", 4);

      const fullName = getCol(cols, "fullName", -1);
      if (fullName && (!nombres || !apellidos)){
        const sp = splitFullNameSmart(fullName);
        if (!nombres) nombres = sp.nombres;
        if (!apellidos) apellidos = sp.apellidos;
      }
    }else{
      if (cols.length === 1){
        const loose = parseLoosePdfRow(cols[0], ctx);
        if (!loose){
          skipped++;
          continue;
        }

        cedula = normalizeCedulaValue(loose.cedula);
        sexoCell = loose.sexoCell || "";
        carreraCell = loose.carreraCell || "";

        const sp = splitFullNameSmart(loose.fullName);
        nombres = sp.nombres;
        apellidos = sp.apellidos;
      }else{
        const parsedStructured = parseStructuredNoHeader(cols, ctx);
        if (!parsedStructured){
          skipped++;
          continue;
        }

        cedula = normalizeCedulaValue(parsedStructured.cedula);
        nombres = cleanCell(parsedStructured.nombres);
        apellidos = cleanCell(parsedStructured.apellidos);
        carreraCell = cleanCell(parsedStructured.carreraCell);
        sexoCell = cleanCell(parsedStructured.sexoCell);
      }
    }

    cedula = normalizeCedulaValue(cedula);
    const sexo = parseSexoCell(sexoCell);

    const { carreraId, carreraNombre } = resolveCarrera({
      carreraCell,
      careersIndex,
      careersNameToId
    });

    if (!cedula || !onlyDigits(cedula) || !nombres || !apellidos){
      skipped++;
      continue;
    }

    out.push({
      cedula,
      nombres,
      apellidos,
      carreraId,
      carreraNombre,
      sexo,
      celular: "",
      titulo: ""
    });
    parsed++;
  }

  return {
    rows: out,
    stats: {
      total: Math.max(0, lines.length - start),
      parsed,
      skipped,
      hasHeader
    }
  };
}