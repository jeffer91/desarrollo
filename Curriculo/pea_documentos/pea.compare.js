/*
Nombre del archivo: pea.compare.js
Ubicación: /Curriculo/pea_documentos/pea.compare.js
Función:
- Comparar dos versiones PEA
- Revisar hojas agregadas, eliminadas o modificadas
- Devolver resumen para vista previa y PDF comparativo
*/
(function (window) {
  "use strict";

  window.PEA = window.PEA || {};
  var PEA = window.PEA;

  function safeSheets(section) { return section && Array.isArray(section.sheets) ? section.sheets : []; }
  function safeRows(sheet) { return sheet && Array.isArray(sheet.rows) ? sheet.rows : []; }
  function cell(value) { return String(value == null ? "" : value).replace(/\s+/g, " ").trim(); }
  function flattenSheet(sheet) { return safeRows(sheet).map(function (row) { return (Array.isArray(row) ? row : []).map(cell).join(" | "); }).join("\n"); }

  function buildSheetMap(section) {
    var map = Object.create(null);
    safeSheets(section).forEach(function (sheet) {
      var name = String(sheet.name || "Hoja");
      map[name] = { name: name, rowCount: Number(sheet.rowCount || safeRows(sheet).length || 0), text: flattenSheet(sheet) };
    });
    return map;
  }

  function uniqueNames(mapA, mapB) {
    var out = Object.create(null);
    Object.keys(mapA || {}).forEach(function (key) { out[key] = true; });
    Object.keys(mapB || {}).forEach(function (key) { out[key] = true; });
    return Object.keys(out).sort(function (a, b) { return a.localeCompare(b, "es", { sensitivity: "base", numeric: true }); });
  }

  function compareSection(sectionName, sectionA, sectionB) {
    var mapA = buildSheetMap(sectionA);
    var mapB = buildSheetMap(sectionB);
    var added = [], removed = [], changed = [], unchanged = [];

    uniqueNames(mapA, mapB).forEach(function (name) {
      var a = mapA[name];
      var b = mapB[name];
      if (!a && b) added.push({ sheet: name, rowsBefore: 0, rowsAfter: b.rowCount });
      else if (a && !b) removed.push({ sheet: name, rowsBefore: a.rowCount, rowsAfter: 0 });
      else if (a && b && a.text !== b.text) changed.push({ sheet: name, rowsBefore: a.rowCount, rowsAfter: b.rowCount });
      else unchanged.push({ sheet: name, rowsBefore: a ? a.rowCount : 0, rowsAfter: b ? b.rowCount : 0 });
    });

    return { sectionName: sectionName, added: added, removed: removed, changed: changed, unchanged: unchanged, totalChanges: added.length + removed.length + changed.length };
  }

  PEA.compare = {
    compareVersions: function (versionA, versionB) {
      var contentA;
      var contentB;
      var base;
      var unidades;
      var actividades;
      if (!versionA || !versionB) throw new Error("Se requieren dos versiones para comparar.");
      contentA = versionA.data && versionA.data.contenido ? versionA.data.contenido : {};
      contentB = versionB.data && versionB.data.contenido ? versionB.data.contenido : {};
      base = compareSection("Base", contentA.base, contentB.base);
      unidades = compareSection("Unidades", contentA.unidades, contentB.unidades);
      actividades = compareSection("Actividades", contentA.actividades, contentB.actividades);
      return { materiaId: versionA.meta.materiaId || versionB.meta.materiaId || "", materiaNombre: versionA.meta.materiaNombre || versionB.meta.materiaNombre || "", versionA: versionA.meta, versionB: versionB.meta, sections: [base, unidades, actividades], totalCambios: Number(base.totalChanges || 0) + Number(unidades.totalChanges || 0) + Number(actividades.totalChanges || 0) };
    }
  };
})(window);
