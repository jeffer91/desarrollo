/*
Nombre completo: for.actions.js
Ruta o ubicación: formacion/frontend/for.actions.js
Función o funciones: Centralizar acciones de pantalla del módulo Formación, incluyendo carga de registros, apertura de detalle, creación, guardado y exportación a PDF o Word
*/

import {
  forListRecordsUseCase,
  forGetRecordDetailUseCase,
  forCreateNewRecordUseCase,
  forSaveRecordUseCase,
  forPrepareExportDataUseCase
} from "../backend/for.usecases.js";
import { forExportPdf } from "../exportar/for.export.pdf.js";
import { forExportWord } from "../exportar/for.export.word.js";

export async function forLoadRecordsAction() {
  return forListRecordsUseCase();
}

export async function forOpenRecordAction(recordId) {
  return forGetRecordDetailUseCase(recordId);
}

export async function forCreateRecordAction(seed = {}) {
  return forCreateNewRecordUseCase(seed);
}

export async function forSaveRecordAction(record = {}) {
  return forSaveRecordUseCase(record);
}

export async function forExportRecordPdfAction(recordId, options = {}) {
  const result = await forPrepareExportDataUseCase(recordId, options);

  if (!result.ok) {
    return result;
  }

  await forExportPdf(result.data, options);

  return {
    ok: true,
    message: "Expediente exportado a PDF correctamente.",
    data: result.data
  };
}

export async function forExportRecordWordAction(recordId, options = {}) {
  const result = await forPrepareExportDataUseCase(recordId, options);

  if (!result.ok) {
    return result;
  }

  await forExportWord(result.data, options);

  return {
    ok: true,
    message: "Expediente exportado a Word correctamente.",
    data: result.data
  };
}