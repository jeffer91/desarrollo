/*
Nombre completo: for.document.data.js
Ruta o ubicación: formacion/backend/for.document.data.js
Función o funciones: Construir el objeto de expediente documental de formación docente listo
para exportar a PDF o Word, con encabezado, portada, secciones, firmas, anexos y metadatos
*/

import { forMapRecordForDocument } from "./for.mapper.js";

function forFormatDateEs(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return raw;

  return new Intl.DateTimeFormat("es-EC", {
    year: "numeric",
    month: "long",
    day: "2-digit"
  }).format(date);
}

function forBuildSectionRows(sectionObject = {}) {
  return Object.entries(sectionObject).map(([key, value]) => ({
    key,
    value: value ?? ""
  }));
}

export function forBuildDocumentData(record = {}, options = {}) {
  const mapped = forMapRecordForDocument(record);

  const fechaGeneracion = options.fechaGeneracion
    ? forFormatDateEs(options.fechaGeneracion)
    : new Intl.DateTimeFormat("es-EC", {
        year: "numeric",
        month: "long",
        day: "2-digit"
      }).format(new Date());

  return {
    meta: {
      modulo: "formacion",
      version: "1.0.0",
      fechaGeneracion,
      ...mapped.meta
    },

    encabezado: {
      ...mapped.encabezado,
      logoUrl: options.logoUrl || "",
      fechaGeneracion
    },

    portada: {
      ...mapped.portada,
      fechaGeneracion
    },

    secciones: [
      {
        numero: 1,
        titulo: "Información Personal y Académica",
        rows: forBuildSectionRows({
          "Nombre completo": mapped.informacionPersonalAcademica.docente,
          "Cédula": mapped.informacionPersonalAcademica.cedula,
          "Cargo": mapped.informacionPersonalAcademica.cargo,
          "Unidad o carrera en la que labora":
            mapped.informacionPersonalAcademica.carrera,
          "Título académico actual":
            mapped.informacionPersonalAcademica.tituloActual,
          "Nivel de formación": mapped.informacionPersonalAcademica.nivelFormacion,
          "Formación en curso": mapped.informacionPersonalAcademica.formacion,
          "Carrera que está cursando":
            mapped.informacionPersonalAcademica.carreraCursa,
          "Institución de estudio":
            mapped.informacionPersonalAcademica.institucion
        })
      },
      {
        numero: 2,
        titulo: "Detalles de la Formación",
        rows: forBuildSectionRows({
          Modalidad: mapped.detallesFormacion.modalidad,
          "Fecha de inicio de estudios": forFormatDateEs(
            mapped.detallesFormacion.fechaInicio
          ),
          "Fecha prevista de finalización": forFormatDateEs(
            mapped.detallesFormacion.fechaFinPrevista
          ),
          "Financiamiento ITSQMET":
            mapped.detallesFormacion.financiamientoItsqmet,
          "Acuerdo de patrocinio institucional":
            mapped.detallesFormacion.patrocinio,
          "Tipo de apoyo": mapped.detallesFormacion.tipoApoyo,
          "Monto de apoyo": mapped.detallesFormacion.montoApoyo,
          "Horas de apoyo": mapped.detallesFormacion.horasApoyo
        })
      },
      {
        numero: 3,
        titulo: "Avance General",
        rows: forBuildSectionRows({
          "Estado actual de la formación": mapped.avanceGeneral.estado,
          "Porcentaje de avance": `${mapped.avanceGeneral.avance}%`,
          Restante: `${mapped.avanceGeneral.restante}%`,
          "Nivel de avance": mapped.avanceGeneral.progressLabel,
          Observaciones: mapped.avanceGeneral.observacionesAvance
        })
      },
      {
        numero: 4,
        titulo: "Evidencias Presentadas",
        rows: forBuildSectionRows({
          "Detalle de evidencias": mapped.seguimiento.evidencias
        })
      },
      {
        numero: 5,
        titulo: "Observaciones Finales",
        rows: forBuildSectionRows({
          "Observaciones finales": mapped.seguimiento.observacionesFinales
        })
      }
    ],

    firmas: mapped.firmas,

    anexos: mapped.anexos.map(item => ({
      ...item,
      tituloVisible: item.title || `Anexo ${item.orden}`,
      referencia: item.url || item.fileObjectUrl || item.fileName || ""
    })),

    resumen: {
      docente: mapped.informacionPersonalAcademica.docente,
      nivelFormacion: mapped.informacionPersonalAcademica.nivelFormacion,
      programa: mapped.informacionPersonalAcademica.formacion,
      estado: mapped.avanceGeneral.estado,
      avance: mapped.avanceGeneral.avance,
      anexos: mapped.anexos.length
    }
  };
}