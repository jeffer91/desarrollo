/* =========================================================
Nombre completo: excel-local.repo.js
Ruta o ubicación: /Requisitos/Gestion/Excel/excel-local.repo.js
Función o funciones:
- Repositorio local central del módulo Excel.
- Guardar períodos, estudiantes e historial desde el análisis Excel.
- Exponer datos para BaseLocal, Tabla, Ficha, Stats y Reportes.
- Cargar automáticamente el conector común de BaseLocal para todos los módulos.
Con qué se conecta:
- excel-local.storage.js
- excel-ui.cargar.js
- baselocal.core.js
- ../../BaseLocal/baselocal.connector.js
========================================================= */
(function(window,document){
  "use strict";
  function S(){if(!window.ExcelLocalStorage)throw new Error("ExcelLocalStorage no disponible.");return window.ExcelLocalStorage;}
  function text(v){return String(v==null?"":v).trim();}
  function read(){return S().readSnapshot();}
  function write(snap){return S().writeSnapshot(snap);}
  function makeDocId(row,index,periodId){return text(row._docId||row.docId||row.numeroidentificacion||row.cedula||row.Cedula||row.CEDULA)||[periodId,"fila",index+1].join("_");}
  function normalizePeriod(period){var p=period||{};var id=text(p.id||p.periodoId||p.value);return {id:id,label:text(p.label||p.periodoLabel||id),inicioMes:p.inicioMes||null,inicioAnio:p.inicioAnio||null,finMes:p.finMes||null,finAnio:p.finAnio||null,updatedAt:new Date().toISOString()};}
  function normalizeStudent(row,index,period){var p=normalizePeriod(period);var r=Object.assign({},row||{});var id=makeDocId(r,index,p.id);r._docId=id;r.docId=id;r.periodoId=p.id;r.periodoLabel=p.label;r.cedula=text(r.cedula||r.Cedula||r.numeroidentificacion||r.NumeroIdentificacion||id);r.numeroIdentificacion=text(r.numeroIdentificacion||r.numeroidentificacion||r.cedula||id);r.nombres=text(r.nombres||r.Nombres||r.nombre||r.estudiante);r.nombrecarrera=text(r.nombrecarrera||r.nombreCarrera||r.carrera||r.NombreCarrera);r.updatedAt=new Date().toISOString();return r;}
  function upsertPeriod(snap,period){var p=normalizePeriod(period);if(!p.id)throw new Error("Período vacío.");var i=snap.periods.findIndex(function(x){return x.id===p.id;});if(i>=0)snap.periods[i]=Object.assign({},snap.periods[i],p);else snap.periods.push(p);return p;}
  function saveAnalysis(payload){payload=payload||{};var snap=read();var period=upsertPeriod(snap,{id:payload.periodoId,label:payload.periodoLabel});var old=snap.students.filter(function(s){return s.periodoId!==period.id;});var rows=Array.isArray(payload.rows)?payload.rows:[];var students=rows.map(function(row,i){return normalizeStudent(row,i,period);});snap.students=old.concat(students);snap.history.push({id:"hist_"+Date.now(),periodoId:period.id,periodoLabel:period.label,fileName:text(payload.fileName),totalRows:students.length,schema:payload.schema||null,analisis:payload.analisis||null,consolidado:payload.consolidado||null,createdAt:new Date().toISOString()});snap.meta.lastPeriodId=period.id;snap.meta.lastFileName=text(payload.fileName);snap.meta.totalStudents=snap.students.length;snap.meta.totalPeriods=snap.periods.length;var saved=write(snap);try{if(window.RequisitosBL&&typeof window.RequisitosBL.mirrorSnapshotToCollections==="function"){window.RequisitosBL.mirrorSnapshotToCollections();window.RequisitosBL.notificar("snapshot-changed",{source:"excel-local.repo",periodoId:period.id,totalStudents:snap.students.length});}}catch(error){}return saved;}
  function listPeriods(){return read().periods.slice();}
  function listAllStudents(){return read().students.slice();}
  function listStudentsByPeriod(periodId){periodId=text(periodId);return read().students.filter(function(s){return !periodId||s.periodoId===periodId;});}
  function listHistory(){return read().history.slice().reverse();}
  function patchStudentById(id,patch){var snap=read();var wanted=text(id);var found=false;snap.students=snap.students.map(function(s){if(text(s._docId||s.docId)===wanted){found=true;return Object.assign({},s,patch||{},{updatedAt:new Date().toISOString()});}return s;});if(!found)throw new Error("No se encontró estudiante: "+wanted);var saved=write(snap);try{if(window.RequisitosBL){window.RequisitosBL.mirrorSnapshotToCollections();window.RequisitosBL.notificar("snapshot-changed",{source:"patchStudentById",id:wanted});}}catch(error){}return saved;}
  function clearPeriod(periodId){var snap=read();var id=text(periodId);snap.students=snap.students.filter(function(s){return s.periodoId!==id;});snap.history.push({id:"clear_"+Date.now(),periodoId:id,action:"clearPeriod",createdAt:new Date().toISOString()});var saved=write(snap);try{if(window.RequisitosBL){window.RequisitosBL.mirrorSnapshotToCollections();window.RequisitosBL.notificar("snapshot-changed",{source:"clearPeriod",periodoId:id});}}catch(error){}return saved;}
  function clearAll(){var saved=S().clear();try{if(window.RequisitosBL){window.RequisitosBL.mirrorSnapshotToCollections();window.RequisitosBL.notificar("snapshot-changed",{source:"clearAll"});}}catch(error){}return saved;}
  function diagnostics(){var snap=read();var careers={};snap.students.forEach(function(s){var c=text(s.nombrecarrera||s.carrera)||"SIN CARRERA";careers[c]=(careers[c]||0)+1;});return {ok:true,updatedAt:snap.meta.updatedAt,totalPeriods:snap.periods.length,totalStudents:snap.students.length,totalHistory:snap.history.length,careers:careers,meta:snap.meta};}
  function getSnapshot(){return read();}

  function loadScriptOnce(url, marker, done){
    if(window[marker]){if(done)done();return;}
    var existing=document.querySelector('script[data-req-bl-marker="'+marker+'"]');
    if(existing){existing.addEventListener("load",function(){if(done)done();});return;}
    var script=document.createElement("script");
    script.src=url;
    script.async=false;
    script.dataset.reqBlMarker=marker;
    script.onload=function(){window[marker]=true;if(done)done();};
    script.onerror=function(){console.warn("[ExcelLocalRepo] No se pudo cargar",url);};
    document.head.appendChild(script);
  }

  function loadBaseLocalConnector(){
    try{
      var current=document.currentScript&&document.currentScript.src?document.currentScript.src:window.location.href;
      var connectorUrl=new URL("../../BaseLocal/baselocal.connector.js",current).href;
      var autoUrl=new URL("../../BaseLocal/baselocal.autoconnect.js",current).href;
      loadScriptOnce(connectorUrl,"__REQ_BL_CONNECTOR_SCRIPT__",function(){
        loadScriptOnce(autoUrl,"__REQ_BL_AUTOCONNECT_SCRIPT__");
      });
    }catch(error){
      console.warn("[ExcelLocalRepo] Conector BaseLocal no cargado",error);
    }
  }

  window.ExcelLocalRepo={saveAnalysis:saveAnalysis,listPeriods:listPeriods,listAllStudents:listAllStudents,listStudentsByPeriod:listStudentsByPeriod,listHistory:listHistory,patchStudentById:patchStudentById,clearPeriod:clearPeriod,clearAll:clearAll,diagnostics:diagnostics,getSnapshot:getSnapshot};
  loadBaseLocalConnector();
})(window,document);