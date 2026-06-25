/* =========================================================
Nombre completo: titulacion.app.js
Ruta o ubicación: /Requisitos/Titulacion/frontend/titulacion.app.js
Función o funciones:
- Renderizar el módulo Infor.
- Manejar filtros, guía, texto informativo, tablas y exportación.
Con qué se conecta:
- titulacion.core.js
- titulacion.export.js
========================================================= */
(function(window,document){
  "use strict";
  var state={periodId:"",career:"",vista:"resumen",data:null};
  function el(id){return document.getElementById(id);}function text(v){return String(v==null?"":v).trim();}
  function esc(v){return text(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");}
  function status(msg,cls){var s=el("infor-status");if(s){s.textContent=msg;s.className="infor-status "+(cls||"");}}
  function option(value,label,selected){return '<option value="'+esc(value)+'" '+(selected?'selected':'')+'>'+esc(label)+'</option>';}
  function fillFilters(data){var p=el("infor-periodo"),c=el("infor-carrera");if(p)p.innerHTML=option("","Todos",!state.periodId)+(data.periodList||[]).map(function(x){return option(x.id,x.label||x.id,state.periodId===x.id);}).join("");if(c)c.innerHTML=option("","Todas",!state.career)+(data.careerList||[]).map(function(x){return option(x,x,state.career===x);}).join("");}
  function pill(kind,value){var cls=kind==="ok"?"pill-ok":kind==="bad"?"pill-bad":"pill-warn";return '<span class="pill '+cls+'">'+esc(value)+'</span>';}
  function table(headers,rows){if(!rows||!rows.length)return '<div class="empty">Sin datos.</div>';var html='<table><thead><tr>'+headers.map(function(h){return '<th>'+esc(h.label)+'</th>';}).join('')+'</tr></thead><tbody>';html+=rows.map(function(row){return '<tr>'+headers.map(function(h){var value=typeof h.value==="function"?h.value(row):row[h.key];return '<td>'+value+'</td>';}).join('')+'</tr>';}).join('');return html+'</tbody></table>';}
  function renderGuide(data){el("infor-guide").innerHTML=(data.guide||[]).map(function(g){return '<div class="guide-step"><strong>'+esc(g.title)+'</strong><span>'+esc(g.text)+'</span></div>';}).join('');}
  function renderTables(data){el("infor-carreras").innerHTML=table([{label:"Carrera",key:"key"},{label:"Total",key:"total"},{label:"Listos",value:function(r){return pill("ok",r.listo);}},{label:"Pendientes",value:function(r){return pill("warn",r.pendiente);}},{label:"No habilitados",value:function(r){return pill("bad",r.no_cumple);}},{label:"Avance",value:function(r){return r.avance+"%";}}],data.carreras);el("infor-carreras-meta").textContent=(data.carreras||[]).length+" carreras";el("infor-requisitos").innerHTML=table([{label:"Requisito",key:"label"},{label:"Cumple",value:function(r){return pill("ok",r.cumple);}},{label:"Pendiente",value:function(r){return pill("warn",r.pendiente);}},{label:"No cumple",value:function(r){return pill("bad",r.no_cumple);}},{label:"Atención",key:"atencion"}],data.requisitos);}
  function render(){try{state.data=window.TitulacionCore.build({periodId:state.periodId,career:state.career,vista:state.vista});var d=state.data;fillFilters(d);el("infor-total").textContent=d.kpis.total;el("infor-listos").textContent=d.kpis.listo;el("infor-pendientes").textContent=d.kpis.pendiente;el("infor-no").textContent=d.kpis.no_cumple;el("infor-avance").textContent=d.kpis.avance+"%";el("infor-text").value=d.text;el("infor-generated-at").textContent=new Date(d.generatedAt).toLocaleString();renderGuide(d);renderTables(d);el("infor-diagnostics").textContent=JSON.stringify({generatedAt:d.generatedAt,filters:d.filters,total:d.kpis.total,carreras:d.carreras.length,requisitos:d.requisitos.length},null,2);status("Infor cargado correctamente.","ok");}catch(e){console.error("[Infor]",e);status(e.message||String(e),"warn");}}
  function bind(){el("infor-periodo").addEventListener("change",function(e){state.periodId=e.target.value;render();});el("infor-carrera").addEventListener("change",function(e){state.career=e.target.value;render();});el("infor-vista").addEventListener("change",function(e){state.vista=e.target.value;render();});el("infor-refresh").addEventListener("click",render);el("infor-copy").addEventListener("click",function(){window.TitulacionExport.copyText(state.data&&state.data.text).then(function(){status("Texto copiado.","ok");});});el("infor-export-json").addEventListener("click",function(){window.TitulacionExport.exportJson(state.data);});}
  function boot(){if(window.ExcelLocalBridge)window.ExcelLocalBridge.ensureReady();bind();render();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})(window,document);
