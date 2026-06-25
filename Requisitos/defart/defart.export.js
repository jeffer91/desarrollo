/* =========================================================
Nombre completo: defart.export.js
Ruta o ubicación: /Requisitos/defart/defart.export.js
Función o funciones:
- Exportar agenda de defensas en CSV, JSON e ICS.
- Copiar mensajes al portapapeles.
Con qué se conecta:
- defart.app.js
========================================================= */
(function(window){
  "use strict";
  function text(v){return String(v==null?"":v).trim();}
  function download(name,content,type){var blob=new Blob([content],{type:type||"text/plain;charset=utf-8"});var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(a.href);},1000);}
  function wrap(v){return '"'+text(v).replace(/"/g,'""')+'"';}
  function csv(rows){var headers=["cedula","nombres","carrera","fecha","hora","sede","modo","aula","tribunal1","tribunal2","programada"];var lines=[headers.join(",")];(rows||[]).forEach(function(r){lines.push([r._cedula,r._nombres,r._carrera,r._fecha,r._hora,r._sede,r._modo,r._aula,r._tribunal1,r._tribunal2,r._programada?"SI":"NO"].map(wrap).join(","));});return lines.join("\n");}
  function exportCsv(rows){download("agenda-defensas.csv",csv(rows||[]),"text/csv;charset=utf-8");}
  function exportJson(data){download("agenda-defensas.json",JSON.stringify(data||{},null,2),"application/json;charset=utf-8");}
  function dateToIcs(date,time){var d=text(date).replace(/[^0-9]/g,"");if(d.length!==8)return "";var t=text(time).replace(/[^0-9]/g,"");if(t.length<4)t="0800";return d+"T"+t.slice(0,4)+"00";}
  function ics(rows){var out=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Requisitos//Defensas//ES"];(rows||[]).filter(function(r){return r._fecha;}).forEach(function(r,i){var dt=dateToIcs(r._fecha,r._hora);if(!dt)return;out.push("BEGIN:VEVENT","UID:defensa-"+(r._cedula||i)+"@requisitos","DTSTAMP:"+new Date().toISOString().replace(/[-:]/g,"").split(".")[0]+"Z","DTSTART:"+dt,"SUMMARY:Defensa - "+(r._nombres||"Estudiante"),"LOCATION:"+[r._sede,r._aula].filter(Boolean).join(" "),"DESCRIPTION:"+["Carrera: "+r._carrera,"Tribunal: "+[r._tribunal1,r._tribunal2].filter(Boolean).join(" / ")].join("\\n"),"END:VEVENT");});out.push("END:VCALENDAR");return out.join("\r\n");}
  function exportIcs(rows){download("agenda-defensas.ics",ics(rows||[]),"text/calendar;charset=utf-8");}
  async function copyText(content){if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(text(content));return true;}return false;}
  window.DefartExport={exportCsv:exportCsv,exportJson:exportJson,exportIcs:exportIcs,copyText:copyText,csv:csv,ics:ics};
})(window);
