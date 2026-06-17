/*
Nombre completo: for.state.js
Ruta o ubicación: formacion/frontend/for.state.js
Función o funciones: Manejo del estado local del módulo Formación, filtros, registros cargados, modal activo y registro seleccionado
*/

const forState = {
  records: [],
  filteredRecords: [],
  selectedRecordId: null,
  isModalOpen: false,
  filters: {
    search: "",
    status: "",
    mode: "",
    career: ""
  }
};

export function forGetState() {
  return structuredClone(forState);
}

export function forSetRecords(records) {
  forState.records = Array.isArray(records) ? structuredClone(records) : [];
  forState.filteredRecords = structuredClone(forState.records);
}

export function forGetRecords() {
  return structuredClone(forState.records);
}

export function forGetFilteredRecords() {
  return structuredClone(forState.filteredRecords);
}

export function forSetFilteredRecords(records) {
  forState.filteredRecords = Array.isArray(records) ? structuredClone(records) : [];
}

export function forSetFilter(key, value) {
  if (!Object.hasOwn(forState.filters, key)) return;
  forState.filters[key] = typeof value === "string" ? value : "";
}

export function forGetFilters() {
  return structuredClone(forState.filters);
}

export function forOpenModal(recordId) {
  forState.selectedRecordId = recordId ?? null;
  forState.isModalOpen = true;
}

export function forCloseModal() {
  forState.selectedRecordId = null;
  forState.isModalOpen = false;
}

export function forGetSelectedRecord() {
  return forState.records.find(item => item.id === forState.selectedRecordId) ?? null;
}

export function forUpsertRecord(updatedRecord) {
  if (!updatedRecord?.id) return;

  const idx = forState.records.findIndex(item => item.id === updatedRecord.id);
  if (idx >= 0) {
    forState.records[idx] = structuredClone(updatedRecord);
  } else {
    forState.records.unshift(structuredClone(updatedRecord));
  }
}