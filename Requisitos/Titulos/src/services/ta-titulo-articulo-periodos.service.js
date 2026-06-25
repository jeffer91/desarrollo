/*
  Nombre completo: ta-titulo-articulo-periodos.service.js
  Ruta o ubicación: /Requisitos/Titulos/src/services/ta-titulo-articulo-periodos.service.js
  Función o funciones:
  - Normalizar identificadores de período.
  - Comparar períodos entre Firebase, estudiante y período activo.
  - Conectar equivalencias como Primer semestre de 2026, 2026-1, 2026 I y 2026_1.
  - Obtener el período principal registrado en un estudiante.
*/

export const DEFAULT_PERIODO_ACTIVO = Object.freeze({
  id: "PRIMER_SEMESTRE_2026",
  idNormalizado: "2026_1",
  label: "Primer semestre de 2026"
});

function limpiar(valor) {
  return String(valor ?? "").replace(/\s+/g, " ").trim();
}

function normalizarTexto(valor) {
  return limpiar(valor).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function textoPeriodo(valor) {
  return normalizarTexto(valor).toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
}

function compactPeriodo(valor) {
  return textoPeriodo(valor).replace(/\s+/g, "");
}

function detectarCanonico(valor) {
  const texto = textoPeriodo(valor);
  const compact = compactPeriodo(valor);
  const yearMatch = texto.match(/\b(20\d{2})\b/);
  if (!yearMatch) return "";

  const year = yearMatch[1];
  const primero = texto.includes("PRIMER") || texto.includes("PRIMERO") || texto.includes("1ER") || texto.includes("SEMESTRE 1") || texto.includes("1 SEMESTRE") || texto.includes("SEMESTRE I") || texto.includes("I SEMESTRE") || compact === year || compact === `${year}1` || compact === `${year}I` || compact === `1${year}` || compact === `I${year}`;
  const segundo = texto.includes("SEGUNDO") || texto.includes("2DO") || texto.includes("SEMESTRE 2") || texto.includes("2 SEMESTRE") || texto.includes("SEMESTRE II") || texto.includes("II SEMESTRE") || compact === `${year}2` || compact === `${year}II` || compact === `2${year}` || compact === `II${year}`;

  if (segundo) return `${year}_2`;
  if (primero) return `${year}_1`;
  return "";
}

export function normalizarPeriodoId(valor = "") {
  const canonico = detectarCanonico(valor);
  if (canonico) return canonico;

  return normalizarTexto(valor)
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
}

export function periodoEquivalente(a, b) {
  const pa = normalizarPeriodoId(a);
  const pb = normalizarPeriodoId(b);
  return Boolean(pa && pb && pa === pb);
}

export function obtenerPeriodoEstudiante(estudiante = {}) {
  return limpiar(estudiante.periodoId || estudiante.ultimoPeriodoId || estudiante.UltimoPeriodoId || estudiante.periodo || estudiante.Periodo || "");
}
