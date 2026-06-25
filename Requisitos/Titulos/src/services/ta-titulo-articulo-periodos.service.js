/*
  Nombre completo: ta-titulo-articulo-periodos.service.js
  Ruta o ubicación: /Requisitos/Titulos/src/services/ta-titulo-articulo-periodos.service.js
  Función o funciones:
  - Normalizar identificadores de período.
  - Comparar períodos entre Firebase, estudiante y período activo.
  - Obtener el período principal registrado en un estudiante.
*/

export function normalizarPeriodoId(valor = "") {
  return String(valor ?? "")
    .trim()
    .replace(/\s+/g, "")
    .replace(/_+/g, "_")
    .replace(/-/g, "-")
    .toUpperCase();
}

export function periodoEquivalente(a, b) {
  const pa = normalizarPeriodoId(a);
  const pb = normalizarPeriodoId(b);
  return Boolean(pa && pb && pa === pb);
}

export function obtenerPeriodoEstudiante(estudiante = {}) {
  return String(estudiante.periodoId || estudiante.ultimoPeriodoId || estudiante.UltimoPeriodoId || "").trim();
}
