/* =========================================================
Nombre completo: excel-local.repo.js
Ruta o ubicación: /Requisitos/Gestion/Excel/excel-local.repo.js
Función o funciones:
- Repositorio local central del módulo Carga Excel.
- Guardar períodos, estudiantes e historial desde el análisis Excel.
- Aplicar reglas de matrícula: ACTIVO, RETIRADO, cambio de período y reactivación.
- Exponer datos filtrables por estado para Base Local, Tabla, Ficha, Stats y Reportes.
- Mantener períodos canónicos y conservar divisiones por carrera/período.
Con qué se conecta:
- excel-local.storage.js
- excel-ui.cargar.js
- ../../BaseLocal/services/bl-matricula.service.js
- ../../BaseLocal/services/bl-periodos-canon.service.js
- ../../BaseLocal/services/bl-divisiones.service.js
- ../../BaseLocal/baselocal.connector.js
========================================================= */
(function(window,document){
  "use strict";

  function S(){if(!window.ExcelLocalStorage)throw new Error("ExcelLocalStorage no disponible.");return window.ExcelLocalStorage;}
  function text(v){return String(v==null?"":v).trim();}
  function now(){return new Date().toISOString();}
  function read(){return canonicalizeSnapshot(S().readSnapshot());}
  function write(snap){return S().writeSnapshot(canonicalizeSnapshot(snap));}

  function canon(){return window.BLPeriodosCanon || null;}
  function divisiones(){return window.BLDivisionesService || null;}

  function normalizeEstado(value){
    if(window.BLMatriculaService&&typeof window.BLMatriculaService.normalizeEstado==="function")return window.BLMatriculaService.normalizeEstado(value);
    return text(value||"ACTIVO").toUpperCase()==="RETIRADO"?"RETIRADO":"ACTIVO";
  }

  function getCedula(row){
    row=row||{};
    if(window.BLMatriculaService&&typeof window.BLMatriculaService.getCedula==="function")return window.BLMatriculaService.getCedula(row);
    return text(row.cedula||row.Cedula||row.CEDULA||row.numeroIdentificacion||row.numeroidentificacion||row.NumeroIdentificacion||row.identificacion||row.Identificacion||row.docId||row._docId);
  }

  function normalizeDivisiones(value){
    if(divisiones()&&typeof divisiones().normalizeDivisiones==="function")return divisiones().normalizeDivisiones(value);
    if(window.BLNormalizador&&typeof window.BLNormalizador.normalizeDivisiones==="function")return window.BLNormalizador.normalizeDivisiones(value);
    if(Array.isArray(value))return value.map(text).filter(Boolean);
    var single=text(value);return single?[single]:[];
  }

  function normalizePeriod(period){
    if(canon()&&typeof canon().normalizePeriod==="function")return canon().normalizePeriod(period);
    var p=period||{};
    var id=text(p.id||p.periodoId||p.value);
    var label=text(p.label||p.periodoLabel||id);
    return {id:id,periodoId:id,label:label,periodoLabel:label,inicioMes:p.inicioMes||null,inicioAnio:p.inicioAnio||null,finMes:p.finMes||null,finAnio:p.finAnio||null,updatedAt:text(p.updatedAt)||now()};
  }

  function canonicalizeSnapshot(snapshot){
    if(canon()&&typeof canon().canonicalizeSnapshot==="function")return canon().canonicalizeSnapshot(snapshot);
    var snap=snapshot&&typeof snapshot==="object"?snapshot:{meta:{},periods:[],students:[],history:[],diagnostics:[]};
    snap.meta=snap.meta&&typeof snap.meta==="object"?snap.meta:{};
    snap.periods=Array.isArray(snap.periods)?snap.periods.map(normalizePeriod):[];
    snap.students=Array.isArray(snap.students)?snap.students:[];
    snap.history=Array.isArray(snap.history)?snap.history:[];
    snap.diagnostics=Array.isArray(snap.diagnostics)?snap.diagnostics:[];
    snap.meta.totalPeriods=snap.periods.length;
    snap.meta.totalStudents=snap.students.length;
    return snap;
  }

  function normalizeStudentFallback(row,index,period){
    var p=normalizePeriod(period);
    var r=Object.assign({},row||{});
    var id=getCedula(r)||[p.id,"fila",index+1].join("_");
    var divs=normalizeDivisiones(r.divisiones||r.division||r.Division||r.División);
    r._docId=text(r._docId||r.docId||id);
    r.docId=text(r.docId||r._docId||id);
    r.periodoId=p.id;
    r.ultimoPeriodoId=p.id;
    r.periodoLabel=p.label;
    r.cedula=text(r.cedula||r.Cedula||r.CEDULA||r.numeroIdentificacion||r.numeroidentificacion||r.NumeroIdentificacion||id);
    r.numeroIdentificacion=text(r.numeroIdentificacion||r.numeroidentificacion||r.NumeroIdentificacion||r.cedula||id);
    r.nombres=text(r.nombres||r.Nombres||r.nombre||r.estudiante);
    r.nombrecarrera=text(r.nombrecarrera||r.nombreCarrera||r.carrera||r.NombreCarrera);
    r.estadoMatricula=normalizeEstado(r.estadoMatricula||"ACTIVO");
    r.historialEstadoMatricula=Array.isArray(r.historialEstadoMatricula)?r.historialEstadoMatricula:[];
    r.divisiones=divs;
    if(divs.length)r.division=divs[0];else delete r.division;
    r.updatedAt=now();
    r.ultimaSincronizacion=now();
    return r;
  }

  function upsertPeriod(snap,period){
    var p=normalizePeriod(period);
    if(!p.id)throw new Error("Período vacío.");
    snap.periods=Array.isArray(snap.periods)?snap.periods:[];
    var key=canon()&&typeof canon().keyFromPeriod==="function"?canon().keyFromPeriod(p):text(p.id);
    var i=snap.periods.findIndex(function(x){var k=canon()&&typeof canon().keyFromPeriod==="function"?canon().keyFromPeriod(x):text(x.id||x.periodoId);return k===key;});
    if(i>=0)snap.periods[i]=Object.assign({},snap.periods[i],p);
    else snap.periods.push(p);
    snap.periods=canonicalizeSnapshot(snap).periods;
    return p;
  }

  function addHistoryEvent(student,estado,period,motivo,extra){
    var out=Object.assign({},student||{});
    var list=Array.isArray(out.historialEstadoMatricula)?out.historialEstadoMatricula.slice():[];
    list.push(Object.assign({estado:estado,fecha:now(),periodoId:period.id,periodoLabel:period.label,motivo:motivo},extra||{}));
    out.historialEstadoMatricula=list;
    return out;
  }

  function markRetiradoFallback(student,period){
    var s=Object.assign({},student||{});
    if(normalizeEstado(s.estadoMatricula)==="RETIRADO")return s;
    s.estadoMatricula="RETIRADO";
    s.retiradoEn=text(s.retiradoEn)||now();
    s.updatedAt=now();
    s.ultimaSincronizacion=now();
    return addHistoryEvent(s,"RETIRADO",period,"No apareció en la última carga del período");
  }

  function reconcileFallback(snap,rows,period){
    var stats={added:0,updated:0,retired:0,reactivated:0,moved:0,totalIncoming:(rows||[]).length};
    var byCedula={};
    (snap.students||[]).forEach(function(student){var key=getCedula(student);if(key)byCedula[key]=Object.assign({},student);});
    var incomingCedulas={};
    (rows||[]).forEach(function(row,index){
      var incoming=normalizeStudentFallback(row,index,period);
      var cedula=getCedula(incoming);
      if(!cedula)return;
      incomingCedulas[cedula]=true;
      var previous=byCedula[cedula]||null;
      var wasRetirado=previous&&normalizeEstado(previous.estadoMatricula)==="RETIRADO";
      var moved=previous&&text(previous.periodoId)&&text(previous.periodoId)!==text(period.id);
      var prevDivs=normalizeDivisiones(previous&&(previous.divisiones||previous.division));
      var incDivs=normalizeDivisiones(incoming&&(incoming.divisiones||incoming.division));
      var finalDivs=incDivs.length?incDivs:prevDivs;
      var merged=Object.assign({},previous||{},incoming,{cedula:cedula,numeroIdentificacion:text(incoming.numeroIdentificacion||cedula),periodoId:period.id,ultimoPeriodoId:period.id,periodoLabel:period.label,estadoMatricula:"ACTIVO",divisiones:finalDivs,updatedAt:now(),ultimaSincronizacion:now()});
      if(finalDivs.length)merged.division=finalDivs[0];else delete merged.division;
      if(!previous)stats.added+=1;else stats.updated+=1;
      if(moved){stats.moved+=1;merged=addHistoryEvent(merged,"ACTIVO",period,"Cambio de período: se reemplazó el período anterior",{periodoAnterior:previous.periodoId||""});}
      if(wasRetirado){stats.reactivated+=1;merged=addHistoryEvent(merged,"ACTIVO",period,"Volvió a aparecer en carga nueva");}
      byCedula[cedula]=merged;
    });
    Object.keys(byCedula).forEach(function(cedula){var student=byCedula[cedula];if(text(student.periodoId)===text(period.id)&&!incomingCedulas[cedula]){var before=normalizeEstado(student.estadoMatricula);byCedula[cedula]=markRetiradoFallback(student,period);if(before!=="RETIRADO")stats.retired+=1;}});
    return {students:Object.keys(byCedula).map(function(k){return byCedula[k];}),stats:stats};
  }

  function reconcileStudents(snap,rows,period){
    if(window.BLMatriculaService&&typeof window.BLMatriculaService.reconcile==="function")return window.BLMatriculaService.reconcile(snap,rows,period,{source:"excel-local.repo"});
    return reconcileFallback(snap,rows,period);
  }

  function saveAnalysis(payload){
    payload=payload||{};
    var snap=read();
    var period=upsertPeriod(snap,{id:payload.periodoId,label:payload.periodoLabel,inicioMes:payload.inicioMes,inicioAnio:payload.inicioAnio,finMes:payload.finMes,finAnio:payload.finAnio});
    var rows=Array.isArray(payload.rows)?payload.rows:[];
    var reconciled=reconcileStudents(snap,rows,period);
    snap.students=reconciled.students;
    snap.history=Array.isArray(snap.history)?snap.history:[];
    snap.history.push({id:"hist_"+Date.now(),action:"saveAnalysis",periodoId:period.id,periodoLabel:period.label,fileName:text(payload.fileName),totalRows:rows.length,totalStudents:snap.students.length,stats:reconciled.stats||null,schema:payload.schema||null,analisis:payload.analisis||null,consolidado:payload.consolidado||null,createdAt:now()});
    snap.meta=Object.assign({},snap.meta||{}, {lastPeriodId:period.id,lastFileName:text(payload.fileName),totalStudents:snap.students.length,totalPeriods:snap.periods.length,updatedAt:now()});
    var saved=write(snap);
    try{if(window.RequisitosBL&&typeof window.RequisitosBL.mirrorSnapshotToCollections==="function"){window.RequisitosBL.mirrorSnapshotToCollections({force:true});window.RequisitosBL.notificar("snapshot-changed",{source:"excel-local.repo",periodoId:period.id,totalStudents:snap.students.length,stats:reconciled.stats||null});}}catch(error){}
    return saved;
  }

  function samePeriod(a,b){if(!text(b))return true;if(canon()&&typeof canon().samePeriod==="function")return canon().samePeriod(a,b);return text(a)===text(b);}

  function filterStudents(options){
    options=options||{};
    var periodoId=text(options.periodoId||"");
    var estado=options.estadoMatricula==null?"":text(options.estadoMatricula);
    var division=text(options.division||"");
    return read().students.filter(function(s){
      var okPeriod=!periodoId||samePeriod(s.periodoId,periodoId);
      var okEstado=!estado||normalizeEstado(s.estadoMatricula)===estado;
      var okDivision=true;
      if(division&&divisiones()&&typeof divisiones().hasDivision==="function")okDivision=divisiones().hasDivision(s,division);
      return okPeriod&&okEstado&&okDivision;
    });
  }

  function listPeriods(){return read().periods.slice();}
  function listAllStudents(){return read().students.slice();}
  function listStudentsByPeriod(periodId,options){options=options||{};options.periodoId=periodId;return filterStudents(options);}
  function listStudentsByStatus(estadoMatricula,periodoId){return filterStudents({estadoMatricula:estadoMatricula,periodoId:periodoId});}
  function listActiveStudents(periodoId){return listStudentsByStatus("ACTIVO",periodoId);}
  function listRetiredStudents(periodoId){return listStudentsByStatus("RETIRADO",periodoId);}
  function countByStatus(periodoId){var rows=filterStudents({periodoId:periodoId||""});var out={ACTIVO:0,RETIRADO:0,TOTAL:0};rows.forEach(function(s){var e=normalizeEstado(s.estadoMatricula);out[e]=(out[e]||0)+1;out.TOTAL+=1;});return out;}
  function listHistory(){return read().history.slice().reverse();}

  function patchStudentById(id,patch){
    var snap=read();var wanted=text(id);var found=false;
    snap.students=snap.students.map(function(s){if(text(s._docId||s.docId||s.cedula||s.numeroIdentificacion)===wanted||getCedula(s)===wanted){found=true;return Object.assign({},s,patch||{},{updatedAt:now(),ultimaSincronizacion:now()});}return s;});
    if(!found)throw new Error("No se encontró estudiante: "+wanted);
    var saved=write(snap);
    try{if(window.RequisitosBL){window.RequisitosBL.mirrorSnapshotToCollections({force:true});window.RequisitosBL.notificar("snapshot-changed",{source:"patchStudentById",id:wanted});}}catch(error){}
    return saved;
  }

  function clearPeriod(periodId){
    var snap=read();var id=text(periodId);
    snap.students=snap.students.filter(function(s){return !samePeriod(s.periodoId,id);});
    snap.history.push({id:"clear_"+Date.now(),periodoId:id,action:"clearPeriod",createdAt:now()});
    var saved=write(snap);
    try{if(window.RequisitosBL){window.RequisitosBL.mirrorSnapshotToCollections({force:true});window.RequisitosBL.notificar("snapshot-changed",{source:"clearPeriod",periodoId:id});}}catch(error){}
    return saved;
  }

  function clearAll(){var saved=S().clear();try{if(window.RequisitosBL){window.RequisitosBL.mirrorSnapshotToCollections({force:true});window.RequisitosBL.notificar("snapshot-changed",{source:"clearAll"});}}catch(error){}return saved;}

  function diagnostics(){
    var snap=read();var careers={};var estados=countByStatus();
    snap.students.forEach(function(s){var c=text(s.nombrecarrera||s.NombreCarrera||s.carrera)||"SIN CARRERA";careers[c]=(careers[c]||0)+1;});
    return {ok:true,updatedAt:snap.meta.updatedAt,totalPeriods:snap.periods.length,totalStudents:snap.students.length,totalHistory:snap.history.length,careers:careers,estados:estados,meta:snap.meta};
  }

  function getSnapshot(){return read();}

  function loadScriptOnce(url, marker, done){
    if(window[marker]){if(done)done();return;}
    var existing=document.querySelector('script[data-req-bl-marker="'+marker+'"]');
    if(existing){existing.addEventListener("load",function(){if(done)done();});return;}
    var script=document.createElement("script");script.src=url;script.async=false;script.dataset.reqBlMarker=marker;script.onload=function(){window[marker]=true;if(done)done();};script.onerror=function(){console.warn("[ExcelLocalRepo] No se pudo cargar",url);};document.head.appendChild(script);
  }

  function loadBaseLocalConnector(){
    try{
      var current=document.currentScript&&document.currentScript.src?document.currentScript.src:window.location.href;
      var base=new URL("../../BaseLocal/",current).href;
      loadScriptOnce(base+"services/bl-campos.js","__REQ_BL_CAMPOS_SCRIPT__",function(){
        loadScriptOnce(base+"services/bl-periodos-canon.service.js","__REQ_BL_PERIODOS_CANON_SCRIPT__",function(){
          loadScriptOnce(base+"services/bl-divisiones.service.js","__REQ_BL_DIVISIONES_SCRIPT__",function(){
            loadScriptOnce(base+"services/bl-normalizador.js","__REQ_BL_NORMALIZADOR_SCRIPT__",function(){loadScriptOnce(base+"services/bl-matricula.service.js","__REQ_BL_MATRICULA_SCRIPT__");});
          });
        });
      });
      loadScriptOnce(base+"baselocal.connector.js","__REQ_BL_CONNECTOR_SCRIPT__",function(){loadScriptOnce(base+"baselocal.autoconnect.js","__REQ_BL_AUTOCONNECT_SCRIPT__");});
    }catch(error){console.warn("[ExcelLocalRepo] Conector BaseLocal no cargado",error);}
  }

  window.ExcelLocalRepo={saveAnalysis:saveAnalysis,listPeriods:listPeriods,listAllStudents:listAllStudents,listStudentsByPeriod:listStudentsByPeriod,listStudentsByStatus:listStudentsByStatus,listActiveStudents:listActiveStudents,listRetiredStudents:listRetiredStudents,countByStatus:countByStatus,listHistory:listHistory,patchStudentById:patchStudentById,clearPeriod:clearPeriod,clearAll:clearAll,diagnostics:diagnostics,getSnapshot:getSnapshot};
  loadBaseLocalConnector();
})(window,document);
