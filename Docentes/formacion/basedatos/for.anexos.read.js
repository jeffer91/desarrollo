/*
Nombre completo: for.anexos.read.js
Ruta o ubicación: formacion/basedatos/for.anexos.read.js
Función o funciones: Consultar los anexos asociados a un registro de formación docente, devolver conteos, buscar anexos individuales y preparar listados seguros para el módulo y la exportación
*/

import { forReadRecordById } from "./for.data.read.js";

function forSafeAttachments(record = {}) {
  return Array.isArray(record?.anexos) ? record.anexos : [];
}

export async function forReadAttachmentsByRecordId(recordId) {
  const record = await forReadRecordById(recordId);
  if (!record) return [];
  return structuredClone(forSafeAttachments(record));
}

export async function forReadAttachmentById(recordId, attachmentId) {
  const attachments = await forReadAttachmentsByRecordId(recordId);
  return attachments.find(item => item.id === attachmentId) ?? null;
}

export async function forCountAttachmentsByRecordId(recordId) {
  const attachments = await forReadAttachmentsByRecordId(recordId);
  return attachments.length;
}

export async function forReadAttachmentsSummaryByRecordId(recordId) {
  const attachments = await forReadAttachmentsByRecordId(recordId);

  return attachments.map((item, index) => ({
    orden: index + 1,
    id: item.id,
    title: item.title || "",
    type: item.type || "",
    origin: item.origin || "",
    size: Number(item.size ?? 0)
  }));
}