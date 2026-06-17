/*
Nombre completo: for.service.js
Ruta o ubicación: formacion/backend/for.service.js
Función o funciones: Orquestar la preparación del registro para edición, construir el registro
final desde el formulario, aplicar normalización general y validar antes del guardado
*/

import { forNormalizeRecord } from "./for.normalize.js";
import { forValidateRecord } from "./for.validate.js";

const FOR_DEFAULT_FORMAT_CODE = "UGPA-RGI1-05-PRO-248-2025-09";

function forCreateRecordId() {
  return `for-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function forCreateEmptyRecord(overrides = {}) {
  return forNormalizeRecord({
    id: forCreateRecordId(),

    docente: "",
    cedula: "",
    cargo: "",
    carrera: "",

    tituloActual: "",

    nivelFormacion: "",
    formacion: "",
    carreraCursa: "",
    institucion: "",
    modalidad: "",
    fechaInicio: "",
    fechaFinPrevista: "",

    financiamientoItsqmet: "No aplica",
    patrocinio: "",
    tipoApoyo: "No aplica",
    montoApoyo: 0,
    horasApoyo: 0,

    estado: "",
    avance: 0,
    restante: 100,
    observacionesAvance: "",
    evidencias: "",
    observacionesFinales: "",

    capacitaciones: [],
    anexos: [],

    codigoFormato: FOR_DEFAULT_FORMAT_CODE,
    elaboradoPor: "Jefferson Villarreal",
    elaboradoCargo: "Gestor de Procesos Académicos",
    aprobadoPor: "Jefferson Villarreal",
    aprobadoCargo: "Gestor de Procesos Académicos",

    ...overrides
  });
}

export function forPrepareRecordForModal(record = {}) {
  const safeRecord = record?.id ? record : forCreateEmptyRecord(record);
  return forNormalizeRecord(safeRecord);
}

export function forBuildRecordFromForm(originalRecord = {}, formValues = {}) {
  const base = originalRecord?.id ? structuredClone(originalRecord) : forCreateEmptyRecord();

  return forNormalizeRecord({
    ...base,
    ...formValues,
    id: base.id || forCreateRecordId(),
    updatedAt: new Date().toISOString()
  });
}

export function forValidateSave(record = {}) {
  return forValidateRecord(record);
}