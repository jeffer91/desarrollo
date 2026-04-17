/*
=========================================================
Nombre completo: mesa-docente-schema.js
Ruta o ubicación: /js/mesa-docente-schema.js
Función o funciones:
- Definir la estructura base de una invitación.
- Normalizar cargos y horarios.
- Validar los datos mínimos requeridos.
- Preparar el modelo para render y guardado.
=========================================================
*/
"use strict";

(function attachMesaInvitationSchema(global) {
  function safeText(value) {
    return String(value || "").trim();
  }

  function makeId() {
    return `inv_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
  }

  function normalizeSchedules(value) {
    if (Array.isArray(value)) {
      return value.map((item) => safeText(item)).filter(Boolean);
    }

    return safeText(value)
      .split(/\n/g)
      .map((item) => safeText(item))
      .filter(Boolean);
  }

  function createEmptyAssignment() {
    return {
      id: `asg_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`,
      cargoKey: "",
      schedules: [""]
    };
  }

  function normalizeAssignment(input) {
    const schedules = normalizeSchedules(input?.schedules);

    return {
      id: safeText(input?.id) || `asg_${Date.now()}_${Math.random().toString(16).slice(2, 7)}`,
      cargoKey: safeText(input?.cargoKey),
      schedules: schedules.length ? schedules : []
    };
  }

  function createEmptyInvitation() {
    return {
      id: makeId(),
      city: global.MesaConstants?.DEFAULT_CITY || "Quito",
      documentDate: global.MesaConstants?.DEFAULT_DOCUMENT_DATE || "",
      sessionDate: global.MesaConstants?.DEFAULT_SESSION_DATE || "",
      promotion: global.MesaConstants?.DEFAULT_PROMOTION || "",
      article: "",
      treatment: "",
      fullName: "",
      identification: "",
      assignments: [createEmptyAssignment()],
      meta: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
  }

  function normalizeInvitation(input) {
    const assignments = Array.isArray(input?.assignments)
      ? input.assignments.map(normalizeAssignment).filter((item) => item.cargoKey || item.schedules.length)
      : [];

    return {
      id: safeText(input?.id) || makeId(),
      city: safeText(input?.city) || (global.MesaConstants?.DEFAULT_CITY || "Quito"),
      documentDate: safeText(input?.documentDate),
      sessionDate: safeText(input?.sessionDate),
      promotion: safeText(input?.promotion),
      article: safeText(input?.article),
      treatment: safeText(input?.treatment),
      fullName: safeText(input?.fullName),
      identification: safeText(input?.identification),
      assignments: assignments.length ? assignments : [createEmptyAssignment()],
      meta: {
        createdAt: safeText(input?.meta?.createdAt) || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    };
  }

  function getDisplayName(invitation) {
    return [safeText(invitation?.treatment), safeText(invitation?.fullName)]
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  function getNormalizedSearchText(invitation) {
    return String(
      [
        invitation?.fullName,
        invitation?.treatment,
        invitation?.promotion,
        ...(invitation?.assignments || []).map((item) => item.cargoKey)
      ].join(" ")
    )
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function resolveTreatmentValue(selectValue, customValue) {
    return safeText(customValue) || safeText(selectValue);
  }

  function getInvitationMode(invitation) {
    const assignments = Array.isArray(invitation?.assignments) ? invitation.assignments : [];
    const validAssignments = assignments.filter((item) => item.cargoKey && item.schedules && item.schedules.length);

    if (validAssignments.length === 1 && validAssignments[0].schedules.length === 1) {
      return "simple";
    }
    return "multiple";
  }

  function validateInvitation(invitation) {
    const errors = [];

    if (!safeText(invitation?.documentDate)) {
      errors.push("La fecha del documento es obligatoria.");
    }

    if (!safeText(invitation?.sessionDate)) {
      errors.push("La fecha de la sesión o reunión es obligatoria.");
    }

    if (!safeText(invitation?.promotion)) {
      errors.push("La promoción es obligatoria.");
    }

    if (!safeText(invitation?.article)) {
      errors.push("Debes seleccionar el artículo (al / a la).");
    }

    if (!safeText(invitation?.treatment)) {
      errors.push("El tratamiento es obligatorio.");
    }

    if (!safeText(invitation?.fullName)) {
      errors.push("El nombre completo es obligatorio.");
    }

    const validAssignments = (invitation?.assignments || []).filter((item) => {
      return safeText(item?.cargoKey) && Array.isArray(item?.schedules) && item.schedules.filter(Boolean).length;
    });

    if (!validAssignments.length) {
      errors.push("Debes registrar al menos un cargo con al menos un horario.");
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  global.MesaInvitationSchema = {
    safeText,
    makeId,
    createEmptyAssignment,
    normalizeAssignment,
    createEmptyInvitation,
    normalizeInvitation,
    getDisplayName,
    getNormalizedSearchText,
    resolveTreatmentValue,
    getInvitationMode,
    validateInvitation
  };
})(window);