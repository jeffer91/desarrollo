/*
Nombre completo: for.data.write.js
Ruta o ubicación: formacion/basedatos/for.data.write.js
Función o funciones: Guardar, actualizar, eliminar y sembrar registros del módulo Formación dentro de la capa de persistencia local, asegurando consistencia del arreglo final
*/

import { forGetDbKeys, forReadJson, forWriteJson } from "./for.db.js";

function forNormalizeRecordsArray(records) {
  return Array.isArray(records) ? structuredClone(records) : [];
}

function forSortRecords(records) {
  return [...records].sort((a, b) => {
    const aName = String(a?.docente ?? "").toLowerCase();
    const bName = String(b?.docente ?? "").toLowerCase();
    return aName.localeCompare(bName, "es");
  });
}

export async function forSaveAllRecords(records = []) {
  const keys = forGetDbKeys();
  const safeRecords = forSortRecords(forNormalizeRecordsArray(records));
  forWriteJson(keys.records, safeRecords);
  return structuredClone(safeRecords);
}

export async function forUpsertRecord(record = {}) {
  const keys = forGetDbKeys();
  const current = forReadJson(keys.records, []);
  const safeCurrent = Array.isArray(current) ? current : [];
  const idx = safeCurrent.findIndex(item => item.id === record.id);

  if (idx >= 0) {
    safeCurrent[idx] = structuredClone(record);
  } else {
    safeCurrent.unshift(structuredClone(record));
  }

  const sorted = forSortRecords(safeCurrent);
  forWriteJson(keys.records, sorted);
  return structuredClone(record);
}

export async function forDeleteRecord(recordId) {
  const keys = forGetDbKeys();
  const current = forReadJson(keys.records, []);
  const safeCurrent = Array.isArray(current) ? current : [];
  const next = safeCurrent.filter(item => item.id !== recordId);
  forWriteJson(keys.records, next);
  return true;
}

export async function forEnsureSeedRecords(seedRecords = []) {
  const keys = forGetDbKeys();
  const current = forReadJson(keys.records, []);

  if (Array.isArray(current) && current.length > 0) {
    return structuredClone(current);
  }

  const safeSeed = forSortRecords(forNormalizeRecordsArray(seedRecords));
  forWriteJson(keys.records, safeSeed);
  return structuredClone(safeSeed);
}