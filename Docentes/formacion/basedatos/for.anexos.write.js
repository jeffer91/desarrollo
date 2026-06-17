/*
Nombre completo: for.anexos.write.js
Ruta o ubicación: formacion/basedatos/for.anexos.write.js
Función o funciones: Agregar, reemplazar, actualizar y eliminar anexos dentro de un registro de formación docente, persistiendo el resultado final en la capa de datos del módulo
*/

import { forReadRecordById } from "./for.data.read.js";
import { forUpsertRecord } from "./for.data.write.js";
import { forNormalizeRecord } from "../backend/for.normalize.js";

function forSafeAttachments(value) {
  return Array.isArray(value) ? value : [];
}

function forBuildAttachmentId() {
  return `anexo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function forNormalizeAttachment(item = {}) {
  return {
    id: String(item.id ?? "").trim() || forBuildAttachmentId(),
    title: String(item.title ?? "").trim(),
    type: String(item.type ?? "").trim() || "Archivo",
    size: Number(item.size ?? 0) || 0,
    origin: String(item.origin ?? "").trim() || "Archivo",
    url: String(item.url ?? "").trim(),
    fileName: String(item.fileName ?? "").trim(),
    fileObjectUrl: String(item.fileObjectUrl ?? "").trim()
  };
}

export async function forReplaceAttachmentsOfRecord(recordId, attachments = []) {
  const record = await forReadRecordById(recordId);
  if (!record) return null;

  const nextRecord = forNormalizeRecord({
    ...record,
    anexos: forSafeAttachments(attachments).map(forNormalizeAttachment),
    updatedAt: new Date().toISOString()
  });

  await forUpsertRecord(nextRecord);
  return structuredClone(nextRecord.anexos);
}

export async function forAddAttachmentsToRecord(recordId, attachments = []) {
  const record = await forReadRecordById(recordId);
  if (!record) return null;

  const current = forSafeAttachments(record.anexos).map(forNormalizeAttachment);
  const incoming = forSafeAttachments(attachments).map(forNormalizeAttachment);

  const nextRecord = forNormalizeRecord({
    ...record,
    anexos: [...current, ...incoming],
    updatedAt: new Date().toISOString()
  });

  await forUpsertRecord(nextRecord);
  return structuredClone(nextRecord.anexos);
}

export async function forRemoveAttachmentFromRecord(recordId, attachmentId) {
  const record = await forReadRecordById(recordId);
  if (!record) return null;

  const nextAttachments = forSafeAttachments(record.anexos).filter(item => item.id !== attachmentId);

  const nextRecord = forNormalizeRecord({
    ...record,
    anexos: nextAttachments,
    updatedAt: new Date().toISOString()
  });

  await forUpsertRecord(nextRecord);
  return structuredClone(nextRecord.anexos);
}

export async function forUpdateAttachmentInRecord(recordId, attachment = {}) {
  const record = await forReadRecordById(recordId);
  if (!record) return null;

  const normalizedAttachment = forNormalizeAttachment(attachment);
  const current = forSafeAttachments(record.anexos).map(forNormalizeAttachment);
  const idx = current.findIndex(item => item.id === normalizedAttachment.id);

  if (idx >= 0) {
    current[idx] = normalizedAttachment;
  } else {
    current.unshift(normalizedAttachment);
  }

  const nextRecord = forNormalizeRecord({
    ...record,
    anexos: current,
    updatedAt: new Date().toISOString()
  });

  await forUpsertRecord(nextRecord);
  return structuredClone(nextRecord.anexos);
}