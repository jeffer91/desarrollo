/*
Nombre completo: for.usecases.js
Ruta o ubicación: formacion/backend/for.usecases.js
Función o funciones: Orquestar los casos de uso principales del módulo Formación, incluyendo listado, detalle, creación, guardado, eliminación y preparación avanzada de expediente para exportación
*/

import { forRepository } from "../basedatos/for.repository.js";
import { forCreateEmptyRecord, forPrepareRecordForModal, forValidateSave } from "./for.service.js";
import { forMapRecord, forMapRecordToListItem } from "./for.mapper.js";
import { forBuildDocumentData } from "./for.document.data.js";

function forIncludes(text, search) {
  return String(text ?? "").toLowerCase().includes(String(search ?? "").toLowerCase().trim());
}

function forApplyBackendFilters(records = [], filters = {}) {
  return records.filter(record => {
    const search = filters.search ?? "";
    const status = filters.status ?? "";
    const mode = filters.mode ?? "";
    const career = filters.career ?? "";

    const matchesSearch =
      !search ||
      forIncludes(record.docente, search) ||
      forIncludes(record.cedula, search) ||
      forIncludes(record.carrera, search) ||
      forIncludes(record.institucion, search) ||
      forIncludes(record.formacion, search);

    const matchesStatus =
      !status || String(record.estado ?? "") === String(status);

    const matchesMode =
      !mode || String(record.modalidad ?? "") === String(mode);

    const matchesCareer =
      !career || forIncludes(record.carrera, career);

    return matchesSearch && matchesStatus && matchesMode && matchesCareer;
  });
}

export async function forListRecordsUseCase(filters = {}) {
  const records = await forRepository.listRecords();
  const mapped = records.map(forMapRecordToListItem);
  return forApplyBackendFilters(mapped, filters);
}

export async function forGetRecordDetailUseCase(recordId) {
  const record = await forRepository.getRecordById(recordId);
  return record ? forMapRecord(record) : null;
}

export async function forCreateNewRecordUseCase(seed = {}) {
  return forPrepareRecordForModal(forCreateEmptyRecord(seed));
}

export async function forSaveRecordUseCase(record = {}) {
  const prepared = forPrepareRecordForModal(record);
  const validation = forValidateSave(prepared);

  if (!validation.isValid) {
    return {
      ok: false,
      errors: validation.errors,
      record: prepared
    };
  }

  const saved = await forRepository.saveRecord(prepared);

  return {
    ok: true,
    errors: [],
    record: forMapRecord(saved)
  };
}

export async function forDeleteRecordUseCase(recordId) {
  const exists = await forRepository.hasRecord(recordId);

  if (!exists) {
    return {
      ok: false,
      message: "El registro no existe."
    };
  }

  await forRepository.deleteRecord(recordId);

  return {
    ok: true,
    message: "Registro eliminado correctamente."
  };
}

export async function forGetCatalogsUseCase() {
  return forRepository.getCatalogs();
}

export async function forBuildDocumentUseCase(recordId, options = {}) {
  const record = await forRepository.getRecordById(recordId);

  if (!record) {
    return {
      ok: false,
      message: "No se encontró el registro solicitado.",
      data: null
    };
  }

  return {
    ok: true,
    message: "Expediente preparado correctamente.",
    data: forBuildDocumentData(record, options)
  };
}

export async function forPrepareExportDataUseCase(recordId, options = {}) {
  const exists = await forRepository.hasRecord(recordId);

  if (!exists) {
    return {
      ok: false,
      message: "El registro solicitado no existe.",
      data: null
    };
  }

  const documentResult = await forBuildDocumentUseCase(recordId, options);

  if (!documentResult.ok) {
    return documentResult;
  }

  return {
    ok: true,
    message: "Datos de exportación preparados correctamente.",
    data: documentResult.data
  };
}