/* =========================================================
Nombre completo: generador-libro.builder.js
Ruta o ubicación: /desarrollo/libro/generador-libro/generador-libro.builder.js
Función o funciones:
1. Generar una estructura de libro académico desde una materia consolidada.
2. Crear un texto ordenado por portada, descripción, objetivo, unidades, contenidos y actividades.
3. Mantener la información original de la materia sin modificarla.
4. Entregar salida TXT y JSON para exportación.
========================================================= */

(function attachGeneradorLibroBuilder(window) {
  "use strict";

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function safeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function line(value) {
    return text(value) || "[No detectado]";
  }

  function contentLabel(item) {
    var codigo = text(item && item.codigo);
    var contenido = text(item && item.contenido);

    if (codigo && contenido) return codigo + ". " + contenido;
    if (contenido) return contenido;
    if (codigo) return codigo;

    return text(item && item.textoOriginal) || "Contenido sin texto";
  }

  function activityLabel(item) {
    var parts = [];
    var semana = text(item && item.semana);
    var tipo = text(item && item.tipo);
    var codigo = text(item && item.codigoRelacionado);
    var actividad = text(item && item.actividad);
    var resultado = text(item && item.resultadoAprendizaje);

    if (semana) parts.push("Semana: " + semana);
    if (tipo) parts.push("Tipo: " + tipo);
    if (codigo) parts.push("Tema: " + codigo);
    if (actividad) parts.push("Actividad: " + actividad);
    if (resultado) parts.push("Resultado: " + resultado);

    return parts.length ? parts.join(" | ") : text(item && item.textoOriginal) || "Actividad sin texto";
  }

  function buildUnitText(unit) {
    var output = [];
    var contenidos = safeArray(unit.contenidos);
    var actividades = safeArray(unit.actividades);

    output.push("UNIDAD " + unit.numero + ": " + line(unit.nombre));
    output.push("Competencia: " + line(unit.competencia));
    output.push("Resultado de aprendizaje: " + line(unit.resultadoAprendizaje));
    output.push("");
    output.push("Contenidos de la unidad");

    if (!contenidos.length) {
      output.push("- [Sin contenidos detectados]");
    } else {
      contenidos.forEach(function eachContent(item) {
        output.push("- " + contentLabel(item));
      });
    }

    output.push("");
    output.push("Actividades de aprendizaje");

    if (!actividades.length) {
      output.push("- [Sin actividades detectadas]");
    } else {
      actividades.forEach(function eachActivity(item) {
        output.push("- " + activityLabel(item));
      });
    }

    return output.join("\n");
  }

  function buildText(materia) {
    var output = [];
    var units = safeArray(materia.unidades);
    var sinUnidad = materia.elementosSinUnidad || {};

    output.push("LIBRO ACADÉMICO");
    output.push("================");
    output.push("");
    output.push("Carrera: " + line(materia.carrera));
    output.push("Materia: " + line(materia.materia));
    output.push("ID local: " + line(materia.idLocal));
    output.push("");
    output.push("DESCRIPCIÓN DE LA MATERIA");
    output.push(line(materia.descripcion));
    output.push("");
    output.push("OBJETIVO DE LA MATERIA");
    output.push(line(materia.objetivo));
    output.push("");
    output.push("DESARROLLO POR UNIDADES");
    output.push("========================");

    units.forEach(function eachUnit(unit) {
      output.push("");
      output.push(buildUnitText(unit));
    });

    output.push("");
    output.push("BIBLIOGRAFÍA");
    output.push(line(materia.bibliografia));
    output.push("");
    output.push("JUSTIFICACIÓN DE BIBLIOGRAFÍA");
    output.push(line(materia.justificacionBibliografia));
    output.push("");
    output.push("OBSERVACIONES PARA REVISIÓN");
    output.push("Contenidos sin unidad: " + safeArray(sinUnidad.contenidos).length);
    output.push("Actividades sin unidad: " + safeArray(sinUnidad.actividades).length);

    safeArray(materia.advertencias).forEach(function eachWarning(warning) {
      output.push("- " + warning);
    });

    return output.join("\n");
  }

  function build(materia) {
    if (!materia) {
      throw new Error("No existe materia consolidada para generar el libro.");
    }

    var texto = buildText(materia);

    return {
      modulo: "libro",
      pantalla: "generador-libro",
      version: "1.0.0",
      estado: "libro_generado",
      generadoEn: new Date().toISOString(),
      materiaIdLocal: materia.idLocal || "",
      carrera: materia.carrera || "",
      materia: materia.materia || "",
      libro: {
        formato: "txt",
        titulo: "Libro académico - " + (materia.materia || "Materia"),
        texto: texto,
        unidades: safeArray(materia.unidades).length
      },
      materiaConsolidada: materia
    };
  }

  window.GeneradorLibroBuilder = {
    build: build,
    buildText: buildText
  };
})(window);
