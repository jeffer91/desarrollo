/*
Nombre completo: for.normalize.js
Ruta o ubicación: formacion/backend/for.normalize.js
Función o funciones: Normalizar un registro de formación para que el resto del módulo trabaje siempre con las mismas claves y tipos mínimos esperados
*/

function forPickFirst(record = {}, keys = [], fallback = "") {
  for (const key of keys) {
    const value = record?.[key];

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return fallback;
}

function forToString(value, fallback = "") {
  return value === undefined || value === null ? fallback : String(value).trim();
}

function forToNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function forToArray(value) {
  return Array.isArray(value) ? value : [];
}

export function forNormalizeRecord(record = {}) {
  const source = record && typeof record === "object" ? record : {};

  // Corrige nombres separados para no dejar vacío el campo docente si la base viene fragmentada.
  const nombres = forToString(forPickFirst(source, ["nombres", "nombre"], ""));
  const apellidos = forToString(forPickFirst(source, ["apellidos", "apellido"], ""));
  const nombreCompuesto = `${nombres} ${apellidos}`.trim();

  return {
    ...source,

    // Corrige alias del identificador para evitar fallos en lectura, detalle y guardado.
    id: forToString(forPickFirst(source, ["id", "_id", "recordId"], "")),

    // Corrige el campo del docente para que la tabla y el datalist del buscador siempre reciban un nombre usable.
    docente: forToString(
      forPickFirst(
        source,
        ["docente", "nombreDocente", "docenteNombre", "nombreCompleto"],
        nombreCompuesto
      )
    ),

    // Corrige alias frecuentes del resto de campos consumidos por mapper, tabla y exportación.
    codigoFormato: forToString(forPickFirst(source, ["codigoFormato", "codigo_formato", "codigo"], "")),
    cedula: forToString(forPickFirst(source, ["cedula", "identificacion", "dni"], "")),
    cargo: forToString(forPickFirst(source, ["cargo", "puesto"], "")),
    carrera: forToString(forPickFirst(source, ["carrera", "area"], "")),
    tituloActual: forToString(forPickFirst(source, ["tituloActual", "titulo_actual"], "")),
    formacion: forToString(forPickFirst(source, ["formacion", "programa"], "")),
    carreraCursa: forToString(forPickFirst(source, ["carreraCursa", "carrera_cursa"], "")),
    institucion: forToString(forPickFirst(source, ["institucion", "universidad"], "")),
    modalidad: forToString(forPickFirst(source, ["modalidad", "modo"], "")),
    estado: forToString(forPickFirst(source, ["estado", "status"], "")),
    avance: forToNumber(forPickFirst(source, ["avance", "porcentajeAvance", "progress"], 0)),
    fechaInicio: forToString(forPickFirst(source, ["fechaInicio", "fecha_inicio"], "")),
    fechaFinPrevista: forToString(forPickFirst(source, ["fechaFinPrevista", "fecha_fin_prevista"], "")),
    financiamientoItsqmet: forPickFirst(source, ["financiamientoItsqmet", "financiamiento_itsqmet"], false),
    patrocinio: forToString(forPickFirst(source, ["patrocinio"], "")),
    tipoApoyo: forToString(forPickFirst(source, ["tipoApoyo", "tipo_apoyo"], "")),
    montoApoyo: forPickFirst(source, ["montoApoyo", "monto_apoyo"], ""),
    horasApoyo: forPickFirst(source, ["horasApoyo", "horas_apoyo"], ""),
    observacionesAvance: forToString(forPickFirst(source, ["observacionesAvance", "observaciones_avance"], "")),
    evidencias: forPickFirst(source, ["evidencias"], ""),
    observacionesFinales: forToString(forPickFirst(source, ["observacionesFinales", "observaciones_finales"], "")),
    elaboradoPor: forToString(forPickFirst(source, ["elaboradoPor", "elaborado_por"], "")),
    elaboradoCargo: forToString(forPickFirst(source, ["elaboradoCargo", "elaborado_cargo"], "")),
    aprobadoPor: forToString(forPickFirst(source, ["aprobadoPor", "aprobado_por"], "")),
    aprobadoCargo: forToString(forPickFirst(source, ["aprobadoCargo", "aprobado_cargo"], "")),

    // Corrige el tipo de anexos para evitar errores al contar o recorrer evidencias adjuntas.
    anexos: forToArray(forPickFirst(source, ["anexos", "adjuntos", "attachments"], [])),

    createdAt: forToString(forPickFirst(source, ["createdAt", "created_at"], "")),
    updatedAt: forToString(forPickFirst(source, ["updatedAt", "updated_at"], ""))
  };
}