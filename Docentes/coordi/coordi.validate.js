/*
=========================================================
Nombre completo: coordi.validate.js
Ruta o ubicación: /Docentes/coordi/coordi.validate.js
Función o funciones:
- Validar los datos de la pantalla Coordi.
- Verificar campos obligatorios: Carrera, Coordinador y Programa.
- Permitir Telegram vacío porque es informativo.
- Detectar carreras duplicadas mediante normalización.
Con qué se une:
- coordi.app.js
- coordi.table.js
- coordi.normalize.js
=========================================================
*/

(function () {
  "use strict";

  function validateRows(rows) {
    const errors = [];
    const careerMap = new Map();

    if (!Array.isArray(rows) || rows.length === 0) {
      errors.push({
        type: "empty",
        message: "No existen registros para validar."
      });

      return {
        valid: false,
        errors
      };
    }

    rows.forEach((row, index) => {
      const rowNumber = index + 1;
      const carrera = String(row.carrera || "").trim();
      const coordinador = String(row.coordinador || "").trim();
      const programa = String(row.programa || "").trim();

      if (!carrera) {
        errors.push({
          type: "required",
          rowId: row.id,
          field: "carrera",
          message: `Fila ${rowNumber}: el campo Carrera es obligatorio.`
        });
      }

      if (!coordinador) {
        errors.push({
          type: "required",
          rowId: row.id,
          field: "coordinador",
          message: `Fila ${rowNumber}: el campo Coordinador es obligatorio.`
        });
      }

      if (!programa) {
        errors.push({
          type: "required",
          rowId: row.id,
          field: "programa",
          message: `Fila ${rowNumber}: el campo Programa es obligatorio.`
        });
      }

      const careerKey = window.CoordiNormalize
        ? window.CoordiNormalize.toKey(carrera)
        : carrera.toLowerCase();

      if (careerKey) {
        if (careerMap.has(careerKey)) {
          const firstRow = careerMap.get(careerKey);

          errors.push({
            type: "duplicate",
            rowId: row.id,
            field: "carrera",
            message: `Fila ${rowNumber}: la carrera "${carrera}" está duplicada. Ya existe en la fila ${firstRow}.`
          });
        } else {
          careerMap.set(careerKey, rowNumber);
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  function getInvalidCellMap(errors) {
    const map = new Map();

    errors.forEach((error) => {
      if (!error.rowId || !error.field) {
        return;
      }

      const key = `${error.rowId}:${error.field}`;
      map.set(key, true);
    });

    return map;
  }

  window.CoordiValidate = {
    validateRows,
    getInvalidCellMap
  };
})();