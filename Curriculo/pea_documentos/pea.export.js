/*
Nombre del archivo: pea.export.js
Ubicación: /Curriculo/pea_documentos/pea.export.js
Función:
- Exportar una versión PEA a PDF
- Reconstruir los 3 Excel desde la versión cargada
- Exportar comparación a PDF
*/
(function (window) {
  "use strict";

  window.PEA = window.PEA || {};
  var PEA = window.PEA;

  function ensureXlsx() { if (!window.XLSX) throw new Error("No se encontró la librería XLSX."); }
  function ensurePdf() { if (!window.jspdf || !window.jspdf.jsPDF) throw new Error("No se encontró la librería jsPDF."); }
  function sheets(section) { return section && Array.isArray(section.sheets) ? section.sheets : []; }
  function safeFile(value) { return String(value || "Archivo").replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").slice(0, 80); }

  function formatDate(value) {
    if (!value) return "Sin fecha";
    try { return new Date(value).toLocaleString("es-EC"); }
    catch (error) { return String(value); }
  }

  function addText(doc, ctx, text, gap) {
    var lines = doc.splitTextToSize(String(text || ""), 180);
    lines.forEach(function (line) {
      if (ctx.y > 280) { doc.addPage(); ctx.y = 18; }
      doc.text(line, 15, ctx.y); ctx.y += 6;
    });
    ctx.y += Number(gap || 2);
  }

  function addSection(doc, ctx, title, section) {
    var list = sheets(section);
    doc.setFont("helvetica", "bold"); addText(doc, ctx, title, 1); doc.setFont("helvetica", "normal");
    if (!list.length) { addText(doc, ctx, "Sin información registrada.", 4); return; }
    list.forEach(function (sheet) {
      addText(doc, ctx, "Hoja: " + (sheet.name || "Hoja") + " | Filas: " + Number(sheet.rowCount || 0), 1);
      (sheet.rows || []).forEach(function (row) { addText(doc, ctx, (Array.isArray(row) ? row : []).map(function (cell) { return String(cell == null ? "" : cell).replace(/\s+/g, " ").trim(); }).join(" | ") || " ", 0); });
      ctx.y += 4;
    });
  }

  function placeholder(title) { return { name: "Hoja1", rows: [[title], ["Sin información disponible."]], rowCount: 2 }; }

  function sectionToWorkbook(section, title) {
    ensureXlsx();
    var wb = XLSX.utils.book_new();
    var list = sheets(section);
    if (!list.length) list = [placeholder(title)];
    list.forEach(function (sheet) {
      var ws = XLSX.utils.aoa_to_sheet(Array.isArray(sheet.rows) ? sheet.rows : [["Sin datos"]]);
      XLSX.utils.book_append_sheet(wb, ws, String(sheet.name || "Hoja1").slice(0, 31) || "Hoja1");
    });
    return wb;
  }

  PEA.export = {
    downloadPdfVersion: function (versionData) {
      ensurePdf();
      if (!versionData || !versionData.data || !versionData.meta) throw new Error("No hay una versión cargada para exportar.");
      var jsPDF = window.jspdf.jsPDF;
      var doc = new jsPDF();
      var ctx = { y: 18 };
      var meta = versionData.meta;
      var content = versionData.data.contenido || {};
      doc.setFont("helvetica", "bold"); addText(doc, ctx, "PEA - Documento de versión", 2); doc.setFont("helvetica", "normal");
      addText(doc, ctx, "Materia: " + (meta.materiaNombre || ""), 1);
      addText(doc, ctx, "Código: " + (meta.materiaCodigo || "Sin código"), 1);
      addText(doc, ctx, "Versión: " + (meta.versionId || ""), 1);
      addText(doc, ctx, "Origen: " + (meta.origenTipo || ""), 1);
      addText(doc, ctx, "Fecha: " + formatDate(meta.createdAtClient), 1);
      addText(doc, ctx, "Nota: " + (meta.versionNota || "Sin nota"), 4);
      addSection(doc, ctx, "BASE", content.base);
      addSection(doc, ctx, "UNIDADES", content.unidades);
      addSection(doc, ctx, "ACTIVIDADES", content.actividades);
      doc.save(["PEA", safeFile(meta.materiaNombre || "Materia"), safeFile(meta.versionId || "version")].join("_") + ".pdf");
    },

    downloadPdfComparison: function (comparison) {
      ensurePdf();
      if (!comparison) throw new Error("No hay una comparación disponible.");
      var jsPDF = window.jspdf.jsPDF;
      var doc = new jsPDF();
      var ctx = { y: 18 };
      doc.setFont("helvetica", "bold"); addText(doc, ctx, "PEA - Comparación de versiones", 2); doc.setFont("helvetica", "normal");
      addText(doc, ctx, "Materia: " + (comparison.materiaNombre || ""), 1);
      addText(doc, ctx, "Versión A: " + ((comparison.versionA && comparison.versionA.versionId) || ""), 1);
      addText(doc, ctx, "Versión B: " + ((comparison.versionB && comparison.versionB.versionId) || ""), 1);
      addText(doc, ctx, "Total de cambios: " + Number(comparison.totalCambios || 0), 4);
      (comparison.sections || []).forEach(function (section) {
        doc.setFont("helvetica", "bold"); addText(doc, ctx, "SECCIÓN: " + section.sectionName, 1); doc.setFont("helvetica", "normal");
        addText(doc, ctx, "Agregadas: " + (section.added || []).length, 0);
        addText(doc, ctx, "Eliminadas: " + (section.removed || []).length, 0);
        addText(doc, ctx, "Modificadas: " + (section.changed || []).length, 2);
        (section.added || []).forEach(function (item) { addText(doc, ctx, "+ " + item.sheet + " | " + item.rowsAfter + " filas", 0); });
        (section.removed || []).forEach(function (item) { addText(doc, ctx, "- " + item.sheet + " | " + item.rowsBefore + " filas", 0); });
        (section.changed || []).forEach(function (item) { addText(doc, ctx, "* " + item.sheet + " | antes: " + item.rowsBefore + " | después: " + item.rowsAfter, 0); });
        ctx.y += 4;
      });
      doc.save(["PEA_Comparacion", safeFile(comparison.materiaNombre || "Materia"), safeFile((comparison.versionA && comparison.versionA.versionId) || "A"), "vs", safeFile((comparison.versionB && comparison.versionB.versionId) || "B")].join("_") + ".pdf");
    },

    downloadThreeExcels: function (versionData) {
      ensureXlsx();
      if (!versionData || !versionData.data || !versionData.meta) throw new Error("No hay una versión cargada para reconstruir Excel.");
      var meta = versionData.meta;
      var content = versionData.data.contenido || {};
      var materia = safeFile(meta.materiaNombre || "Materia");
      var version = safeFile(meta.versionId || "v");
      XLSX.writeFile(sectionToWorkbook(content.base, "PEA Base"), "PEA Base - " + materia + " - " + version + ".xlsx");
      XLSX.writeFile(sectionToWorkbook(content.unidades, "PEA Unidades"), "PEA Unidades - " + materia + " - " + version + ".xlsx");
      XLSX.writeFile(sectionToWorkbook(content.actividades, "PEA Actividades"), "PEA Actividades - " + materia + " - " + version + ".xlsx");
    }
  };
})(window);
