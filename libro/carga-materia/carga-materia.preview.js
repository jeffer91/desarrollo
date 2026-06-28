/* =========================================================
Nombre completo: carga-materia.preview.js
Ruta o ubicación: /desarrollo/libro/carga-materia/carga-materia.preview.js
Función o funciones:
1. Construir una vista previa legible de la materia consolidada.
2. Mostrar estado, errores, advertencias y elementos correctos.
3. Resumir cada unidad con nombre, competencia, resultado, contenidos y actividades.
4. Evitar que el usuario dependa únicamente del JSON técnico.
5. Preparar una visualización más clara antes del guardado del Bloque 8.
========================================================= */

(function attachCargaMateriaPreview(window) {
  "use strict";

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function limit(values, max) {
    return safeArray(values).slice(0, max || 6);
  }

  function itemLabel(item, fallback) {
    if (!item) return fallback || "Sin texto";

    return text(item.codigo || item.codigoRelacionado || "")
      ? text(item.codigo || item.codigoRelacionado) + " · " + text(item.contenido || item.actividad || item.temaRelacionado || fallback)
      : text(item.contenido || item.actividad || item.temaRelacionado || fallback);
  }

  function section(title, items, emptyText) {
    var output = [];
    output.push(title);

    if (!safeArray(items).length) {
      output.push("  - " + (emptyText || "Sin registros."));
      return output.join("\n");
    }

    safeArray(items).forEach(function eachItem(item) {
      output.push("  - " + item);
    });

    return output.join("\n");
  }

  function buildValidationText(validacion) {
    var output = [];
    var validation = validacion || {};

    output.push("VALIDACIÓN");
    output.push("Estado: " + text(validation.estado || "sin_validar"));

    if (validation.resumen) {
      output.push(
        "Resumen: " +
        "unidades=" + validation.resumen.unidades + ", " +
        "contenidos=" + validation.resumen.contenidos + ", " +
        "actividades=" + validation.resumen.actividades + ", " +
        "errores=" + validation.resumen.errores + ", " +
        "advertencias=" + validation.resumen.advertencias
      );
    }

    output.push("");
    output.push(section("ERRORES", validation.errores || [], "Sin errores estructurales."));
    output.push("");
    output.push(section("ADVERTENCIAS", validation.advertencias || [], "Sin advertencias."));
    output.push("");
    output.push(section("CORRECTOS", limit(validation.correctos || [], 12), "Sin registros correctos todavía."));

    return output.join("\n");
  }

  function buildUnitText(unit) {
    var output = [];
    var contenidos = safeArray(unit.contenidos);
    var actividades = safeArray(unit.actividades);

    output.push("UNIDAD " + unit.numero);
    output.push("Nombre: " + (text(unit.nombre) || "[No detectado]"));
    output.push("Competencia: " + (text(unit.competencia) || "[No detectada]"));
    output.push("Resultado de aprendizaje: " + (text(unit.resultadoAprendizaje) || "[No detectado]"));
    output.push("Contenidos detectados: " + contenidos.length);

    limit(contenidos, 8).forEach(function eachContent(item) {
      output.push("  - " + itemLabel(item, "Contenido sin texto"));
    });

    if (contenidos.length > 8) output.push("  - ... " + (contenidos.length - 8) + " contenidos más");

    output.push("Actividades detectadas: " + actividades.length);

    limit(actividades, 8).forEach(function eachActivity(item) {
      output.push("  - " + itemLabel(item, "Actividad sin texto"));
    });

    if (actividades.length > 8) output.push("  - ... " + (actividades.length - 8) + " actividades más");

    return output.join("\n");
  }

  function buildPreview(expediente, materia, validacion) {
    var output = [];
    var consolidated = materia || (expediente ? expediente.materiaConsolidada : null) || {};
    var units = safeArray(consolidated.unidades);
    var sinUnidad = consolidated.elementosSinUnidad || {};

    output.push("MATERIA CONSOLIDADA");
    output.push("ID local: " + text(consolidated.idLocal || "sin_id"));
    output.push("Carrera: " + (text(consolidated.carrera) || "[No registrada]"));
    output.push("Materia: " + (text(consolidated.materia) || "[No registrada]"));
    output.push("Estado: " + text(consolidated.estado || "sin_estado"));
    output.push("");
    output.push("Descripción: " + (text(consolidated.descripcion) || "[No detectada]"));
    output.push("Objetivo: " + (text(consolidated.objetivo) || "[No detectado]"));
    output.push("");
    output.push(buildValidationText(validacion));
    output.push("");
    output.push("UNIDADES");
    output.push("========");

    if (!units.length) {
      output.push("No hay unidades consolidadas.");
    }

    units.forEach(function eachUnit(unit) {
      output.push("");
      output.push(buildUnitText(unit));
    });

    output.push("");
    output.push("BIBLIOGRAFÍA");
    output.push(text(consolidated.bibliografia) || "[No detectada]");
    output.push("");
    output.push("JUSTIFICACIÓN DE BIBLIOGRAFÍA");
    output.push(text(consolidated.justificacionBibliografia) || "[No detectada]");
    output.push("");
    output.push("ELEMENTOS SIN UNIDAD");
    output.push("Contenidos sin unidad: " + safeArray(sinUnidad.contenidos).length);
    output.push("Actividades sin unidad: " + safeArray(sinUnidad.actividades).length);

    return output.join("\n");
  }

  function render(container, expediente, materia, validacion) {
    if (!container) return;
    container.textContent = buildPreview(expediente, materia, validacion);
  }

  window.LibroCargaMateriaPreview = {
    buildPreview: buildPreview,
    render: render
  };
})(window);
