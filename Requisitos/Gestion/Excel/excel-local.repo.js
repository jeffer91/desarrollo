/* =========================================================
Nombre completo: excel-local.repo.js
Ruta o ubicación: /Requisitos/Gestion/Excel/excel-local.repo.js
Función o funciones:
- Guardar períodos, estudiantes, historial y análisis del módulo Excel.
- Entregar datos locales a BaseLocal, Tabla, Ficha, Stats y futuros módulos.
Con qué se conecta:
- excel-local.storage.js
- baselocal.core.js
========================================================= */
(function(window){
  "use strict";
  function S(){if(!window.ExcelLocalStorage)throw new Error("ExcelLocalStorage no está disponible.");return window.ExcelLocalStorage;}
  function txt(v){return String(v==null?"":v).trim();}
  function key(v){return txt(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_+|_+$/g,"")||"sin_dato";}
  function ced(row){return txt(row.numeroidentificacion||row.NumeroIdentificacion||row.cedula||row.Cedula||row.CEDULA||row.identificacion||row.id);}
  function name(row){return txt(row.nombres||row.Nombres||row.nombre||row.Nombre||row.estudiante||row.Estudiante);}
  function carrera(row){return txt(row.nombrecarrera||row.NombreCarrera||row.carrera||row.Carrera||row.programa||row.Programa).toUpperCase();}
  function makePeriod(id,label){return {id:txt(id),label:txt(label||id),updatedAt:S().now()};}
  function listPeriods(){var db=S().readDb();return Object.keys(db.periodos||{}).map(function(id){return db.periodos[id];}).sort(function(a,b){return txt(a.label).localeCompare(txt(b.label),"es");});}
  function savePeriod(period){var db=S().readDb();var p=makePeriod(period.id,period.label);db.periodos[p.id]=Object.assign({},db.periodos[p.id]||{},period,p);S().writeDb(db);return db.periodos[p.id];}
  function normalizeStudent(row,period){var c=ced(row);var pid=txt(period.id||period.periodoId);return Object.assign({},row,{_docId:pid+"__"+c,docId:pid+"__"+c,periodoId:pid,periodoLabel:txt(period.label||period.periodoLabel||pid),numeroIdentificacion:c,cedula:c,nombres:name(row),nombreCarrera:carrera(row),carrera:carrera(row),updatedAt:S().now()});}
  function saveStudents(period,rows){var p=savePeriod(period);var db=S().readDb();var list=Array.isArray(rows)?rows:[];var saved=[];list.forEach(function(row){var st=normalizeStudent(row,p);if(!st.numeroIdentificacion)return;db.estudiantes[st._docId]=st;saved.push(st);});db.snapshots[p.id]={periodo:p,total:saved.length,updatedAt:S().now()};S().writeDb(db);appendHistory(p.id,{type:"saveStudents",message:"Estudiantes guardados en BaseLocal",total:saved.length,fileName:period.fileName||""});return saved;}
  function listStudents(periodId){var db=S().readDb();var pid=txt(periodId);return Object.keys(db.estudiantes||{}).map(function(id){return db.estudiantes[id];}).filter(function(s){return !pid||s.periodoId===pid;});}
  function listAllStudents(){return listStudents("");}
  function patchStudentById(id,patch){var db=S().readDb();var sid=txt(id);if(!db.estudiantes[sid]){var found=Object.keys(db.estudiantes).find(function(k){return db.estudiantes[k].numeroIdentificacion===sid||db.estudiantes[k].cedula===sid;});sid=found||sid;}if(!db.estudiantes[sid])throw new Error("Estudiante no encontrado: "+id);db.estudiantes[sid]=Object.assign({},db.estudiantes[sid],patch||{},{updatedAt:S().now()});S().writeDb(db);return db.estudiantes[sid];}
  function deleteStudentsByPeriod(periodId){var db=S().readDb();var pid=txt(periodId);var deleted=0;Object.keys(db.estudiantes||{}).forEach(function(id){if(db.estudiantes[id].periodoId===pid){delete db.estudiantes[id];deleted++;}});S().writeDb(db);appendHistory(pid,{type:"deleteStudents",message:"Estudiantes eliminados del período",total:deleted});return deleted;}
  function appendHistory(periodId,item){var db=S().readDb();var pid=txt(periodId)||"general";db.historial[pid]=db.historial[pid]||[];var entry=Object.assign({id:Date.now()+"_"+Math.random().toString(16).slice(2),createdAt:S().now()},item||{});db.historial[pid].unshift(entry);db.historial[pid]=db.historial[pid].slice(0,100);S().writeDb(db);return entry;}
  function listHistory(periodId){var db=S().readDb();return (db.historial[txt(periodId)||"general"]||[]).slice();}
  function saveAnalysis(payload){var p={id:payload.periodoId,label:payload.periodoLabel,fileName:payload.fileName};savePeriod(p);appendHistory(p.id,{type:"analysis",message:"Archivo analizado",fileName:p.fileName,total:(payload.analisis&&payload.analisis.totalFilas)||0});return saveStudents(p,payload.rows||[]);}
  function getSnapshot(){var db=S().readDb();return {meta:S().readMeta(),periodos:listPeriods(),estudiantes:listAllStudents(),historial:db.historial||{},snapshots:db.snapshots||{},generatedAt:S().now()};}
  function stats(){var snap=getSnapshot();var carreras={};snap.estudiantes.forEach(function(s){var k=carrera(s)||"SIN CARRERA";carreras[k]=(carreras[k]||0)+1;});return {periodos:snap.periodos.length,estudiantes:snap.estudiantes.length,carreras:Object.keys(carreras).length,carrerasDetalle:carreras};}
  window.ExcelLocalRepo={ensureReady:function(){S().writeMeta({ready:true});return true;},savePeriod:savePeriod,listPeriods:listPeriods,saveStudents:saveStudents,listStudents:listStudents,listAllStudents:listAllStudents,patchStudentById:patchStudentById,deleteStudentsByPeriod:deleteStudentsByPeriod,appendHistory:appendHistory,listHistory:listHistory,saveAnalysis:saveAnalysis,getSnapshot:getSnapshot,stats:stats,reset:function(){return S().reset();},exportAll:function(){return S().exportAll();}};
})(window);
