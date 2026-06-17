/*
Nombre completo: for.mapper.js
Ruta o ubicación: formacion/backend/for.mapper.js
Función o funciones: Transformar registros de formación docente a estructuras útiles para
tabla, detalle, exportación y resúmenes, incorporando datos derivados del avance y conteo de
anexos
*/

import { forNormalizeRecord } from "./for.normalize.js";
import {
  forComputeRemaining,
  forComputeProgressBand,
  forComputeProgressLabel,
  forResolveStatusLabel
} from "./for.progress.js";

function forSafeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function forMapRecord(record = {}) {
  const normalized = forNormalizeRecord(record);
  const annexes = forSafeArray(normalized.anexos);
  const avance = Number(normalized.avance ?? 0);
  const restante = forComputeRemaining(avance);

  return {
    ...normalized,
    avance,
    restante,
    estado: forResolveStatusLabel(normalized.estado, avance),
    anexos: annexes,
    anexosCount: annexes.length,
    progressBand: forComputeProgressBand(avance),
    progressLabel: forComputeProgressLabel(avance)
  };
}

export function forMapRecordToListItem(record = {}) {
  const mapped = forMapRecord(record);

  return {
    id: mapped.id,
    docente: mapped.docente,
    cedula: mapped.cedula,
    cargo: mapped.cargo,
    carrera: mapped.carrera,
    nivelFormacion: mapped.nivelFormacion,
    formacion: mapped.formacion,
    institucion: mapped.institucion,
    modalidad: mapped.modalidad,
    estado: mapped.estado,
    avance: mapped.avance,
    restante: mapped.restante,
    anexos: mapped.anexosCount,
    progressBand: mapped.progressBand,
    progressLabel: mapped.progressLabel,
    updatedAt: mapped.updatedAt || mapped.createdAt || ""
  };
}

export function forMapRecordToSummary(record = {}) {
  const mapped = forMapRecord(record);

  return {
    docente: mapped.docente,
    identificacion: mapped.cedula,
    area: mapped.carrera,
    nivelFormacion: mapped.nivelFormacion,
    programa: mapped.formacion,
    institucion: mapped.institucion,
    modalidad: mapped.modalidad,
    estado: mapped.estado,
    avance: mapped.avance,
    restante: mapped.restante,
    anexosCount: mapped.anexosCount
  };
}

export function forMapRecordForDocument(record = {}) {
  const mapped = forMapRecord(record);

  return {
    meta: {
      id: mapped.id,
      codigoFormato: mapped.codigoFormato,
      createdAt: mapped.createdAt,
      updatedAt: mapped.updatedAt
    },

    encabezado: {
      unidad: "Unidad de Gestión de Procesos Académicos",
      titulo: "Seguimiento a la Formación Docente",
      docente: mapped.docente,
      codigoFormato: mapped.codigoFormato
    },

    portada: {
      titulo: "Seguimiento a la Formación Docente",
      docente: mapped.docente,
      elaboradoPor: mapped.elaboradoPor,
      elaboradoCargo: mapped.elaboradoCargo,
      aprobadoPor: mapped.aprobadoPor,
      aprobadoCargo: mapped.aprobadoCargo
    },

    informacionPersonalAcademica: {
      docente: mapped.docente,
      cedula: mapped.cedula,
      cargo: mapped.cargo,
      carrera: mapped.carrera,
      tituloActual: mapped.tituloActual,
      nivelFormacion: mapped.nivelFormacion,
      formacion: mapped.formacion,
      carreraCursa: mapped.carreraCursa,
      institucion: mapped.institucion
    },

    detallesFormacion: {
      modalidad: mapped.modalidad,
      fechaInicio: mapped.fechaInicio,
      fechaFinPrevista: mapped.fechaFinPrevista,
      financiamientoItsqmet: mapped.financiamientoItsqmet,
      patrocinio: mapped.patrocinio,
      tipoApoyo: mapped.tipoApoyo,
      montoApoyo: mapped.montoApoyo,
      horasApoyo: mapped.horasApoyo
    },

    avanceGeneral: {
      estado: mapped.estado,
      avance: mapped.avance,
      restante: mapped.restante,
      progressBand: mapped.progressBand,
      progressLabel: mapped.progressLabel,
      observacionesAvance: mapped.observacionesAvance
    },

    seguimiento: {
      evidencias: mapped.evidencias,
      observacionesFinales: mapped.observacionesFinales
    },

    anexos: mapped.anexos.map((item, index) => ({
      orden: index + 1,
      ...item
    })),

    firmas: {
      elaboradoPor: mapped.elaboradoPor,
      elaboradoCargo: mapped.elaboradoCargo,
      aprobadoPor: mapped.aprobadoPor,
      aprobadoCargo: mapped.aprobadoCargo
    }
  };
}

export function forMapRecordsToList(records = []) {
  return forSafeArray(records).map(forMapRecordToListItem);
}