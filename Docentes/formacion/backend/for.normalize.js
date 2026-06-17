/*
Nombre completo: for.normalize.js
Ruta o ubicación: formacion/backend/for.normalize.js
Función o funciones: Normalizar textos, números, fechas, catálogos, anexos y campos de
formación docente, separando explícitamente formación de capacitaciones
*/

function forNormalizeText(value) {
  return String(value ?? "").trim();
}

function forNormalizeCedula(value) {
  return String(value ?? "").replace(/\D+/g, "").slice(0, 13);
}

function forNormalizeDate(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const directMatch = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  if (directMatch) return raw;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function forNormalizeNumber(
  value,
  { min = 0, max = Number.POSITIVE_INFINITY, decimals = 2 } = {}
) {
  const parsed = Number(value);
  const safeNumber = Number.isFinite(parsed) ? parsed : 0;
  const bounded = Math.max(min, Math.min(max, safeNumber));
  return Number(bounded.toFixed(decimals));
}

function forNormalizeOption(value, allowed = [], fallback = "") {
  const cleanValue = forNormalizeText(value);
  return allowed.includes(cleanValue) ? cleanValue : fallback;
}

function forNormalizeBooleanToYesNo(value, fallback = "") {
  if (value === true) return "Sí";
  if (value === false) return "No";

  const cleanValue = forNormalizeText(value).toLowerCase();
  if (["si", "sí", "yes", "true", "1"].includes(cleanValue)) return "Sí";
  if (["no", "false", "0"].includes(cleanValue)) return "No";

  return fallback;
}

function forNormalizeFundingValue(value) {
  if (value === true) return "Sí";
  if (value === false) return "No";

  const cleanValue = forNormalizeText(value).toLowerCase();

  if (["si", "sí", "yes", "true", "1"].includes(cleanValue)) return "Sí";
  if (["no", "false", "0"].includes(cleanValue)) return "No";
  if (["no aplica", "na", "n/a"].includes(cleanValue)) return "No aplica";

  return "No aplica";
}

function forNormalizeAttachments(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(Boolean)
    .map(item => ({
      id:
        forNormalizeText(item?.id) ||
        `anexo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: forNormalizeText(item?.title),
      type: forNormalizeText(item?.type) || "Archivo",
      size: forNormalizeNumber(item?.size, {
        min: 0,
        max: Number.MAX_SAFE_INTEGER,
        decimals: 0
      }),
      origin: forNormalizeText(item?.origin) || "Archivo",
      url: forNormalizeText(item?.url),
      fileName: forNormalizeText(item?.fileName),
      fileObjectUrl: forNormalizeText(item?.fileObjectUrl)
    }))
    .filter(item => item.title);
}

function forNormalizeCapacitaciones(value) {
  if (!Array.isArray(value)) return [];

  return value
    .filter(Boolean)
    .map(item => {
      if (typeof item === "string") {
        return forNormalizeText(item);
      }

      if (typeof item === "object") {
        return {
          id: forNormalizeText(item.id),
          nombre:
            forNormalizeText(item.nombre) ||
            forNormalizeText(item.titulo) ||
            forNormalizeText(item.name),
          raw: structuredClone(item)
        };
      }

      return "";
    })
    .filter(Boolean);
}

function forGetNestedFormationSource(record = {}) {
  return record?.formacionDocente && typeof record.formacionDocente === "object"
    ? record.formacionDocente
    : {};
}

function forPickFormationValue(record = {}, key, fallback = "") {
  const nested = forGetNestedFormationSource(record);

  const direct = record?.[key];
  if (direct !== undefined && direct !== null && direct !== "") {
    return direct;
  }

  const nestedValue = nested?.[key];
  if (nestedValue !== undefined && nestedValue !== null && nestedValue !== "") {
    return nestedValue;
  }

  return fallback;
}

export function forNormalizeRecord(record = {}) {
  const nombres = forNormalizeText(record.nombres);
  const apellidos = forNormalizeText(record.apellidos);

  const avance = forNormalizeNumber(forPickFormationValue(record, "avance", 0), {
    min: 0,
    max: 100,
    decimals: 2
  });

  const restante = forNormalizeNumber(
    forPickFormationValue(record, "restante", 100 - avance),
    { min: 0, max: 100, decimals: 2 }
  );

  const nivelFormacion = forNormalizeOption(
    forPickFormationValue(record, "nivelFormacion", ""),
    [
      "Tecnología Superior Universitaria",
      "Licenciatura",
      "Ingeniería",
      "Maestría",
      "Doctorado",
      "Otro"
    ],
    ""
  );

  const modalidad = forNormalizeOption(
    forPickFormationValue(record, "modalidad", ""),
    ["Presencial", "Virtual", "Híbrida"],
    ""
  );

  const financiamientoItsqmet = forNormalizeFundingValue(
    forPickFormationValue(record, "financiamientoItsqmet", "No aplica")
  );

  const patrocinio = forNormalizeBooleanToYesNo(
    forPickFormationValue(record, "patrocinio", ""),
    ""
  );

  const tipoApoyo = forNormalizeOption(
    forPickFormationValue(record, "tipoApoyo", "No aplica"),
    ["Económico", "Con tiempo", "Económico y Con tiempo", "No aplica", ""],
    "No aplica"
  );

  const estado = forNormalizeOption(
    forPickFormationValue(record, "estado", ""),
    ["En curso", "Finalizado", "Suspendido", "Pendiente"],
    ""
  );

  const capacitaciones = forNormalizeCapacitaciones(record.capacitaciones);

  return {
    id: forNormalizeText(record.id),

    nombres,
    apellidos,
    docente: forNormalizeText(record.docente || `${nombres} ${apellidos}`.trim()),

    cedula: forNormalizeCedula(record.cedula),
    cargo: forNormalizeText(record.cargo),
    carrera: forNormalizeText(record.carrera),

    tituloActual: forNormalizeText(record.tituloActual),

    // Formación formal
    nivelFormacion,
    formacion: forNormalizeText(forPickFormationValue(record, "formacion", "")),
    carreraCursa: forNormalizeText(forPickFormationValue(record, "carreraCursa", "")),
    institucion: forNormalizeText(forPickFormationValue(record, "institucion", "")),
    modalidad,
    fechaInicio: forNormalizeDate(forPickFormationValue(record, "fechaInicio", "")),
    fechaFinPrevista: forNormalizeDate(
      forPickFormationValue(record, "fechaFinPrevista", "")
    ),
    financiamientoItsqmet,
    patrocinio,
    tipoApoyo,
    montoApoyo: forNormalizeNumber(forPickFormationValue(record, "montoApoyo", 0), {
      min: 0,
      max: 999999999,
      decimals: 2
    }),
    horasApoyo: forNormalizeNumber(forPickFormationValue(record, "horasApoyo", 0), {
      min: 0,
      max: 999999,
      decimals: 2
    }),
    estado,
    avance,
    restante,
    observacionesAvance: forNormalizeText(
      forPickFormationValue(record, "observacionesAvance", "")
    ),
    evidencias: forNormalizeText(forPickFormationValue(record, "evidencias", "")),
    observacionesFinales: forNormalizeText(
      forPickFormationValue(record, "observacionesFinales", "")
    ),

    // Capacitaciones separadas y sin mezclar con formación
    capacitaciones,

    anexos: forNormalizeAttachments(record.anexos),

    codigoFormato: forNormalizeText(record.codigoFormato),
    elaboradoPor: forNormalizeText(record.elaboradoPor),
    elaboradoCargo: forNormalizeText(record.elaboradoCargo),
    aprobadoPor: forNormalizeText(record.aprobadoPor),
    aprobadoCargo: forNormalizeText(record.aprobadoCargo),
    createdAt: forNormalizeText(record.createdAt),
    updatedAt: forNormalizeText(record.updatedAt),

    // También se mantiene el bloque agrupado por compatibilidad futura
    formacionDocente: {
      nivelFormacion,
      formacion: forNormalizeText(forPickFormationValue(record, "formacion", "")),
      carreraCursa: forNormalizeText(forPickFormationValue(record, "carreraCursa", "")),
      institucion: forNormalizeText(forPickFormationValue(record, "institucion", "")),
      modalidad,
      fechaInicio: forNormalizeDate(forPickFormationValue(record, "fechaInicio", "")),
      fechaFinPrevista: forNormalizeDate(
        forPickFormationValue(record, "fechaFinPrevista", "")
      ),
      financiamientoItsqmet,
      patrocinio,
      tipoApoyo,
      montoApoyo: forNormalizeNumber(forPickFormationValue(record, "montoApoyo", 0), {
        min: 0,
        max: 999999999,
        decimals: 2
      }),
      horasApoyo: forNormalizeNumber(forPickFormationValue(record, "horasApoyo", 0), {
        min: 0,
        max: 999999,
        decimals: 2
      }),
      estado,
      avance,
      restante,
      observacionesAvance: forNormalizeText(
        forPickFormationValue(record, "observacionesAvance", "")
      ),
      evidencias: forNormalizeText(forPickFormationValue(record, "evidencias", "")),
      observacionesFinales: forNormalizeText(
        forPickFormationValue(record, "observacionesFinales", "")
      )
    }
  };
}