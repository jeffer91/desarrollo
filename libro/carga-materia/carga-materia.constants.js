/* =========================================================
Nombre completo: carga-materia.constants.js
Ruta o ubicación: /desarrollo/libro/carga-materia/carga-materia.constants.js
Función o funciones:
1. Centralizar reglas fijas de la pantalla Carga de materia.
2. Definir archivos esperados, extensiones permitidas y unidades obligatorias.
3. Preparar nombres equivalentes de columnas para los siguientes bloques.
4. Evitar valores sueltos dentro del controlador principal.
========================================================= */

(function attachCargaMateriaConstants(window) {
  "use strict";

  var FILE_KINDS = {
    base: {
      key: "base",
      orden: 1,
      etiqueta: "Archivo 1",
      nombre: "Información base",
      descripcion: "Descripción, objetivo, unidades, competencias, resultados, bibliografía y justificación.",
      extensiones: ["xlsx", "xls", "pdf"],
      aceptaPdf: true,
      requerido: true
    },
    contenidos: {
      key: "contenidos",
      orden: 2,
      etiqueta: "Archivo 2",
      nombre: "Contenido de unidades",
      descripcion: "Temas y subtemas de las cuatro unidades.",
      extensiones: ["xlsx", "xls"],
      aceptaPdf: false,
      requerido: true
    },
    actividades: {
      key: "actividades",
      orden: 3,
      etiqueta: "Archivo 3",
      nombre: "Actividades",
      descripcion: "Actividades de aprendizaje de la materia.",
      extensiones: ["xlsx", "xls"],
      aceptaPdf: false,
      requerido: true
    }
  };

  var RULES = {
    unidadesEsperadas: 4,
    maxFilasVistaPrevia: 8,
    maxColumnasVistaPrevia: 18,
    hojasMaximasResumen: 12,
    bloqueActual: 2,
    siguienteBloque: 3
  };

  var EXPECTED_FIELDS = {
    base: {
      descripcion: [
        "descripcion",
        "descripción",
        "descripcion de la materia",
        "descripción de la materia",
        "descripcion materia",
        "descripción materia"
      ],
      objetivo: [
        "objetivo",
        "objetivo de la materia",
        "objetivo materia",
        "objetivo general"
      ],
      unidad: [
        "unidad",
        "unidades",
        "nombre unidad",
        "nombre de unidad",
        "unidad tematica",
        "unidad temática"
      ],
      competencia: [
        "competencia",
        "competencias",
        "competencia especifica",
        "competencia específica"
      ],
      resultadoAprendizaje: [
        "resultado de aprendizaje",
        "resultados de aprendizaje",
        "resultado aprendizaje",
        "ra"
      ],
      bibliografia: [
        "bibliografia",
        "bibliografía",
        "referencias",
        "bibliografia basica",
        "bibliografía básica"
      ],
      justificacionBibliografia: [
        "justificacion bibliografia",
        "justificación bibliografía",
        "justificacion de la bibliografia",
        "justificación de la bibliografía"
      ]
    },
    contenidos: {
      unidad: ["unidad", "n unidad", "numero unidad", "número unidad"],
      codigo: ["codigo", "código", "tema", "subtema", "numeracion", "numeración"],
      contenido: ["contenido", "contenidos", "tema", "temas", "descripcion", "descripción"]
    },
    actividades: {
      unidad: ["unidad", "n unidad", "numero unidad", "número unidad"],
      actividad: ["actividad", "actividades", "descripcion", "descripción", "nombre actividad"],
      tipo: ["tipo", "tipo actividad", "tipo de actividad"],
      semana: ["semana", "semanas"],
      resultadoAprendizaje: ["resultado de aprendizaje", "resultado aprendizaje", "ra"]
    }
  };

  function getFileKind(kind) {
    return FILE_KINDS[kind] || null;
  }

  function getAllowedExtensions(kind) {
    var config = getFileKind(kind);
    return config ? config.extensiones.slice() : [];
  }

  window.LibroCargaMateriaConstants = {
    FILE_KINDS: FILE_KINDS,
    RULES: RULES,
    EXPECTED_FIELDS: EXPECTED_FIELDS,
    getFileKind: getFileKind,
    getAllowedExtensions: getAllowedExtensions
  };
})(window);
