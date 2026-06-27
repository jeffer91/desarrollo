/* =========================================================
Nombre completo: bl2-requisitos.repo.js
Ruta o ubicación: /Requisitos/BaseLocal2/repositories/bl2-requisitos.repo.js
Función o funciones:
- Centralizar lectura de requisitos y notas desde filas de estudiantes BL2/V1.
- Mantener alias tolerantes para campos de Firestore, Excel y Base Local.
- Entregar utilidades reutilizables por Ficha y futuros reportes.
Con qué se conecta:
- Ficha/ficha.core.js
- BaseLocal2/repositories/bl2-estudiantes.repo.js
========================================================= */
(function(window){
  "use strict";

  function text(value){return String(value == null ? "" : value).trim();}
  function norm(value){return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();}
  function pick(row, aliases, fallback){
    row = row || {};
    var keys = Object.keys(row);
    for(var i = 0; i < aliases.length; i += 1){
      var wanted = norm(aliases[i]);
      for(var j = 0; j < keys.length; j += 1){
        if(norm(keys[j]) === wanted){
          var value = row[keys[j]];
          if(value != null && text(value) !== ""){return value;}
        }
      }
    }
    return fallback || "";
  }

  function field(row, canonical, fallback){
    try{if(window.BLCampos && typeof window.BLCampos.getValue === "function"){return window.BLCampos.getValue(row || {}, canonical, fallback || "");}}catch(error){}
    return pick(row, [canonical], fallback || "");
  }

  function estadoCelda(value){
    var k = norm(value);
    if(!k){return "no_cumple";}
    if(["cumple","si","s","ok","aprobado","aprobada","1","true","x","validado","completo"].indexOf(k) >= 0){return "cumple";}
    if(k.indexOf("no cumple") >= 0 || ["no","n","reprobado","reprobada","0","false","falta","incompleto","pendiente","sin dato"].indexOf(k) >= 0){return "no_cumple";}
    return "no_cumple";
  }

  function numberValue(value){var raw = text(value).replace(",", ".");if(!raw){return null;}var n = Number(raw);return Number.isFinite(n) ? n : null;}
  function estadoNota(value){var n = numberValue(value);return n != null && n >= 7 ? "cumple" : "no_cumple";}

  function requirement(row, req){
    var raw = text(field(row, req.field || req.key, pick(row, [req.key], "")));
    return {key:req.key, field:req.field || req.key, label:req.label || req.key, icon:req.icon || "", value:raw || "NO CUMPLE", estado:estadoCelda(raw)};
  }

  function notes(row, noteFields){
    return (noteFields || []).map(function(note){
      var raw = pick(row, note.aliases || [note.key], "");
      var n = numberValue(raw);
      return {key:note.key, label:note.label, value:n == null ? "—" : String(raw), number:n, estado:estadoNota(raw)};
    });
  }

  window.BL2RequisitosRepo = {version:"2.0.0-alpha.1",pick:pick,field:field,estadoCelda:estadoCelda,estadoNota:estadoNota,requirement:requirement,notes:notes};
})(window);
