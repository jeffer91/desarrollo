/* =========================================================
Nombre completo: tabla.app.js
Ruta o ubicación: /Requisitos/Gestion/Tabla/tabla.app.js
Función o funciones:
- Renderizar la tabla principal de estudiantes.
- Mantener filtros rápidos por período, división, matrícula, carrera, estado y búsqueda.
- Mostrar activos por defecto.
Con qué se conecta:
- tabla.core.js
- tabla.export.js
========================================================= */
(function(window,document){
  "use strict";
  var state={periodId:"",division:"",matricula:"ACTIVO",career:"",status:"",search:"",rows:[]};
  function el(id){return document.getElementById(id);}function text(v){return String(v==null?"":v).trim();}
  function esc(v){return text(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");}
  function status(msg,cls){var s=el("tabla-status");if(s){s.textContent=msg;s.className="tabla-status "+(cls||"");}}
  function option(value,label,selected){return '<option value="'+esc(value)+'" '+(selected?'selected':'')+'>'+esc(label)+'</option>';}
  function fillSelects(){
    var p=el("tabla-periodo"), d=el("tabla-division"), c=el("tabla-carrera"), m=el("tabla-matricula");
    var periods=window.TablaCore.periods();
    if(p){p.innerHTML=option("","Todos",!state.periodId)+periods.map(function(x){return option(x.id,x.label||x.id,state.periodId===x.id);}).join("");}
    if(m){m.value=state.matricula;}
    var baseForDivision=window.TablaCore.filter({periodId:state.periodId,matricula:state.matricula,division:"",search:"",status:""});
    var divisionList=window.TablaCore.divisions(baseForDivision);
    if(d){d.innerHTML=option("","Todas",!state.division)+divisionList.map(function(x){return option(x,x,state.division===x);}).join("");if(state.division&&!divisionList.some(function(x){return x===state.division;})){state.division="";d.value="";}else{d.value=state.division;}}
    var baseRows=window.TablaCore.filter({periodId:state.periodId,matricula:state.matricula,division:state.division,search:"",status:""});
    var careers=window.TablaCore.careers(baseRows);
    if(c){c.innerHTML=option("","Todas",!state.career)+careers.map(function(x){return option(x,x,state.career===x);}).join("");if(state.career&&!careers.some(function(x){return x===state.career;})){state.career="";c.value="";}else{c.value=state.career;}}
  }
  function pill(row){var e=row._estadoGeneral||{id:"pendiente",label:"Pendiente"};var cls=e.id==="cumple"?"pill-ok":e.id==="no_cumple"?"pill-bad":"pill-warn";return '<span class="pill '+cls+'">'+esc(e.label)+'</span>';}
  function matriculaPill(row){var e=row._estadoMatricula||"ACTIVO";var cls=e==="RETIRADO"?"pill-bad":"pill-ok";return '<span class="pill '+cls+'">'+esc(e)+'</span>';}
  function actions(row){var w=window.TablaCore.whatsappUrl(row);var btnCopy='<button class="mini" data-copy="'+esc(row._cedula)+'" type="button">Copiar</button>';var btnWhats=w?'<a class="mini" href="'+esc(w)+'" target="_blank" rel="noopener"><button class="mini" type="button">WhatsApp</button></a>':'<button class="mini" type="button" disabled>Sin celular</button>';return '<div class="cell-actions">'+btnCopy+btnWhats+'</div>';}
  function renderTable(rows){var wrap=el("tabla-table-wrap");if(!wrap)return;if(!rows.length){wrap.innerHTML='<div class="empty">Sin datos. Primero carga un Excel en Carga o cambia los filtros.</div>';return;}var shown=rows.slice(0,500);var html='<table><thead><tr><th>Cédula</th><th>Nombre</th><th>Carrera</th><th>División</th><th>Período</th><th>Matrícula</th><th>Estado</th><th>Correo</th><th>Celular</th><th>Acciones</th></tr></thead><tbody>';html+=shown.map(function(r){return '<tr><td class="nowrap">'+esc(r._cedula)+'</td><td>'+esc(r._nombres)+'</td><td>'+esc(r._carrera)+'</td><td>'+esc(r._division||'Sin división')+'</td><td>'+esc(r.periodoLabel||r.periodoId)+'</td><td>'+matriculaPill(r)+'</td><td>'+pill(r)+'</td><td>'+esc(r._correo)+'</td><td class="nowrap">'+esc(r._celular)+'</td><td>'+actions(r)+'</td></tr>';}).join('');html+='</tbody></table>';wrap.innerHTML=html;wrap.querySelectorAll('[data-copy]').forEach(function(b){b.addEventListener('click',function(){var value=b.getAttribute('data-copy')||'';if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(value);status('Cédula copiada: '+value,'ok');});});}
  function render(){try{fillSelects();state.rows=window.TablaCore.filter(state);var sum=window.TablaCore.summary(state.rows);el("tabla-kpi-total").textContent=sum.total;el("tabla-kpi-ok").textContent=sum.cumple||0;el("tabla-kpi-pend").textContent=sum.pendiente||0;el("tabla-kpi-no").textContent=sum.no_cumple||0;el("tabla-kpi-carreras").textContent=sum.carreras||0;el("tabla-count-text").textContent=sum.total+" registro(s)";renderTable(state.rows);status("Tabla cargada correctamente. Matrícula: "+(state.matricula||"Todos")+". División: "+(state.division||"Todas")+".","ok");}catch(e){console.error("[Tabla]",e);status(e.message||String(e),"warn");}}
  function bind(){el("tabla-periodo").addEventListener("change",function(e){state.periodId=e.target.value;state.division="";state.career="";render();});el("tabla-division").addEventListener("change",function(e){state.division=e.target.value;state.career="";render();});el("tabla-matricula").addEventListener("change",function(e){state.matricula=e.target.value;state.division="";state.career="";render();});el("tabla-carrera").addEventListener("change",function(e){state.career=e.target.value;render();});el("tabla-estado").addEventListener("change",function(e){state.status=e.target.value;render();});el("tabla-search").addEventListener("input",function(e){state.search=e.target.value;render();});el("tabla-refresh").addEventListener("click",render);el("tabla-export-csv").addEventListener("click",function(){window.TablaExport.exportCsv(state.rows);});el("tabla-export-json").addEventListener("click",function(){window.TablaExport.exportJson(state.rows);});}
  function boot(){if(window.ExcelLocalBridge)window.ExcelLocalBridge.ensureReady();bind();render();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})(window,document);
