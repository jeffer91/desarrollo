/*
Nombre completo: for.validate.js
Ruta o ubicación: formacion/backend/for.validate.js
Función o funciones: Validar los datos del registro de formación docente antes del guardado,
permitiendo guardado parcial por secciones y manteniendo solo reglas de consistencia cuando
realmente aplica
*/

function forIsFilled(value) {
  return String(value ?? "").trim().length > 0;
}

function forToDate(value) {
  if (!forIsFilled(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function forHasAnyFilled(record = {}, keys = []) {
  return keys.some(key => forIsFilled(record?.[key]));
}

function forToSafeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function forValidateRecord(record = {}) {
  const errors = [];
  const warnings = [];

  // Datos base del docente: estos sí deben existir siempre.
  if (!forIsFilled(record.docente)) {
    errors.push("El nombre completo del docente es obligatorio.");
  }

  if (!forIsFilled(record.cedula)) {
    errors.push("La cédula es obligatoria.");
  }

  if (!forIsFilled(record.carrera)) {
    errors.push("La unidad o carrera en la que labora es obligatoria.");
  }

  // Formación actual: solo se exige coherencia si empezó a registrarse.
  const hasCurrentFormationData = forHasAnyFilled(record, [
    "nivelFormacion",
    "tituloActual"
  ]);

  if (hasCurrentFormationData) {
    if (!forIsFilled(record.nivelFormacion)) {
      errors.push(
        "Si registra la formación actual, debe seleccionar el nivel de formación actual."
      );
    }

    if (!forIsFilled(record.tituloActual)) {
      errors.push(
        "Si registra la formación actual, debe ingresar el nombre del título o carrera actual."
      );
    }
  }

  // Formación en curso: también se permite parcial, pero con reglas mínimas de coherencia.
  const avance = forToSafeNumber(record.avance, 0);
  const restante = forToSafeNumber(record.restante, 0);

  const hasInProgressFormationData =
    forHasAnyFilled(record, [
      "formacion",
      "carreraCursa",
      "institucion",
      "modalidad",
      "fechaInicio",
      "fechaFinPrevista",
      "estado",
      "observacionesAvance",
      "evidencias",
      "observacionesFinales"
    ]) ||
    avance > 0 ||
    restante < 100;

  if (hasInProgressFormationData) {
    if (forIsFilled(record.formacion) && !forIsFilled(record.carreraCursa)) {
      errors.push(
        "Si selecciona la formación en curso, debe registrar el nombre de la carrera o programa en curso."
      );
    }

    if (!forIsFilled(record.formacion) && forIsFilled(record.carreraCursa)) {
      errors.push(
        "Si registra la carrera o programa en curso, debe seleccionar el nivel de formación en curso."
      );
    }
  }

  // Porcentajes: se mantienen como validación dura para evitar guardar valores inconsistentes.
  if (!Number.isFinite(avance) || avance < 0 || avance > 100) {
    errors.push("El avance debe estar entre 0 y 100.");
  }

  if (!Number.isFinite(restante) || restante < 0 || restante > 100) {
    errors.push("El valor restante debe estar entre 0 y 100.");
  }

  if (
    Number.isFinite(avance) &&
    Number.isFinite(restante) &&
    Math.abs((avance + restante) - 100) > 0.01
  ) {
    errors.push("El avance y el restante deben sumar 100.");
  }

  // Fechas: se mantienen como validación dura para no persistir rangos inválidos.
  const startDate = forToDate(record.fechaInicio);
  const endDate = forToDate(record.fechaFinPrevista);

  if (record.fechaInicio && !startDate) {
    errors.push("La fecha de inicio no tiene un formato válido.");
  }

  if (record.fechaFinPrevista && !endDate) {
    errors.push("La fecha prevista de finalización no tiene un formato válido.");
  }

  if (startDate && endDate && endDate < startDate) {
    errors.push(
      "La fecha prevista de finalización no puede ser anterior a la fecha de inicio."
    );
  }

  // Financiamiento: solo validar fuerte si realmente se indicó apoyo ITSQMET.
  const financiamiento = String(record.financiamientoItsqmet ?? "").trim();
  const tipoApoyo = String(record.tipoApoyo ?? "").trim();

  if (financiamiento === "Sí") {
    if (!forIsFilled(record.patrocinio)) {
      errors.push(
        "Si existe financiamiento ITSQMET, debe indicar si existe acuerdo de patrocinio."
      );
    }

    if (!forIsFilled(tipoApoyo) || tipoApoyo === "No aplica") {
      errors.push("Si existe financiamiento ITSQMET, debe definir el tipo de apoyo.");
    }
  }

  if (tipoApoyo === "Económico" || tipoApoyo === "Económico y Con tiempo") {
    const montoApoyo = Number(record.montoApoyo);

    if (!Number.isFinite(montoApoyo) || montoApoyo < 0) {
      errors.push("El monto de apoyo no puede ser negativo.");
    }
  }

  if (tipoApoyo === "Con tiempo" || tipoApoyo === "Económico y Con tiempo") {
    const horasApoyo = Number(record.horasApoyo);

    if (!Number.isFinite(horasApoyo) || horasApoyo < 0) {
      errors.push("Las horas de apoyo no pueden ser negativas.");
    }
  }

  // Datos del documento:
  // se convierten en advertencias para permitir el guardado parcial.
  // Esto corrige el bloqueo del botón Guardar cuando faltan requisitos documentales,
  // dejando la señal lista para que frontend y tabla la muestren como alerta visual.
  if (!forIsFilled(record.codigoFormato)) {
    warnings.push("El código del formato es obligatorio.");
  }

  if (!forIsFilled(record.elaboradoPor)) {
    warnings.push("Debe registrar quién elabora el documento.");
  }

  if (!forIsFilled(record.elaboradoCargo)) {
    warnings.push("Debe registrar el cargo de quien elabora el documento.");
  }

  if (!forIsFilled(record.aprobadoPor)) {
    warnings.push("Debe registrar quién revisa o aprueba el documento.");
  }

  if (!forIsFilled(record.aprobadoCargo)) {
    warnings.push("Debe registrar el cargo de quien revisa o aprueba el documento.");
  }

  return {
    isValid: errors.length === 0,
    hasWarnings: warnings.length > 0,
    errors,
    warnings
  };
}