/* =========================================================
Nombre completo: defart.export.js
Ruta o ubicación: /Requisitos/defart/defart.export.js
Función o funciones:
- Descargar Excel de la tabla visible de Defensas.
- Exportar solo columnas visibles: Cédula, Nombre, Carrera, N-ART, N-DEF, N-FIN.
- Nombrar el archivo con período, fecha y hora.
Con qué se conecta:
- defart.app.js
========================================================= */
(function(window){
  "use strict";

  function text(value){
    return String(value == null ? "" : value).trim();
  }

  function safeFile(value){
    return text(value || "TODOS")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_.-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function stamp(){
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    var h = String(d.getHours()).padStart(2, "0");
    var min = String(d.getMinutes()).padStart(2, "0");
    return y + "-" + m + "-" + day + "_" + h + "-" + min;
  }

  function formatNote(value){
    if(value === null || value === undefined || value === ""){
      return "";
    }
    var num = Number(String(value).replace(",", "."));
    if(!Number.isFinite(num)){
      return "";
    }
    return Math.round(num * 100) / 100;
  }

  function rowsToVisibleExport(rows){
    return (rows || []).map(function(row){
      return {
        "Cédula":text(row._cedula),
        "Nombre":text(row._nombre),
        "Carrera":text(row._carrera),
        "N-ART":formatNote(row._nart),
        "N-DEF":formatNote(row._ndef),
        "N-FIN":formatNote(row._nfin)
      };
    });
  }

  function downloadBlob(name, content, type){
    var blob = new Blob([content], {type:type || "text/plain;charset=utf-8"});
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function(){URL.revokeObjectURL(link.href);}, 1000);
  }

  function csvFallback(rows, fileName){
    var exported = rowsToVisibleExport(rows);
    var headers = ["Cédula", "Nombre", "Carrera", "N-ART", "N-DEF", "N-FIN"];
    var lines = [headers.join(",")];
    exported.forEach(function(row){
      lines.push(headers.map(function(header){
        return '"' + text(row[header]).replace(/"/g, '""') + '"';
      }).join(","));
    });
    downloadBlob(fileName.replace(/\.xlsx$/i, ".csv"), lines.join("\n"), "text/csv;charset=utf-8");
  }

  function exportExcel(rows, context){
    context = context || {};
    var period = safeFile(context.periodId || context.periodLabel || "TODOS");
    var fileName = period + "_" + stamp() + ".xlsx";
    var data = rowsToVisibleExport(rows || []);

    if(!window.XLSX || !window.XLSX.utils){
      csvFallback(rows || [], fileName);
      return {ok:true, fallback:"csv", fileName:fileName.replace(/\.xlsx$/i, ".csv"), rows:data.length};
    }

    var worksheet = window.XLSX.utils.json_to_sheet(data, {header:["Cédula", "Nombre", "Carrera", "N-ART", "N-DEF", "N-FIN"]});
    worksheet["!cols"] = [
      {wch:16},
      {wch:34},
      {wch:36},
      {wch:10},
      {wch:10},
      {wch:10}
    ];
    worksheet["!autofilter"] = {ref:"A1:F" + Math.max(1, data.length + 1)};

    var workbook = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "Defensas");
    window.XLSX.writeFile(workbook, fileName);
    return {ok:true, fileName:fileName, rows:data.length};
  }

  window.DefartExport = {
    exportExcel:exportExcel,
    rowsToVisibleExport:rowsToVisibleExport
  };
})(window);
