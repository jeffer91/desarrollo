/* =========================================================
Nombre completo: stats.app.js
Ruta o ubicación: /Requisitos/Stats/stats.app.js
Función o funciones:
- Renderizar estadísticas del módulo Carga.
- Manejar filtros por período, matrícula, carrera, estado, KPIs, barras, tablas y exportación.
- Mostrar activos por defecto.
Con qué se conecta:
- stats.core.js
- stats.export.js
========================================================= */
(function(window,document){
  "use strict";
  var state={periodId:"",matricula:"ACTIVO",career:"",status:"",data:null};
  function el(id){return document.getElementById(id);}function text(v){return String(v==null?"":v).trim();}
  function esc(v){return text(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");}
  function status(msg,cls){var s=el("stats-status");if(s){s.textContent=msg;s.className="stats-status "+(cls||"");}}
  function option(value,label,selected){return '<option value="'+esc(value)+'" '+(selected?'selected':'')+'>'+esc(label)+'</option>';}
  function fillFilters(data){var p=el("stats-periodo");var c=el("stats-carrera");var m=el("stats-matricula");if(p){p.innerHTML=option("","Todos",!state.periodId)+(data.periodList||[]).map(function(x){return option(x.id,x.label||x.id,state.periodId===x.id);}).join("");}if(m){m.value=state.matricula;}if(c){c.innerHTML=option("","Todas",!state.career)+(data.careerList||[]).map(function(x){return option(x,x,state.career===x);}).join("");}}
  function bar(label,value,total){var percent=total?Math.round((value*10000)/total)/100:0;return '<div class="stats-bar-row"><div class="stats-bar-label" title="'+esc(label)+'">'+esc(label)+'</div><div class="stats-bar-track"><div class="stats-bar-fill" style="width:'+Math.max(0,Math.min(100,percent))+'%"></div></div><div class="stats-bar-value">'+value+' / '+percent+'%</div></div>';}
  function renderEstados(data){var box=el("stats-estados");var total=data.total||0;box.innerHTML=[bar("Cumple todo",data.estados.cumple||0,total),bar("Con pendientes",data.estados.pendiente||0,total),bar("No cumple",data.estados.no_cumple||0,total)].join("");el("stats-estados-meta").textContent=total+" estudiantes";}
  function renderRequisitos(data){var box=el("stats-requisitos");if(!data.requisitos.length){box.innerHTML='<div class="empty">Sin datos.</div>';return;}box.innerHTML=data.requisitos.map(function(r){return bar(r.label,r.cumple,r.total);}).join("");}
  function table(rows){if(!rows||!rows.length)return '<div class="empty">Sin datos.</div>';var html='<table><thead><tr><th>Nombre</th><th>Total</th><th>Cumple</th><th>Pendiente</th><th>No cumple</th><th>Avance</th></tr></thead><tbody>';html+=rows.map(function(r){return '<tr><td>'+esc(r.key)+'</td><td>'+r.total+'</td><td><span class="pill pill-ok">'+r.cumple+'</span></td><td><span class="pill pill-warn">'+r.pendiente+'</span></td><td><span class="pill pill-bad">'+r.no_cumple+'</span></td><td>'+r.avance+'%</td></tr>';}).join('');return html+'</tbody></table>';}
  function renderTables(data){el("stats-carreras").innerHTML=table(data.carreras);el("stats-periodos").innerHTML=table(data.periodos);el("stats-carreras-meta").textContent=(data.carreras||[]).length+" carreras";el("stats-periodos-meta").textContent=(data.periodos||[]).length+" períodos";}
  function render(){try{state.data=window.StatsCore.resumen({periodId:state.periodId,matricula:state.matricula,career:state.career,status:state.status});var d=state.data;fillFilters(d);el("stats-total").textContent=d.total;el("stats-ok").textContent=d.estados.cumple||0;el("stats-pend").textContent=d.estados.pendiente||0;el("stats-no").textContent=d.estados.no_cumple||0;el("stats-avance").textContent=d.avanceGeneral+"%";renderEstados(d);renderRequisitos(d);renderTables(d);el("stats-diagnostics").textContent=JSON.stringify(d.diagnostics,null,2);status("Stats cargado correctamente. Matrícula: "+(state.matricula||"Todos")+".","ok");}catch(e){console.error("[Stats]",e);status(e.message||String(e),"warn");}}
  function bind(){el("stats-periodo").addEventListener("change",function(e){state.periodId=e.target.value;render();});el("stats-matricula").addEventListener("change",function(e){state.matricula=e.target.value;state.career="";render();});el("stats-carrera").addEventListener("change",function(e){state.career=e.target.value;render();});el("stats-estado").addEventListener("change",function(e){state.status=e.target.value;render();});el("stats-refresh").addEventListener("click",render);el("stats-export-json").addEventListener("click",function(){window.StatsExport.exportJson(state.data);});el("stats-export-csv").addEventListener("click",function(){window.StatsExport.exportCsv(state.data);});}
  function boot(){if(window.ExcelLocalBridge)window.ExcelLocalBridge.ensureReady();bind();render();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})(window,document);
