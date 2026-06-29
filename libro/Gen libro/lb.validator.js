/* =========================================================
Nombre completo: lb.validator.js
Ruta o ubicación: /desarrollo/libro/Gen libro/lb.validator.js
Función o funciones:
1. Revisar la materia seleccionada antes de iniciar el libro.
2. Validar solo lo necesario para no romper la generación.
3. Convertir faltantes en advertencias para que la IA desarrolle el libro.
4. No bloquear por contenidos cortos o incompletos.
========================================================= */

(function attachLbValidator(window) {
  "use strict";

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function getMateria(item) {
    if (!item) return null;
    if (item.materiaConsolidada) return item.materiaConsolidada;
    if (item.payload && item.payload.materiaConsolidada) return item.payload.materiaConsolidada;
    return item;
  }

  function countByKey(items, key) {
    return asArray(items).reduce(function reduceCount(total, item) {
      return total + asArray(item && item[key]).length;
    }, 0);
  }

  function validate(item) {
    var materia = getMateria(item);
    var errores = [];
    var advertencias = [];
    var correctos = [];
    var unidades = materia ? asArray(materia.unidades) : [];
    var contenidos = countByKey(unidades, "contenidos");
    var actividades = countByKey(unidades, "actividades");

    if (!materia) {
      errores.push("No se encontró materia consolidada.");
    }

    if (!text(materia && materia.carrera)) {
      advertencias.push("La carrera no está completa; se intentará usar el dato del selector.");
    } else {
      correctos.push("Carrera detectada.");
    }

    if (!text(materia && materia.materia)) {
      errores.push("No se encontró el nombre de la asignatura.");
    } else {
      correctos.push("Nombre de asignatura detectado.");
    }

    if (!unidades.length) {
      advertencias.push("No se detectaron unidades completas; el libro se generará desarrollando la información disponible.");
    } else {
      correctos.push("Unidades detectadas: " + unidades.length + ".");
    }

    if (unidades.length && unidades.length < 4) {
      advertencias.push("Hay menos de cuatro unidades; se completará el desarrollo según la información disponible.");
    }

    if (!contenidos) {
      advertencias.push("No se detectaron contenidos detallados; la IA deberá desarrollar el libro desde los datos base.");
    } else {
      correctos.push("Contenidos detectados: " + contenidos + ".");
    }

    if (!actividades) {
      advertencias.push("No se detectaron actividades; las evaluaciones se crearán a partir de los contenidos.");
    } else {
      correctos.push("Actividades detectadas: " + actividades + ".");
    }

    return {
      ok: errores.length === 0,
      estado: errores.length ? "error" : (advertencias.length ? "con_advertencias" : "listo"),
      errores: errores,
      advertencias: advertencias,
      correctos: correctos,
      resumen: {
        carrera: text(materia && materia.carrera),
        materia: text(materia && materia.materia),
        unidades: unidades.length,
        contenidos: contenidos,
        actividades: actividades
      },
      validadoEn: new Date().toISOString()
    };
  }

  function message(validation) {
    if (!validation || validation.errores.length) {
      return "No se pudo validar la materia para generar el libro.";
    }

    if (validation.advertencias.length) {
      return "Materia validada con advertencias. La generación continuará desarrollando lo que falte.";
    }

    return "Materia validada. Lista para planificar el libro.";
  }

  window.LibroGenLibroValidator = {
    validate: validate,
    message: message
  };
})(window);
