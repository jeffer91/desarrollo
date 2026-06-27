/* =========================================================
Nombre completo: stats.notes.js
Ruta o ubicación: /Requisitos/Stats/stats.notes.js
Función o funciones:
- Renderizar análisis avanzado de notas en Stats.
- Mostrar tarjetas, ranking, distribución, promedio por carrera, faltantes por carrera y estudiantes con notas incompletas.
- Usar StatsNotesAnalysis cuando esté disponible.
Con qué se conecta:
- stats.html
- stats.css
- stats.notes.analysis.js
- stats.core.js
- stats.app.js
- stats.tables.js
========================================================= */
(function(window,document){
  "use strict";

  function text(value){return String(value==null?"":value).trim();}
  function el(id){return document.getElementById(id);}
  function esc(value){return text(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");}
  function fmt(value){return value===null||value===undefined||value===""?"—":esc(value);}
  function pct(value){return value===null||value===undefined?"—":esc(value)+"%";}

  function card(label,value,sub,type){
    return '<article class="stats-note-card '+esc(type||"")+'"><span>'+esc(label)+'</span><strong>'+fmt(value)+'</strong>'+(sub?'<small>'+esc(sub)+'</small>':'')+'</article>';
  }

  function section(title,subtitle,body,extraClass){
    return '<article class="stats-note-block '+esc(extraClass||"")+'"><div class="stats-note-block-head"><h3>'+esc(title)+'</h3>'+(subtitle?'<span>'+esc(subtitle)+'</span>':'')+'</div>'+body+'</article>';
  }

  function rankingCard(label,item,value,sub,type){
    return '<article class="stats-note-ranking-card '+esc(type||"")+'"><span>'+esc(label)+'</span><strong>'+esc(item&&item.carrera?item.carrera:'—')+'</strong><small>'+esc(value==null?'—':value)+(sub?" · "+esc(sub):"")+'</small></article>';
  }

  function buildFallback(data){
    var rows=(data&&data.estudiantes)||[];
    if(window.StatsNotesAnalysis&&typeof window.StatsNotesAnalysis.build==="function")return window.StatsNotesAnalysis.build(rows);
    var n=(data&&data.notasResumen)||{};
    return {resumen:{total:n.total||0,conNota:n.conNota||0,sinNota:n.sinNota||0,promedio:n.promedio,minima:n.minima,maxima:n.maxima,conNart:n.conNart||0,conNdef:n.conNdef||0,completas:n.conNota||0,incompletas:n.sinNota||0,coberturaNfin:0},carreras:[],ranking:{},distribucion:{r9_10:0,r8_899:0,r7_799:0,menor7:0,sinNota:n.sinNota||0},estudiantesIncompletos:[]};
  }

  function renderSummary(analysis){
    var n=analysis.resumen||{};
    return '<section class="stats-notes-grid stats-notes-grid-extended">'
      + card("Total",n.total||0,"estudiantes evaluados","")
      + card("Con N-ART",n.conNart||0,"nota de artículo","")
      + card("Con N-DEF",n.conNdef||0,"nota de defensa","")
      + card("Con N-FIN",n.conNota||0,"nota final","ok")
      + card("Sin N-FIN",n.sinNota||0,"pendientes","bad")
      + card("Completas",n.completas||0,"N-ART + N-DEF + N-FIN","ok")
      + card("Incompletas",n.incompletas||0,"requieren revisión","bad")
      + card("Cobertura",pct(n.coberturaNfin),"con nota final","")
      + card("Promedio N-ART",n.promedioNart,"artículo","")
      + card("Promedio N-DEF",n.promedioNdef,"defensa","")
      + card("Promedio N-FIN",n.promedio,"final","")
      + card("Mín / Máx",(fmt(n.minima)+" / "+fmt(n.maxima)),"nota final","")
      + '</section>';
  }

  function renderRanking(analysis){
    var r=analysis.ranking||{};
    return '<section class="stats-note-ranking">'
      + rankingCard("Mejor promedio",r.bestAvg,r.bestAvg?"Prom. "+r.bestAvg.promedioNfin:"—",r.bestAvg?"cobertura "+r.bestAvg.coberturaNfin+"%":"","ok")
      + rankingCard("Menor promedio",r.worstAvg,r.worstAvg?"Prom. "+r.worstAvg.promedioNfin:"—",r.worstAvg?"cobertura "+r.worstAvg.coberturaNfin+"%":"","bad")
      + rankingCard("Más sin nota",r.missingMost,r.missingMost?r.missingMost.sinNfin+" sin N-FIN":"—",r.missingMost?r.missingMost.total+" total":"","bad")
      + rankingCard("Mayor cobertura",r.coverageBest,r.coverageBest?r.coverageBest.coberturaNfin+"%":"—",r.coverageBest?r.coverageBest.conNfin+" con nota":"","ok")
      + '</section>';
  }

  function renderDistribution(analysis){
    var d=analysis.distribucion||{};
    var rows=[
      ["9.00 - 10.00",d.r9_10||0,"ok"],
      ["8.00 - 8.99",d.r8_899||0,"ok"],
      ["7.00 - 7.99",d.r7_799||0,"warn"],
      ["Menor a 7.00",d.menor7||0,"bad"],
      ["Sin nota",d.sinNota||0,"na"]
    ];
    var total=rows.reduce(function(a,b){return a+Number(b[1]||0);},0);
    var body='<div class="stats-note-distribution">'+rows.map(function(row){
      var percent=total?Math.round((row[1]*10000)/total)/100:0;
      return '<div class="stats-note-dist-row '+esc(row[2])+'"><strong>'+esc(row[0])+'</strong><div class="stats-note-dist-track"><i style="width:'+percent+'%"></i></div><span>'+esc(row[1])+' · '+esc(percent)+'%</span></div>';
    }).join("")+'</div>';
    return section("Distribución de notas finales","Rangos de N-FIN",body,"distribution");
  }

  function renderCareerAverageTable(analysis){
    var rows=analysis.carreras||[];
    if(!rows.length)return section("Promedio por carrera","Sin datos suficientes",'<div class="empty">Sin carreras para mostrar.</div>');
    var html='<div class="stats-table-wrap stats-notes-table"><table class="stats-sortable-table" data-sortable="true"><thead><tr>'
      + '<th data-sort-type="text">Carrera</th><th data-sort-type="number">Total</th><th data-sort-type="number">Con N-FIN</th><th data-sort-type="number">Sin N-FIN</th><th data-sort-type="percent">Cobertura</th><th data-sort-type="number">Prom. N-ART</th><th data-sort-type="number">Prom. N-DEF</th><th data-sort-type="number">Prom. N-FIN</th><th data-sort-type="number">Mín</th><th data-sort-type="number">Máx</th>'
      + '</tr></thead><tbody>';
    html+=rows.map(function(r){return '<tr>'
      + '<td data-sort="'+esc(r.carrera)+'"><strong>'+esc(r.carrera)+'</strong></td>'
      + '<td data-sort="'+esc(r.total)+'">'+esc(r.total)+'</td>'
      + '<td data-sort="'+esc(r.conNfin)+'"><span class="pill pill-ok">'+esc(r.conNfin)+'</span></td>'
      + '<td data-sort="'+esc(r.sinNfin)+'"><span class="pill pill-bad">'+esc(r.sinNfin)+'</span></td>'
      + '<td data-sort="'+esc(r.coberturaNfin)+'">'+esc(r.coberturaNfin)+'%</td>'
      + '<td data-sort="'+esc(r.promedioNart||0)+'">'+fmt(r.promedioNart)+'</td>'
      + '<td data-sort="'+esc(r.promedioNdef||0)+'">'+fmt(r.promedioNdef)+'</td>'
      + '<td data-sort="'+esc(r.promedioNfin||0)+'"><strong>'+fmt(r.promedioNfin)+'</strong></td>'
      + '<td data-sort="'+esc(r.minimaNfin||0)+'">'+fmt(r.minimaNfin)+'</td>'
      + '<td data-sort="'+esc(r.maximaNfin||0)+'">'+fmt(r.maximaNfin)+'</td>'
      + '</tr>';}).join("");
    html+='</tbody></table></div>';
    return section("Promedio por carrera","Ordenable por cualquier columna",html,"wide");
  }

  function renderCareerMissingTable(analysis){
    var rows=analysis.carreras||[];
    if(!rows.length)return "";
    var html='<div class="stats-table-wrap stats-notes-table"><table class="stats-sortable-table" data-sortable="true"><thead><tr>'
      + '<th data-sort-type="text">Carrera</th><th data-sort-type="number">Sin N-ART</th><th data-sort-type="number">Sin N-DEF</th><th data-sort-type="number">Sin N-FIN</th><th data-sort-type="number">Incompletas</th><th data-sort-type="number">Completas</th>'
      + '</tr></thead><tbody>';
    html+=rows.map(function(r){return '<tr>'
      + '<td data-sort="'+esc(r.carrera)+'"><strong>'+esc(r.carrera)+'</strong></td>'
      + '<td data-sort="'+esc(r.sinNart)+'"><span class="pill pill-bad">'+esc(r.sinNart)+'</span></td>'
      + '<td data-sort="'+esc(r.sinNdef)+'"><span class="pill pill-bad">'+esc(r.sinNdef)+'</span></td>'
      + '<td data-sort="'+esc(r.sinNfin)+'"><span class="pill pill-bad">'+esc(r.sinNfin)+'</span></td>'
      + '<td data-sort="'+esc(r.incompletas)+'"><span class="pill pill-bad">'+esc(r.incompletas)+'</span></td>'
      + '<td data-sort="'+esc(r.completas)+'"><span class="pill pill-ok">'+esc(r.completas)+'</span></td>'
      + '</tr>';}).join("");
    html+='</tbody></table></div>';
    return section("Faltantes por carrera","Dónde falta registrar o calcular notas",html,"wide");
  }

  function renderMissingStudents(analysis){
    var rows=(analysis.estudiantesIncompletos||[]).slice(0,150);
    if(!rows.length)return section("Estudiantes con notas incompletas","Todo completo",'<div class="empty">No hay estudiantes con notas incompletas.</div>',"wide");
    var html='<div class="stats-table-wrap stats-notes-table"><table class="stats-sortable-table" data-sortable="true"><thead><tr>'
      + '<th data-sort-type="text">Nombre</th><th data-sort-type="text">Cédula</th><th data-sort-type="text">Carrera</th><th data-sort-type="number">N-ART</th><th data-sort-type="number">N-DEF</th><th data-sort-type="number">N-FIN</th><th data-sort-type="text">Estado nota</th>'
      + '</tr></thead><tbody>';
    html+=rows.map(function(r){return '<tr>'
      + '<td data-sort="'+esc(r.nombre)+'"><strong>'+esc(r.nombre)+'</strong></td>'
      + '<td data-sort="'+esc(r.cedula)+'">'+esc(r.cedula)+'</td>'
      + '<td data-sort="'+esc(r.carrera)+'">'+esc(r.carrera)+'</td>'
      + '<td data-sort="'+esc(r.nart||0)+'">'+fmt(r.nart)+'</td>'
      + '<td data-sort="'+esc(r.ndef||0)+'">'+fmt(r.ndef)+'</td>'
      + '<td data-sort="'+esc(r.nfin||0)+'">'+fmt(r.nfin)+'</td>'
      + '<td data-sort="'+esc(r.estado)+'"><span class="note-state-bad">'+esc(r.estado)+'</span></td>'
      + '</tr>';}).join("");
    html+='</tbody></table></div>';
    return section("Estudiantes con notas incompletas",rows.length+" registros mostrados",html,"wide");
  }

  function render(data,targetId){
    var target=el(targetId||"stats-notes");
    if(!target)return;
    var analysis=buildFallback(data||{});
    target.innerHTML=renderSummary(analysis)
      + renderRanking(analysis)
      + '<section class="stats-notes-analysis-grid">'
      + renderDistribution(analysis)
      + renderCareerAverageTable(analysis)
      + renderCareerMissingTable(analysis)
      + renderMissingStudents(analysis)
      + '</section>';
    if(window.StatsTables&&typeof window.StatsTables.bindAll==="function")window.StatsTables.bindAll(target);
  }

  window.StatsNotes={render:render};
})(window,document);
