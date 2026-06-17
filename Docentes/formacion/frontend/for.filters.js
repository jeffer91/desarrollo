/*
Nombre completo: for.filters.js
Ruta o ubicación: formacion/frontend/for.filters.js
Función o funciones: Aplicar filtros de búsqueda y segmentación a los registros de formación docente para alimentar la tabla principal
*/

function forIncludes(text, search) {
  const normalizedText = String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const normalizedSearch = String(search ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  // Corrige la búsqueda para ignorar tildes y mayúsculas.
  // Evita falsos negativos al comparar nombres y textos acentuados.
  return normalizedText.includes(normalizedSearch);
}

export function forApplyFilters(records, filters) {
  const safeRecords = Array.isArray(records) ? records : [];
  const safeFilters = filters ?? {};

  return safeRecords.filter(record => {
    const matchesSearch =
      !safeFilters.search ||
      forIncludes(record.docente, safeFilters.search) ||
      forIncludes(record.cedula, safeFilters.search) ||
      forIncludes(record.carrera, safeFilters.search) ||
      forIncludes(record.institucion, safeFilters.search) ||
      forIncludes(record.formacion, safeFilters.search);

    const matchesStatus =
      !safeFilters.status || String(record.estado ?? "") === String(safeFilters.status);

    const matchesMode =
      !safeFilters.mode || String(record.modalidad ?? "") === String(safeFilters.mode);

    const matchesCareer =
      !safeFilters.career || forIncludes(record.carrera, safeFilters.career);

    return matchesSearch && matchesStatus && matchesMode && matchesCareer;
  });
}