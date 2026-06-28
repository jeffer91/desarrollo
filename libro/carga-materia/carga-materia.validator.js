/* =========================================================
Nombre completo: carga-materia.validator.js
Ruta o ubicación: /desarrollo/libro/carga-materia/carga-materia.validator.js
Función o funciones:
1. Validar la materia consolidada generada en el Bloque 6.
2. Separar errores estructurales y advertencias académicas.
3. Verificar carrera, materia, descripción, objetivo, cuatro unidades, contenidos y actividades.
4. Revisar bibliografía, justificación y elementos sin unidad.
5. Entregar un estado claro para continuar al guardado del Bloque 8.
========================================================= */

(function attachCargaMateriaValidator(window) {
  "use strict";

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function unique(values) {
    var seen = {};
    var output = [];

    safeArray(values).forEach(function eachValue(value) {
      var current = text(value);
      var key = current.toLowerCase();

      if (!current || seen[key]) return;

      seen[key] = true;
      output.push(current);
    });

    return output;
  }

  function pushIf(condition, list, message) {
    if (condition) list.push(message);
  }

  function countUnitItems(units, key) {
    return safeArray(units).reduce(function sum(total, unit) {
      return total + safeArray(unit[key]).length;
    }, 0);
  }

  function validateUnits(materia, errores, advertencias, correctos) {
    var unidades = safeArray(materia.unidades);

    if (unidades.length !== 4) {
      errores.push("La materia debe tener exactamente 4 unidades; se encontraron " + unidades.length + ".");
      return;
    }

    correctos.push("Se encontraron exactamente 4 unidades.");

    unidades.forEach(function eachUnit(unit, index) {
      var numero = Number(unit.numero || index + 1);
      var contenidos = safeArray(unit.contenidos);
      var actividades = safeArray(unit.actividades);

      pushIf(!text(unit.nombre), advertencias, "Unidad " + numero + ": falta el nombre de la unidad.");
      pushIf(!text(unit.competencia), advertencias, "Unidad " + numero + ": falta la competencia.");
      pushIf(!text(unit.resultadoAprendizaje), advertencias, "Unidad " + numero + ": falta el resultado de aprendizaje.");
      pushIf(!contenidos.length, advertencias, "Unidad " + numero + ": no tiene contenidos vinculados.");
      pushIf(!actividades.length, advertencias, "Unidad " + numero + ": no tiene actividades vinculadas.");

      if (text(unit.nombre)) correctos.push("Unidad " + numero + ": nombre detectado.");
      if (text(unit.competencia)) correctos.push("Unidad " + numero + ": competencia detectada.");
      if (text(unit.resultadoAprendizaje)) correctos.push("Unidad " + numero + ": resultado de aprendizaje detectado.");
      if (contenidos.length) correctos.push("Unidad " + numero + ": " + contenidos.length + " contenidos vinculados.");
      if (actividades.length) correctos.push("Unidad " + numero + ": " + actividades.length + " actividades vinculadas.");
    });
  }

  function validateUnassigned(materia, advertencias) {
    var sinUnidad = materia.elementosSinUnidad || {};
    var contenidosSinUnidad = safeArray(sinUnidad.contenidos);
    var actividadesSinUnidad = safeArray(sinUnidad.actividades);

    if (contenidosSinUnidad.length) {
      advertencias.push("Existen " + contenidosSinUnidad.length + " contenidos sin unidad vinculada.");
    }

    if (actividadesSinUnidad.length) {
      advertencias.push("Existen " + actividadesSinUnidad.length + " actividades sin unidad vinculada.");
    }
  }

  function buildStatus(errores, advertencias) {
    if (errores.length) return "incompleto";
    if (advertencias.length) return "con_advertencias";
    return "completo";
  }

  function validate(materia) {
    var errores = [];
    var advertencias = [];
    var correctos = [];

    if (!materia) {
      return {
        estado: "error",
        completo: false,
        errores: ["No existe materia consolidada para validar."],
        advertencias: [],
        correctos: [],
        resumen: {
          unidades: 0,
          contenidos: 0,
          actividades: 0,
          errores: 1,
          advertencias: 0
        }
      };
    }

    pushIf(!text(materia.carrera), errores, "Falta la carrera.");
    pushIf(!text(materia.materia), errores, "Falta la materia.");
    pushIf(!text(materia.descripcion), advertencias, "Falta la descripción de la materia.");
    pushIf(!text(materia.objetivo), advertencias, "Falta el objetivo de la materia.");
    pushIf(!text(materia.bibliografia), advertencias, "Falta bibliografía.");
    pushIf(!text(materia.justificacionBibliografia), advertencias, "Falta justificación de la bibliografía.");

    if (text(materia.carrera)) correctos.push("Carrera registrada.");
    if (text(materia.materia)) correctos.push("Materia registrada.");
    if (text(materia.descripcion)) correctos.push("Descripción detectada.");
    if (text(materia.objetivo)) correctos.push("Objetivo detectado.");
    if (text(materia.bibliografia)) correctos.push("Bibliografía detectada.");
    if (text(materia.justificacionBibliografia)) correctos.push("Justificación de bibliografía detectada.");

    validateUnits(materia, errores, advertencias, correctos);
    validateUnassigned(materia, advertencias);

    advertencias = unique(advertencias.concat(safeArray(materia.advertencias)));
    errores = unique(errores);
    correctos = unique(correctos);

    var estado = buildStatus(errores, advertencias);
    var unidades = safeArray(materia.unidades);

    return {
      estado: estado,
      completo: estado === "completo",
      errores: errores,
      advertencias: advertencias,
      correctos: correctos,
      resumen: {
        unidades: unidades.length,
        contenidos: countUnitItems(unidades, "contenidos"),
        actividades: countUnitItems(unidades, "actividades"),
        errores: errores.length,
        advertencias: advertencias.length,
        correctos: correctos.length
      },
      validadoEn: new Date().toISOString()
    };
  }

  window.LibroCargaMateriaValidator = {
    validate: validate
  };
})(window);
