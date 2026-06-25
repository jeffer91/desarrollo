/*
Nombre del archivo: ccc.validator.js
Ubicación: /Curriculo/pea_documentos/ccc.validator.js
Función:
- Validar estructura mínima de versiones PEA
- Evitar guardar cargas sin base, unidades o actividades
- Normalizar mensajes de error del módulo PEA
*/
(function (window) {
  "use strict";

  window.PEA = window.PEA || {};
  var PEA = window.PEA;

  function hasSheets(section) {
    return !!(section && Array.isArray(section.sheets) && section.sheets.length);
  }

  function clean(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  PEA.cccValidator = {
    validateUpload: function (payload) {
      var data = payload || {};
      var content = data.contenido || {};
      var errors = [];

      if (!clean(data.carreraId)) errors.push("Falta la carrera.");
      if (!clean(data.materiaId)) errors.push("Falta la materia.");
      if (!clean(data.materiaNombre)) errors.push("Falta el nombre de la materia.");
      if (!hasSheets(content.base)) errors.push("Falta PEA Base.");
      if (!hasSheets(content.unidades)) errors.push("Falta PEA Unidades.");
      if (!hasSheets(content.actividades)) errors.push("Falta PEA Actividades.");

      if (errors.length) throw new Error(errors.join(" "));
      return true;
    },

    validateVersion: function (versionData) {
      if (!versionData || !versionData.meta || !versionData.data) throw new Error("La versión PEA no es válida.");
      return true;
    }
  };
})(window);
