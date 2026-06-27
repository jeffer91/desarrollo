/* =========================================================
Nombre completo: bl2-requisitos.repo.js
Ruta o ubicación: /Requisitos/BaseLocal2/repositories/bl2-requisitos.repo.js
Función o funciones:
- Centralizar lectura de requisitos y notas desde filas de estudiantes BL2/V1.
- Mantener alias tolerantes para campos de Firestore, Excel y Base Local.
- Calcular Nfin cuando existan Nart y Ndef aunque Notafinal venga vacío.
- Entregar utilidades reutilizables por Ficha y futuros reportes.
Con qué se conecta:
- ../BaseLocal/services/bl-notas-defensa.service.js
- Ficha/ficha.core.js
- BaseLocal2/repositories/bl2-estudiantes.repo.js
========================================================= */
(function(window){
  "use strict";

  var DEFAULT_NOTE_FIELDS = [
    {key:"nart", label:"Nart", aliases:["Notart","notart","Nart","nart","N_ART","N-ART","NotaArt","notaArt","notaArticulo","nota_articulo"]},
    {key:"ndef", label:"Ndef", aliases:["Notdef","notdef","Ndef","ndef","N_DEF","N-DEF","NotaDef","notaDef","notaDefensa","nota_defensa"]},
    {key:"nfin", label:"Nfin", aliases:["Notafinal","notafinal","NotaFinal","notaFinal","Nfin","nfin","N_FIN","N-FIN","Nota final","nota final"]}
  ];

  function text(value){return String(value == null ? "" : value).trim();}
  function norm(value){return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();}
  function notasService(){return window.BLNotasDefensa || null;}

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
    try{
      if(window.BLCampos && typeof window.BLCampos.getValue === "function"){
        return window.BLCampos.getValue(row || {}, canonical, fallback || "");
      }
    }catch(error){}
    return pick(row, [canonical], fallback || "");
  }

  function estadoCelda(value){
    var k = norm(value);
    if(!k){return "no_cumple";}
    if(["cumple","si","s","ok","aprobado","aprobada","1","true","x","validado","completo"].indexOf(k) >= 0){return "cumple";}
    if(k.indexOf("no cumple") >= 0 || ["no","n","reprobado","reprobada","0","false","falta","incompleto","pendiente","sin dato"].indexOf(k) >= 0){return "no_cumple";}
    return "no_cumple";
  }

  function numberValue(value){
    if(notasService() && typeof notasService().normalizarNota === "function"){
      return notasService().normalizarNota(value);
    }
    var raw = text(value).replace(",", ".");
    if(!raw){return null;}
    var n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  function round2(value){
    if(notasService() && typeof notasService().redondear2 === "function"){
      return notasService().redondear2(value);
    }
    return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
  }

  function calcularNfin(nart, ndef){
    if(notasService() && typeof notasService().calcularNfin === "function"){
      return notasService().calcularNfin(nart, ndef);
    }
    var art = numberValue(nart);
    var def = numberValue(ndef);
    if(art === null || def === null || art < 7){return null;}
    return round2((art * 0.70) + (def * 0.30));
  }

  function estadoNota(value){
    var n = numberValue(value);
    return n != null && n >= 7 ? "cumple" : "no_cumple";
  }

  function valueText(value){
    var n = numberValue(value);
    return n == null ? "—" : String(round2(n));
  }

  function requirement(row, req){
    var raw = text(field(row, req.field || req.key, pick(row, [req.key], "")));
    return {key:req.key, field:req.field || req.key, label:req.label || req.key, icon:req.icon || "", value:raw || "NO CUMPLE", estado:estadoCelda(raw)};
  }

  function normalizedNotes(row, noteFields){
    var fields = noteFields && noteFields.length ? noteFields : DEFAULT_NOTE_FIELDS;
    var serviceNotes = notasService() && typeof notasService().extraerNotas === "function" ? notasService().extraerNotas(row || {}) : null;
    var nart = serviceNotes ? serviceNotes.nart : numberValue(pick(row, DEFAULT_NOTE_FIELDS[0].aliases, ""));
    var ndef = serviceNotes ? serviceNotes.ndef : numberValue(pick(row, DEFAULT_NOTE_FIELDS[1].aliases, ""));
    var nfin = serviceNotes ? serviceNotes.nfin : calcularNfin(nart, ndef);

    return fields.map(function(note){
      var key = norm(note.key);
      var raw = pick(row, note.aliases || [note.key], "");
      var number = numberValue(raw);

      if(key === "nart"){
        number = nart;
      }else if(key === "ndef"){
        number = ndef;
      }else if(key === "nfin"){
        number = nfin;
      }

      return {
        key:note.key,
        label:note.label,
        value:number == null ? "—" : String(round2(number)),
        number:number,
        estado:estadoNota(number)
      };
    });
  }

  function notes(row, noteFields){
    return normalizedNotes(row || {}, noteFields || DEFAULT_NOTE_FIELDS);
  }

  window.BL2RequisitosRepo = {
    version:"2.0.0-alpha.2-notas-defensa",
    pick:pick,
    field:field,
    estadoCelda:estadoCelda,
    estadoNota:estadoNota,
    numberValue:numberValue,
    calcularNfin:calcularNfin,
    requirement:requirement,
    notes:notes
  };
})(window);
