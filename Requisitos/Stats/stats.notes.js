/* =========================================================
Nombre completo: stats.notes.js
Ruta o ubicación: /Requisitos/Stats/stats.notes.js
Función o funciones:
- Renderizar resumen estadístico de notas en Stats.
- Mostrar total, con nota, sin nota, promedio, nota mínima y nota máxima.
- Usar los datos calculados por stats.core.js a partir de BLNotasDefensa.
Con qué se conecta:
- stats.html
- stats.css
- stats.core.js
- stats.app.js
========================================================= */
(function(window,document){
  "use strict";

  function text(value){return String(value==null?"":value).trim();}
  function el(id){return document.getElementById(id);}
  function esc(value){return text(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");}
  function fmt(value){return value===null||value===undefined||value===""?"—":esc(value);}

  function card(label,value,sub,type){
    return '<article class="stats-note-card '+esc(type||"")+'">'
      + '<span>'+esc(label)+'</span>'
      + '<strong>'+fmt(value)+'</strong>'
      + (sub?'<small>'+esc(sub)+'</small>':'')
      + '</article>';
  }

  function render(data,targetId){
    var target=el(targetId||"stats-notes");
    if(!target)return;
    var n=(data&&data.notasResumen)||{};
    var total=n.total||0;
    target.innerHTML='<section class="stats-notes-grid">'
      + card("Total",total,"estudiantes evaluados","")
      + card("Con nota",n.conNota||0,"con nota final","ok")
      + card("Sin nota",n.sinNota||0,"pendientes de registro","bad")
      + card("Promedio",n.promedio,"nota final","")
      + card("Mínima",n.minima,"nota final","")
      + card("Máxima",n.maxima,"nota final","")
      + '</section>';
  }

  window.StatsNotes={render:render};
})(window,document);
