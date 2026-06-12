/*
=========================================================
Nombre completo: distribucion.validate.js
Ruta o ubicación: /incorporaciones/sedes/distribucion/distribucion.validate.js
Función o funciones:
- Validar que exista período seleccionado.
- Validar que existan estudiantes aprobados por carrera.
- Validar que exista mínimo una jornada.
- Validar que ninguna carrera quede sin asignar.
- Validar que ninguna carrera se duplique en dos jornadas.
Con qué se une:
- distribucion.app.js
- distribucion.alerts.js
- distribucion.logic.js
=========================================================
*/

(function () {
  "use strict";

  function validateCanDistribute(state) {
    const errors = [];

    if (!state.periodoId) {
      errors.push("Selecciona un período antes de distribuir.");
    }

    if (!state.aprobadosPorCarrera || state.aprobadosPorCarrera.length === 0) {
      errors.push("No existen estudiantes aprobados por carrera para distribuir.");
    }

    if (!state.jornadas || state.jornadas.length === 0) {
      errors.push("Agrega al menos una jornada con fecha y hora.");
    }

    const invalidJourney = (state.jornadas || []).find((jornada) => {
      return !jornada.fecha || !jornada.hora;
    });

    if (invalidJourney) {
      errors.push("Todas las jornadas deben tener fecha y hora.");
    }

    if (errors.length > 0) {
      if (window.DistribucionAlerts) {
        window.DistribucionAlerts.show(
          errors.map((message) => ({
            type: "warning",
            message
          }))
        );
      } else {
        alert(errors.join("\n"));
      }

      return false;
    }

    return true;
  }

  function validateForSave(state) {
    const errors = [];

    if (!state.periodoId) {
      errors.push({
        type: "error",
        message: "No se puede guardar sin período seleccionado."
      });
    }

    if (!state.jornadas || state.jornadas.length === 0) {
      errors.push({
        type: "error",
        message: "No se puede guardar sin jornadas."
      });
    }

    if (!state.distribucion || state.distribucion.length === 0) {
      errors.push({
        type: "error",
        message: "No se puede guardar sin una distribución generada."
      });
    }

    const duplicated = findDuplicatedCareers(state.distribucion || []);

    duplicated.forEach((career) => {
      errors.push({
        type: "error",
        message: `La carrera "${career}" está duplicada en la distribución.`
      });
    });

    const missing = findMissingCareers(
      state.aprobadosPorCarrera || [],
      state.distribucion || []
    );

    missing.forEach((career) => {
      errors.push({
        type: "error",
        message: `La carrera "${career}" no está asignada a ninguna jornada.`
      });
    });

    const emptyJourneys = findEmptyJourneys(
      state.jornadas || [],
      state.distribucion || []
    );

    emptyJourneys.forEach((journeyLabel) => {
      errors.push({
        type: "warning",
        message: `${journeyLabel} no tiene carreras asignadas.`
      });
    });

    return {
      valid: errors.filter((error) => error.type === "error").length === 0,
      errors
    };
  }

  function findDuplicatedCareers(distribucion) {
    const map = new Map();
    const duplicated = [];

    distribucion.forEach((item) => {
      const key = item.carreraKey || toKey(item.carrera);

      if (map.has(key)) {
        duplicated.push(item.carrera);
      } else {
        map.set(key, true);
      }
    });

    return duplicated;
  }

  function findMissingCareers(carreras, distribucion) {
    const assigned = new Set(
      distribucion.map((item) => item.carreraKey || toKey(item.carrera))
    );

    return carreras
      .filter((item) => !assigned.has(item.carreraKey || toKey(item.carrera)))
      .map((item) => item.carrera);
  }

  function findEmptyJourneys(jornadas, distribucion) {
    return jornadas
      .filter((jornada) => {
        return !distribucion.some((item) => item.jornadaId === jornada.id);
      })
      .map((jornada, index) => {
        return `Jornada ${index + 1}`;
      });
  }

  function toKey(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  window.DistribucionValidate = {
    validateCanDistribute,
    validateForSave
  };
})();