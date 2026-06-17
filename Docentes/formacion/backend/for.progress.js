/*
Nombre completo: for.progress.js
Ruta o ubicación: formacion/backend/for.progress.js
Función o funciones: Calcular restante, clasificar el avance por bandas, producir etiquetas descriptivas del progreso y resolver estados derivados del proceso de formación
*/

function forSafeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function forClampProgress(value) {
  const safe = forSafeNumber(value);
  return Math.max(0, Math.min(100, Number(safe.toFixed(2))));
}

export function forComputeRemaining(avance = 0) {
  const safeAdvance = forClampProgress(avance);
  return Number((100 - safeAdvance).toFixed(2));
}

export function forComputeProgressBand(avance = 0) {
  const safeAdvance = forClampProgress(avance);

  if (safeAdvance >= 100) return "completo";
  if (safeAdvance >= 75) return "alto";
  if (safeAdvance >= 40) return "medio";
  if (safeAdvance > 0) return "bajo";
  return "sin-inicio";
}

export function forComputeProgressLabel(avance = 0) {
  const band = forComputeProgressBand(avance);

  if (band === "completo") return "Formación completada";
  if (band === "alto") return "Avance alto";
  if (band === "medio") return "Avance medio";
  if (band === "bajo") return "Avance inicial";
  return "Sin avance registrado";
}

export function forResolveStatusLabel(status = "", avance = 0) {
  const cleanStatus = String(status ?? "").trim();
  const safeAdvance = forClampProgress(avance);

  if (cleanStatus) {
    if (cleanStatus === "En curso" && safeAdvance >= 100) {
      return "Finalizado";
    }
    return cleanStatus;
  }

  if (safeAdvance >= 100) return "Finalizado";
  if (safeAdvance > 0) return "En curso";
  return "Pendiente";
}

export function forBuildProgressSummary(record = {}) {
  const avance = forClampProgress(record.avance);
  const restante = forComputeRemaining(avance);
  const estado = forResolveStatusLabel(record.estado, avance);

  return {
    avance,
    restante,
    estado,
    progressBand: forComputeProgressBand(avance),
    progressLabel: forComputeProgressLabel(avance)
  };
}