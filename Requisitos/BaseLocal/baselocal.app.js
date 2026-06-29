/* =========================================================
Nombre completo: baselocal.app.js
Ruta o ubicación: /Requisitos/BaseLocal/baselocal.app.js
Función:
- Renderizar Base Local con reglas de carga por pestaña.
- Evitar dashboard profundo en Estudiantes.
- Usar paginación real BL2 cuando esté disponible.
- Ejecutar Firebase solo por acción manual y con capa segura.
========================================================= */
(function(window,document){
  "use strict";

  var AUTO_SYNC_KEY = "REQ_BL_AUTO_SYNC_ENABLED_V1";
  var state = {tab:"periodos",periodId:"",divisionFilter:"",search:"",statusFilter:"ACTIVO",loading:false,dailyStarted:false,renderTimer:null,lastRenderError:null,lastView:null,studentPage:1,studentPageSize:100,lastDashboard:null,fastLayerReady:false};

  function el(id){return document.getElementById(id);}
  function text(value){return String(value == null ? "" : value).trim();}
  function esc(value){return text(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;");}
  function autoSyncAllowed(){try{return window.localStorage.getItem(AUTO_SYNC_KEY)==="true";}catch(error){return false;}}
  function scriptUrl(rel){try{return new URL(rel,document.currentScript?document.currentScript.src:window.location.href).href;}catch(error){return rel;}}

  function loadScript(rel, marker){
    return new Promise(function(resolve){
      if(marker && window[marker]){resolve(true);return;}
      var url = scriptUrl(rel);
      var existing = document.querySelector('script[data-bl-load="' + marker + '"]');
      if(existing){existing.addEventListener("load",function(){resolve(true);});existing.addEventListener("error",function(){resolve(false);});return;}
      var s = document.createElement("script");
      s.src = url;
      s.async = false;
      s.dataset.blLoad = marker || rel;
      s.onload = function(){if(marker){window[marker]=window[marker]||true;}resolve(true);};
      s.onerror = function(){console.warn("[BaseLocal] No se pudo cargar", rel);resolve(false);};
      document.head.appendChild(s);
    });
  }

  async function ensureFastLayer(){
    if(state.fastLayerReady){return true;}
    await loadScript("../BaseLocal2/services/bl2-search.service.js","BL2SearchService");
    await loadScript("../BaseLocal2/services/bl2-pagination.service.js","BL2PaginationService");
    await loadScript("../BaseLocal2/repositories/bl2-estudiantes.repo.js","BL2EstudiantesRepo");
    await loadScript("baselocal.performance.patch.js","BaseLocalPerformancePatch");
    if(window.BaseLocalPerformancePatch && typeof window.BaseLocalPerformancePatch.runPatch === "function"){window.BaseLocalPerformancePatch.runPatch();}
    state.fastLayerReady = true;
    return true;
  }

  function getField(row, canonicalName, fallback){try{if(window.BLCampos && typeof window.BLCampos.getValue === "function"){var value = window.BLCampos.getValue(row || {}, canonicalName, fallback || "");return value == null || text(value) === "" ? (fallback || "") : value;}}catch(error){}return fallback || "";}
  function divisionOf(row){if(window.BLDivisionesService && typeof window.BLDivisionesService.studentDivision === "function"){return window.BLDivisionesService.studentDivision(row);}var list=Array.isArray(row&&row.divisiones)?row.divisiones:[];return list[0]||row.division||row._bl2Division||"Sin división";}
  function status(message, className){var box=el("bl-status");if(box){box.textContent=message;box.className="bl-status "+(className||"bl-status-info");}}
  function safeCall(label,fn,fallback){try{return typeof fn==="function"?fn():fallback;}catch(error){console.warn("[BaseLocal "+label+"]",error);state.lastRenderError=error&&error.message?error.message:String(error);return fallback;}}
  function dashboard(deep){return safeCall("BL2DashboardRepo.summary",function(){return window.BL2DashboardRepo&&typeof window.BL2DashboardRepo.summary==="function"?window.BL2DashboardRepo.summary({periodId:state.periodId,deep:!!deep}):null;},null);}
  function invalidateCaches(){if(window.BL2DashboardRepo&&typeof window.BL2DashboardRepo.invalidate==="function"){window.BL2DashboardRepo.invalidate();}if(window.BaseLocalAPI&&typeof window.BaseLocalAPI.clearSnapshotCache==="function"){window.BaseLocalAPI.clearSnapshotCache();}}

  function setBusy(isBusy,message,mode){
    state.loading=!!isBusy;
    [["bl-btn-pull-firebase","pull","Solo bajar Firebase","Bajando..."],["bl-btn-sync-now","sync","Sincronizar ahora","Sincronizando..."],["bl-btn-clean-base","clean","Limpiar base","Limpiando..."],["bl-btn-delete-period","delete","Borrar período","Borrando..."]].forEach(function(item){var btn=el(item[0]);if(btn){btn.disabled=!!isBusy;btn.textContent=isBusy&&mode===item[1]?item[3]:item[2];}});
    if(message){status(message,"bl-status-info");}
  }

  function table(headers,rows){
    if(!rows||!rows.length){return '<p class="bl-help">Sin datos para mostrar en esta vista.</p>';}
    var html='<table><thead><tr>'+headers.map(function(h){return '<th>'+esc(h.label)+'</th>';}).join("")+'</tr></thead><tbody>';
    html+=rows.map(function(row){return '<tr>'+headers.map(function(h){var value=typeof h.value==="function"?h.value(row):row[h.key];return '<td>'+esc(value)+'</td>';}).join("")+'</tr>';}).join("");
    return html+'</tbody></table>';
  }

  function renderPeriods(view){var target=el("bl-periodos-table");if(!target)return;target.innerHTML=table([{label:"Período",key:"label"},{label:"ID",key:"id"},{label:"Actualizado",key:"updatedAt"}],view.periods||[]);}

  function fallbackPageInfo(total){var pages=Math.max(1,Math.ceil((total||0)/state.studentPageSize));state.studentPage=Math.max(1,Math.min(state.studentPage,pages));var offset=(state.studentPage-1)*state.studentPageSize;var from=total?offset+1:0;var to=Math.min(offset+state.studentPageSize,total||0);return {page:state.studentPage,pages:pages,from:from,to:to,total:total||0,offset:offset,hasPrev:state.studentPage>1,hasNext:state.studentPage<pages,label:total?(from+"-"+to+" de "+total):"0 registros"};}
  function renderStudentPagination(info){info=info||fallbackPageInfo(0);var label=el("bl-students-page-label");if(label){label.textContent=(info.label||"0 registros")+" · Página "+info.page+" de "+info.pages;}[["bl-students-first",!info.hasPrev],["bl-students-prev",!info.hasPrev],["bl-students-next",!info.hasNext],["bl-students-last",!info.hasNext]].forEach(function(pair){var btn=el(pair[0]);if(btn){btn.disabled=!!pair[1];}});}

  function renderStudents(view){
    var target=el("bl-estudiantes-table");if(!target)return;
    var rows=Array.isArray(view.students)?view.students:[];
    var info=view.pagination||fallbackPageInfo(rows.length);
    if(!view.pagination){rows=rows.slice(info.offset,info.offset+state.studentPageSize);}
    renderStudentPagination(info);
    target.innerHTML=table([
      {label:"Cédula",value:function(row){return row.cedula||row._bl2Id||getField(row,"cedula","");}},
      {label:"Nombre",value:function(row){return row.nombres||row._bl2Nombre||getField(row,"nombres",row.Nombres||"");}},
      {label:"Carrera",value:function(row){return row.nombrecarrera||row._bl2Carrera||getField(row,"nombreCarrera",row.NombreCarrera||"");}},
      {label:"División",value:function(row){return divisionOf(row);}},
      {label:"Sede",value:function(row){return getField(row,"sede",row.Sede||row.sede||"");}},
      {label:"Estado",value:function(row){return row.estadoMatricula||row._bl2EstadoMatricula||getField(row,"estadoMatricula","ACTIVO");}},
      {label:"Período",value:function(row){return row.periodoLabel||row._bl2Periodo||row.periodoId||row._bl2PeriodoId||getField(row,"periodoId","");}}
    ],rows);
  }

  function renderHistory(view){var target=el("bl-history-table");if(!target)return;var rows=(view.history||[]).slice(0,50);target.innerHTML=table([{label:"Fecha",key:"createdAt"},{label:"Acción",value:function(row){return row.action||"análisis";}},{label:"Período",key:"periodoLabel"},{label:"Origen",key:"fileName"},{label:"Filas",key:"totalRows"}],rows);}
  function renderDiagnostics(view){var box=el("bl-diagnostics-box");if(!box)return;var diagnostics=view.diagnostics||{};var firebaseStatus=safeCall("firebaseStatus",function(){return window.BaseLocalFirebase&&typeof window.BaseLocalFirebase.getLastStatus==="function"?window.BaseLocalFirebase.getLastStatus():{ok:false,mode:"sin_firebase"};},{ok:false,mode:"sin_firebase"});var syncStatus=safeCall("syncStatus",function(){return window.BaseLocalFirebase&&typeof window.BaseLocalFirebase.getSyncStatus==="function"?window.BaseLocalFirebase.getSyncStatus():{ok:false,mode:"sin_sync"};},{ok:false,mode:"sin_sync"});box.textContent=JSON.stringify({dashboard:state.lastDashboard,local:diagnostics,vista:{periodoId:state.periodId,division:state.divisionFilter,estadoMatricula:state.statusFilter,busqueda:state.search,estudiantesPagina:(view.students||[]).length,estudiantesTotal:view.studentsTotal||0,paginacion:view.pagination||null,conteoEstados:view.statusCounts||{}},firebase:firebaseStatus,sync:syncStatus,ultimoErrorVista:state.lastRenderError||"",rendimiento:{tab:state.tab,autoSyncEnabled:autoSyncAllowed(),panelLiviano:true,deepDashboard:state.tab==="diagnostico",fastLayerReady:state.fastLayerReady}},null,2);}

  function renderSelectors(view){
    var selector=el("bl-filter-period");
    if(selector){var current=state.periodId||selector.value;selector.innerHTML='<option value="">Todos los períodos</option>'+(view.periods||[]).map(function(period){return '<option value="'+esc(period.id)+'">'+esc(period.label||period.id)+'</option>';}).join("");selector.value=current;}
    var estado=el("bl-filter-estado");if(estado){estado.value=state.statusFilter;}
    var div=el("bl-filter-division");
    if(div){var divisions=view.divisions||[];var currentDivision=state.divisionFilter;div.innerHTML='<option value="">Todas</option>'+divisions.map(function(name){return '<option value="'+esc(name)+'">'+esc(name)+'</option>';}).join("");if(currentDivision&&divisions.indexOf(currentDivision)<0){state.divisionFilter="";div.value="";}else{div.value=currentDivision;}}
  }

  function emptyView(message){return {periods:[],students:[],studentsTotal:0,pagination:fallbackPageInfo(0),statusCounts:{ACTIVO:0,RETIRADO:0,TOTAL:0},history:[{createdAt:new Date().toISOString(),action:"error",periodoLabel:"Base Local",fileName:message||"Error",totalRows:0}],historyCount:1,diagnostics:{ok:false,error:message||"Base Local no disponible"},careersCount:0,divisions:[],snapshot:null};}
  function viewOptions(){var isStudents=state.tab==="estudiantes";return {division:state.divisionFilter,includeHistory:state.tab==="historial",includeDiagnostics:state.tab==="diagnostico",includeDivisions:isStudents||state.tab==="diagnostico",includeDivisionsSummary:state.tab==="diagnostico",includeSnapshot:false,includeAllStudentsForPeriod:false,includeStatusCounts:isStudents,skipStudents:!isStudents,pageOnly:true,useBL2:true,page:state.studentPage,pageSize:state.studentPageSize};}
  function renderActiveTab(view){if(state.tab==="periodos"){renderPeriods(view);return;}if(state.tab==="estudiantes"){renderStudents(view);return;}if(state.tab==="historial"){renderHistory(view);return;}if(state.tab==="diagnostico"){renderDiagnostics(view);return;}if(state.tab==="manual"){var manual=el("bl-manual-text");if(manual&&window.BaseLocalManual){manual.value=window.BaseLocalManual.getManual();}}}
  function renderKpis(view,dash,firebaseStatus,syncStatus){var counts=view.statusCounts||{ACTIVO:null,RETIRADO:null,TOTAL:null};var dashCounts=dash&&dash.statusCounts?dash.statusCounts:{};var total=view.studentsTotal||counts.TOTAL||(dash&&dash.students)||0;if(el("bl-kpi-periodos"))el("bl-kpi-periodos").textContent=dash&&dash.periods!=null?dash.periods:(view.periods||[]).length;if(el("bl-kpi-estudiantes"))el("bl-kpi-estudiantes").textContent=total||0;if(el("bl-kpi-activos"))el("bl-kpi-activos").textContent=counts.ACTIVO!=null&&counts.ACTIVO!==0?counts.ACTIVO:(dashCounts.ACTIVO==null?"—":dashCounts.ACTIVO);if(el("bl-kpi-retirados"))el("bl-kpi-retirados").textContent=counts.RETIRADO!=null&&counts.RETIRADO!==0?counts.RETIRADO:(dashCounts.RETIRADO==null?"—":dashCounts.RETIRADO);if(el("bl-kpi-historial"))el("bl-kpi-historial").textContent=dash&&dash.history!=null?dash.history:(view.historyCount||(view.history||[]).length);if(el("bl-kpi-carreras"))el("bl-kpi-carreras").textContent=view.careersCount||(dash&&dash.careers!=null?dash.careers:"—");if(el("bl-kpi-estado"))el("bl-kpi-estado").textContent=syncStatus&&syncStatus.ok?"Sincronizada":(firebaseStatus&&firebaseStatus.ok?"Firebase":"Local");}

  function render(){
    try{
      if(!window.BaseLocalAPI||typeof window.BaseLocalAPI.buildView!=="function"){throw new Error("BaseLocalAPI no está disponible. Revisa baselocal.core.js.");}
      if(window.BaseLocalPerformancePatch&&typeof window.BaseLocalPerformancePatch.runPatch==="function"){window.BaseLocalPerformancePatch.runPatch();}
      var deepDash=state.tab==="diagnostico";
      var view=window.BaseLocalAPI.buildView(state.periodId,state.search,state.statusFilter,viewOptions());
      state.lastView=view;
      state.lastDashboard=dashboard(deepDash);
      var firebaseStatus=safeCall("firebaseStatus",function(){return window.BaseLocalFirebase&&typeof window.BaseLocalFirebase.getLastStatus==="function"?window.BaseLocalFirebase.getLastStatus():null;},null);
      var syncStatus=safeCall("syncStatus",function(){return window.BaseLocalFirebase&&typeof window.BaseLocalFirebase.getSyncStatus==="function"?window.BaseLocalFirebase.getSyncStatus():null;},null);
      renderSelectors(view);renderKpis(view,state.lastDashboard,firebaseStatus,syncStatus);renderActiveTab(view);
      if(!state.loading){status("Base Local cargada en modo liviano. Pestaña: "+state.tab+". Registros de página: "+((view.students||[]).length)+".","bl-status-ok");}
    }catch(error){console.error("[BaseLocal Render]",error);state.lastRenderError=error.message||String(error);var fallback=emptyView(state.lastRenderError);renderSelectors(fallback);renderActiveTab(fallback);status("Base Local no se cayó. Error controlado: "+state.lastRenderError,"bl-status-warn");}
  }

  function scheduleRender(){if(state.renderTimer){clearTimeout(state.renderTimer);}state.renderTimer=setTimeout(function(){state.renderTimer=null;render();},180);}
  function setTab(tab){state.tab=tab;if(tab!=="estudiantes"){state.studentPage=1;}document.querySelectorAll(".bl-tabs button").forEach(function(button){button.classList.toggle("is-active",button.dataset.tab===tab);});document.querySelectorAll(".bl-panel").forEach(function(panel){panel.classList.toggle("is-active",panel.id==="bl-tab-"+tab);});scheduleRender();}
  function exportJson(){try{var data=window.BaseLocalAPI.getSnapshot();var blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});var link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download="carga-base-local.json";link.click();setTimeout(function(){URL.revokeObjectURL(link.href);},1000);}catch(error){status("No se pudo exportar Base Local: "+(error.message||error),"bl-status-warn");}}
  function copyRefs(){var content=window.BaseLocalManual?window.BaseLocalManual.getManual():"";if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(content).then(function(){status("Referencias copiadas.","bl-status-ok");}).catch(function(){var manual=el("bl-manual-text");if(manual){manual.focus();manual.select();}status("Copia manualmente desde Manual.","bl-status-warn");});return;}var m=el("bl-manual-text");if(m){m.focus();m.select();}status("Copia manualmente desde Manual.","bl-status-warn");}

  async function pullFromFirebase(){if(state.loading)return;try{await ensureFastLayer();if(!window.BaseLocalFirebase||typeof window.BaseLocalFirebase.pull!=="function"){throw new Error("BaseLocalFirebase no está disponible.");}setBusy(true,"Bajando datos desde Firebase por lotes seguros...","pull");var result=await window.BaseLocalFirebase.pull({safe:true});state.periodId="";state.divisionFilter="";state.search="";state.statusFilter="ACTIVO";state.studentPage=1;if(el("bl-filter-search")){el("bl-filter-search").value="";}if(el("bl-filter-estado")){el("bl-filter-estado").value="ACTIVO";}if(el("bl-filter-division")){el("bl-filter-division").value="";}invalidateCaches();render();status("Datos bajados correctamente. Estudiantes: "+(result.totalStudents||0)+". Períodos: "+(result.totalPeriods||0)+".","bl-status-ok");}catch(error){console.error("[BaseLocal Firebase Pull]",error);status("Base Local sigue activa. Error al bajar Firebase: "+(error.message||String(error)),"bl-status-warn");}finally{setBusy(false);}}
  async function syncNow(mode){if(state.loading)return;try{await ensureFastLayer();if(!window.BaseLocalFirebase||typeof window.BaseLocalFirebase.sync!=="function"){throw new Error("BaseLocalFirebase.sync no está disponible.");}setBusy(true,"Sincronizando en modo seguro por lotes...","sync");var result=await window.BaseLocalFirebase.sync({mode:mode||"manual",lightweight:true});invalidateCaches();render();status(result&&result.message?result.message:"Sincronización segura finalizada.",result&&result.ok?"bl-status-ok":"bl-status-warn");}catch(error){console.error("[BaseLocal Sync]",error);status("Base Local sigue activa. Error de sincronización: "+(error.message||String(error)),"bl-status-warn");}finally{setBusy(false);}}
  async function limpiarBase(){if(state.loading)return;try{if(!window.BaseLocalLimpiar||typeof window.BaseLocalLimpiar.ejecutar!=="function"){throw new Error("BaseLocalLimpiar no está disponible.");}setBusy(true,"Limpiando Firebase y reconstruyendo Base Local...","clean");var result=await window.BaseLocalLimpiar.ejecutar();state.periodId="";state.divisionFilter="";state.search="";state.statusFilter="ACTIVO";state.studentPage=1;invalidateCaches();render();status((result&&result.mensaje)||"Firebase y Base Local reparados.",result&&result.errores&&result.errores.length?"bl-status-warn":"bl-status-ok");}catch(error){console.error("[BaseLocal Limpiar]",error);status("Base Local sigue activa. Error al limpiar base: "+(error.message||String(error)),"bl-status-warn");}finally{setBusy(false);}}

  function parentOwnsDailySync(){try{return !!(window.parent&&window.parent!==window&&window.parent.MAQ_BASELOCAL_BACKGROUND_SYNC);}catch(error){return false;}}
  function runDailySync(){if(parentOwnsDailySync()){state.dailyStarted=true;return;}if(state.dailyStarted)return;state.dailyStarted=true;if(!autoSyncAllowed()){status("Base Local activa. Sincronización automática pausada para mantener la pantalla rápida.","bl-status-ok");return;}setTimeout(async function(){try{if(!window.BaseLocalFirebase||typeof window.BaseLocalFirebase.runDailyIfNeeded!=="function")return;var result=await window.BaseLocalFirebase.runDailyIfNeeded(false,{mode:"daily_from_bl",background:true});if(result&&result.ok){invalidateCaches();render();}}catch(error){console.warn("[BaseLocal Daily Sync]",error);}},3200);}
  function bindGlobalErrors(){window.addEventListener("error",function(event){var msg=event&&event.message?event.message:"Error de pantalla Base Local";console.error("[BaseLocal Global Error]",event.error||event);state.lastRenderError=msg;status("Base Local protegida. Error controlado: "+msg,"bl-status-warn");});window.addEventListener("unhandledrejection",function(event){var reason=event&&event.reason?event.reason:"Promesa rechazada";var msg=reason&&reason.message?reason.message:String(reason);console.error("[BaseLocal Promise Error]",reason);state.lastRenderError=msg;status("Base Local protegida. Error de sincronización controlado: "+msg,"bl-status-warn");});}
  function bindCrossWindowEvents(){window.addEventListener("storage",function(event){if(event.key==="REQ_BL_SIGNAL_V1"){invalidateCaches();scheduleRender();}});["requisitos:bl:changed","requisitos:bl:snapshot-changed","requisitos:bl:sync-complete","baselocal:sync-complete","baselocal:firebase-pull-finished","requisitos:bl:mirror-complete","requisitos:bl:limpieza-complete","requisitos:bl:periodo-borrado","baselocal:periodo-borrado","requisitos:bl:division-created","requisitos:bl:periodo-borrado-historial-purgado"].forEach(function(name){window.addEventListener(name,function(){invalidateCaches();scheduleRender();});});}

  window.BaseLocalApp={render:render,scheduleRender:scheduleRender,status:status,setBusy:setBusy,getState:function(){return Object.assign({},state);}};

  async function boot(){
    bindGlobalErrors();
    safeCall("ExcelLocalBridge.ensureReady",function(){if(window.ExcelLocalBridge&&typeof window.ExcelLocalBridge.ensureReady==="function"){window.ExcelLocalBridge.ensureReady();}},null);
    await ensureFastLayer();
    document.querySelectorAll(".bl-tabs button").forEach(function(button){button.addEventListener("click",function(){setTab(button.dataset.tab);});});
    if(el("bl-filter-period")){el("bl-filter-period").addEventListener("change",function(event){state.periodId=event.target.value;state.divisionFilter="";state.studentPage=1;scheduleRender();});}
    if(el("bl-filter-estado")){el("bl-filter-estado").addEventListener("change",function(event){state.statusFilter=event.target.value;state.studentPage=1;scheduleRender();});}
    if(el("bl-filter-division")){el("bl-filter-division").addEventListener("change",function(event){state.divisionFilter=event.target.value;state.studentPage=1;scheduleRender();});}
    if(el("bl-filter-search")){el("bl-filter-search").addEventListener("input",function(event){state.search=event.target.value;state.studentPage=1;scheduleRender();});}
    if(el("bl-btn-refresh")){el("bl-btn-refresh").addEventListener("click",function(){invalidateCaches();render();});}
    if(el("bl-btn-pull-firebase")){el("bl-btn-pull-firebase").addEventListener("click",pullFromFirebase);}
    if(el("bl-btn-sync-now")){el("bl-btn-sync-now").addEventListener("click",function(){syncNow("manual");});}
    if(el("bl-btn-clean-base")){el("bl-btn-clean-base").addEventListener("click",limpiarBase);}
    if(el("bl-btn-export")){el("bl-btn-export").addEventListener("click",exportJson);}
    if(el("bl-btn-copy-refs")){el("bl-btn-copy-refs").addEventListener("click",copyRefs);}
    if(el("bl-students-first")){el("bl-students-first").addEventListener("click",function(){state.studentPage=1;render();});}
    if(el("bl-students-prev")){el("bl-students-prev").addEventListener("click",function(){state.studentPage=Math.max(1,state.studentPage-1);render();});}
    if(el("bl-students-next")){el("bl-students-next").addEventListener("click",function(){state.studentPage+=1;render();});}
    if(el("bl-students-last")){el("bl-students-last").addEventListener("click",function(){var p=state.lastView&&state.lastView.pagination?state.lastView.pagination:null;state.studentPage=p?p.pages:1;render();});}
    bindCrossWindowEvents();
    render();
    try{window.dispatchEvent(new CustomEvent("bl:ready",{detail:{module:"BaseLocal",ready:true,at:new Date().toISOString()}}));if(window.parent&&window.parent!==window){window.parent.postMessage({type:"requisitos:bl:ready",payload:{module:"BaseLocal",ready:true,at:new Date().toISOString()}},"*");}}catch(error){}
    runDailySync();
  }

  if(document.readyState==="loading"){document.addEventListener("DOMContentLoaded",boot);}else{boot();}
})(window,document);
