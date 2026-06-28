/* =========================================================
Nombre completo: tabla.app.js
Ruta o ubicación: /Requisitos/Gestion/Tabla/tabla.app.js
Función o funciones:
- Renderizar la tabla principal de estudiantes.
- Mantener filtros rápidos por período, división, matrícula, carrera, estado y búsqueda.
- Mostrar activos por defecto.
- Paginar resultados para no renderizar toda la base.
- Usar BL2 cuando esté disponible y mantener ExcelLocalRepo como respaldo.
- Mostrar acciones compactas por fila: copiar, WhatsApp y Telegram individual.
- Abrir Telegram masivo con los estudiantes filtrados actualmente.
Con qué se conecta:
- tabla.core.js
- tabla.message.js
- tabla.telegram.js
- tabla.selection.js
- tabla.mass.js
- tabla.export.js
========================================================= */
(function(window,document){
  "use strict";
  var state={periodId:"",division:"",matricula:"ACTIVO",career:"",status:"",search:"",rows:[],allRows:[],page:1,pageSize:100,pagination:null,renderTimer:null,selectKey:"",divisionOptions:[],careerOptions:[],actionsBound:false};
  function el(id){return document.getElementById(id);}function text(v){return String(v==null?"":v).trim();}
  function esc(v){return text(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");}
  function status(msg,cls){var s=el("tabla-status");if(s){s.textContent=msg;s.className="tabla-status "+(cls||"");}}
  function option(value,label,selected){return '<option value="'+esc(value)+'" '+(selected?'selected':'')+'>'+esc(label)+'</option>';}
  function debounceRender(){if(state.renderTimer)clearTimeout(state.renderTimer);state.renderTimer=setTimeout(function(){state.renderTimer=null;state.page=1;render();},260);}
  function sourceLabel(){return window.TablaCore&&typeof window.TablaCore.source==="function"?window.TablaCore.source():"Base Local";}

  function fillSelects(){
    var p=el("tabla-periodo"), d=el("tabla-division"), c=el("tabla-carrera"), m=el("tabla-matricula"), ps=el("tabla-page-size");
    var periods=window.TablaCore.periods();
    if(p){p.innerHTML=option("","Todos",!state.periodId)+periods.map(function(x){return option(x.id,x.label||x.periodoLabel||x.id,state.periodId===x.id);}).join("");}
    if(m){m.value=state.matricula;}
    if(ps){ps.value=String(state.pageSize);}
    var key=[state.periodId,state.matricula,sourceLabel()].join("|");
    if(state.selectKey!==key){
      state.divisionOptions=window.TablaCore.divisions(null,{periodId:state.periodId,matricula:state.matricula});
      var baseRows=window.TablaCore.filter({periodId:state.periodId,matricula:state.matricula,division:"",search:"",status:""});
      state.careerOptions=window.TablaCore.careers(baseRows);
      state.selectKey=key;
    }
    if(d){d.innerHTML=option("","Todas",!state.division)+state.divisionOptions.map(function(x){return option(x,x,state.division===x);}).join("");if(state.division&&!state.divisionOptions.some(function(x){return x===state.division;})){state.division="";d.value="";}else{d.value=state.division;}}
    if(c){c.innerHTML=option("","Todas",!state.career)+state.careerOptions.map(function(x){return option(x,x,state.career===x);}).join("");if(state.career&&!state.careerOptions.some(function(x){return x===state.career;})){state.career="";c.value="";}else{c.value=state.career;}}
  }

  function pill(row){var e=row._estadoGeneral||{id:"pendiente",label:"Pendiente"};var cls=e.id==="cumple"?"pill-ok":e.id==="no_cumple"?"pill-bad":"pill-warn";return '<span class="pill '+cls+'">'+esc(e.label)+'</span>';}
  function matriculaPill(row){var e=row._estadoMatricula||"ACTIVO";var cls=e==="RETIRADO"?"pill-bad":"pill-ok";return '<span class="pill '+cls+'">'+esc(e)+'</span>';}
  function actions(row,index){
    var w=window.TablaCore.whatsappUrl(row);
    var tg=window.TablaCore.telegramInfo?window.TablaCore.telegramInfo(row):{hasTelegram:false,canSendByBot:false};
    var tgTitle=tg.canSendByBot?"Telegram listo para envío por bot":(tg.hasTelegram?"Abrir Telegram y copiar mensaje":"Sin Telegram: preparar mensaje");
    var btnCopy='<button class="icon-btn" data-copy="'+esc(row._cedula)+'" type="button" title="Copiar cédula" aria-label="Copiar cédula">📋</button>';
    var btnWhats=w?'<a class="icon-btn action-whats" href="'+esc(w)+'" target="_blank" rel="noopener" title="WhatsApp" aria-label="WhatsApp">🟢</a>':'<button class="icon-btn" type="button" disabled title="Sin celular" aria-label="Sin celular">🟢</button>';
    var btnTelegram='<button class="icon-btn action-telegram '+(tg.hasTelegram?'':'is-muted')+'" data-telegram-index="'+esc(index)+'" type="button" title="'+esc(tgTitle)+'" aria-label="Telegram">✈️</button>';
    return '<div class="cell-actions">'+btnCopy+btnWhats+btnTelegram+'</div>';
  }
  function bindActionsOnce(){
    var wrap=el("tabla-table-wrap");if(!wrap||state.actionsBound)return;
    wrap.addEventListener("click",function(event){
      var copyBtn=event.target.closest?event.target.closest("[data-copy]"):null;
      if(copyBtn){var value=copyBtn.getAttribute("data-copy")||"";if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(value);status("Cédula copiada: "+value,"ok");return;}
      var tgBtn=event.target.closest?event.target.closest("[data-telegram-index]"):null;
      if(tgBtn){var index=Number(tgBtn.getAttribute("data-telegram-index"));var row=state.rows[index];if(row&&window.TablaTelegram&&typeof window.TablaTelegram.abrir==="function"){window.TablaTelegram.abrir(row);}else{status("No se pudo abrir Telegram para este estudiante.","warn");}return;}
    });
    state.actionsBound=true;
  }
  function renderTable(rows){var wrap=el("tabla-table-wrap");if(!wrap)return;bindActionsOnce();if(!rows.length){wrap.innerHTML='<div class="empty">Sin datos. Primero carga un Excel en Carga o cambia los filtros.</div>';return;}var html='<table><thead><tr><th>Cédula</th><th>Nombre</th><th>Carrera</th><th>División</th><th>Período</th><th>Matrícula</th><th>Estado</th><th>Correo</th><th>Celular</th><th>Acciones</th></tr></thead><tbody>';html+=rows.map(function(r,index){return '<tr><td class="nowrap">'+esc(r._cedula)+'</td><td>'+esc(r._nombres)+'</td><td>'+esc(r._carrera)+'</td><td>'+esc(r._division||'Sin división')+'</td><td>'+esc(r._periodo||r.periodoLabel||r.periodoId)+'</td><td>'+matriculaPill(r)+'</td><td>'+pill(r)+'</td><td>'+esc(r._correo)+'</td><td class="nowrap">'+esc(r._celular)+'</td><td>'+actions(r,index)+'</td></tr>';}).join('');html+='</tbody></table>';wrap.innerHTML=html;}
  function updatePagination(p){
    state.pagination=p||{page:1,pages:1,total:0,label:"0 registros",hasPrev:false,hasNext:false};
    if(el("tabla-count-text"))el("tabla-count-text").textContent=state.pagination.total+" registro(s) filtrados";
    if(el("tabla-page-text"))el("tabla-page-text").textContent="Página "+state.pagination.page+" de "+state.pagination.pages;
    if(el("tabla-page-label"))el("tabla-page-label").textContent=state.pagination.label;
    [["tabla-page-first",!state.pagination.hasPrev],["tabla-page-prev",!state.pagination.hasPrev],["tabla-page-next",!state.pagination.hasNext],["tabla-page-last",!state.pagination.hasNext]].forEach(function(pair){var btn=el(pair[0]);if(btn)btn.disabled=!!pair[1];});
  }
  function render(){
    try{
      fillSelects();
      var result=window.TablaCore.page({periodId:state.periodId,division:state.division,matricula:state.matricula,career:state.career,status:state.status,search:state.search,page:state.page,pageSize:state.pageSize});
      state.rows=result.rows||[];state.allRows=result.allRows||[];
      var sum=result.summary||window.TablaCore.summary(state.allRows);
      el("tabla-kpi-total").textContent=sum.total;el("tabla-kpi-ok").textContent=sum.cumple||0;el("tabla-kpi-pend").textContent=sum.pendiente||0;el("tabla-kpi-no").textContent=sum.no_cumple||0;el("tabla-kpi-carreras").textContent=sum.carreras||0;
      updatePagination(result.pagination);renderTable(state.rows);
      status("Tabla cargada por "+(result.source||sourceLabel())+". Página "+state.pagination.page+" de "+state.pagination.pages+". Matrícula: "+(state.matricula||"Todos")+".","ok");
    }catch(e){console.error("[Tabla]",e);status(e.message||String(e),"warn");}
  }
  function resetOptions(){state.division="";state.career="";state.page=1;state.selectKey="";}
  function massFilters(){return {periodId:state.periodId,division:state.division,matricula:state.matricula,career:state.career,status:state.status,search:state.search,total:state.allRows.length};}
  function openMass(){
    var rows=state.allRows.length?state.allRows:state.rows;
    if(!rows.length){status("No hay estudiantes filtrados para Telegram masivo.","warn");return;}
    if(window.TablaMass&&typeof window.TablaMass.abrir==="function")window.TablaMass.abrir(rows,massFilters());
    else status("Módulo de Telegram masivo no disponible.","warn");
  }
  function bind(){
    el("tabla-periodo").addEventListener("change",function(e){state.periodId=e.target.value;resetOptions();render();});
    el("tabla-division").addEventListener("change",function(e){state.division=e.target.value;state.career="";state.page=1;render();});
    el("tabla-matricula").addEventListener("change",function(e){state.matricula=e.target.value;resetOptions();render();});
    el("tabla-carrera").addEventListener("change",function(e){state.career=e.target.value;state.page=1;render();});
    el("tabla-estado").addEventListener("change",function(e){state.status=e.target.value;state.page=1;render();});
    el("tabla-search").addEventListener("input",function(e){state.search=e.target.value;debounceRender();});
    el("tabla-page-size").addEventListener("change",function(e){state.pageSize=Number(e.target.value)||100;state.page=1;render();});
    el("tabla-refresh").addEventListener("click",function(){state.selectKey="";render();});
    el("tabla-page-first").addEventListener("click",function(){state.page=1;render();});
    el("tabla-page-prev").addEventListener("click",function(){state.page=Math.max(1,state.page-1);render();});
    el("tabla-page-next").addEventListener("click",function(){state.page=Math.min(state.pagination?state.pagination.pages:state.page+1,state.page+1);render();});
    el("tabla-page-last").addEventListener("click",function(){state.page=state.pagination?state.pagination.pages:state.page;render();});
    el("tabla-telegram-masivo").addEventListener("click",openMass);
    el("tabla-export-csv").addEventListener("click",function(){window.TablaExport.exportCsv(state.allRows.length?state.allRows:state.rows);});
    el("tabla-export-json").addEventListener("click",function(){window.TablaExport.exportJson(state.allRows.length?state.allRows:state.rows);});
  }
  function boot(){if(window.ExcelLocalBridge)window.ExcelLocalBridge.ensureReady();bind();render();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
  window.TablaApp={render:render,openMass:openMass,getState:function(){return Object.assign({},state);}};
})(window,document);
