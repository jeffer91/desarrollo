/* =========================================================
Nombre del archivo: cap.assign.mass.parse.js
Ruta - Ubicación: /cap.assign/cap.assign.mass.parse.js
Función o funciones:
- resolveDocIdsFromText({ raw, docentes })
========================================================= */

import { cleanSpaces } from "./cap.assign.utils.js";

/**
 * Resuelve IDs de docentes a partir de texto pegado.
 * Reglas:
 * - Token con dígitos => se intenta match por cédula exacta (d.cedula o d.id).
 * - Token sin dígitos => match por nombre exacto normalizado (tildes fuera, espacios normalizados).
 * - Si un nombre coincide con más de un docente => ambiguo, no se agrega.
 */
export function resolveDocIdsFromText({ raw, docentes }){
  const tokens = splitTokens(raw);
  const rows = Array.isArray(docentes) ? docentes : [];

  const byCedula = new Map();
  const byName = new Map(); // nameNorm -> array de ids

  rows.forEach(d => {
    const ced = normalizeCedula(d && (d.cedula || d.id));
    if (ced) byCedula.set(ced, d.id);

    const nom = normalizeName(d && d.nombre);
    if (!nom) return;
    if (!byName.has(nom)) byName.set(nom, []);
    byName.get(nom).push(d.id);
  });

  const outIds = [];
  const notFound = [];
  const ambiguous = [];

  tokens.forEach(t => {
    const tok = String(t || "").trim();
    if (!tok) return;

    const hasDigit = /\d/.test(tok);
    if (hasDigit){
      const ced = normalizeCedula(tok);
      const id = ced ? byCedula.get(ced) : null;
      if (id) outIds.push(id);
      else notFound.push(tok);
      return;
    }

    const nom = normalizeName(tok);
    if (!nom){
      notFound.push(tok);
      return;
    }

    const matches = byName.get(nom) || [];
    if (matches.length === 1){
      outIds.push(matches[0]);
      return;
    }
    if (matches.length > 1){
      ambiguous.push(tok);
      return;
    }
    notFound.push(tok);
  });

  // Comentario técnico: dedup para evitar duplicados en pendingAdd.
  const uniq = Array.from(new Set(outIds));

  return { docIds: uniq, notFound, ambiguous };
}

function splitTokens(raw){
  const s = String(raw || "");
  // Separadores: salto de línea, coma, punto y coma, tab.
  const parts = s.split(/[\n,;\t]+/g).map(x => String(x || "").trim());
  return parts.filter(Boolean);
}

function normalizeCedula(s){
  // Comentario técnico: cédula suele venir como string de dígitos; limpiamos espacios y dejamos solo dígitos.
  const t = cleanSpaces(s || "");
  const digits = t.replace(/[^\d]/g, "");
  return digits || "";
}

function normalizeName(s){
  const t = cleanSpaces(s || "");
  if (!t) return "";

  // Comentario técnico: normaliza a minúsculas y elimina tildes para coincidencia estable.
  return removeAccents(t).toLowerCase();
}

function removeAccents(str){
  // Compatibilidad: si el navegador soporta normalize (moderno), se usa.
  try{
    return String(str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  } catch(_){
    // Fallback mínimo: sin normalización, retorna tal cual.
    return String(str || "");
  }
}
