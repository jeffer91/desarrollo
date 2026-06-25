/* =========================================================
Nombre completo: baselocal.core.js
Ruta o ubicación: /Requisitos/BaseLocal/baselocal.core.js
Función o funciones:
- Leer la base local creada por ExcelLocalRepo.
- Construir snapshot, índices y diagnóstico para otros módulos.
Con qué se conecta:
- ../Gestion/Excel/excel-local.repo.js
- baselocal.app.js
========================================================= */
(function(window){
  "use strict";
  function txt(v){return String(v==null?"":v).trim();}
  function repo(){if(!window.ExcelLocalRepo)throw new Error("ExcelLocalRepo no está disponible.");return window.ExcelLocalRepo;}
  function buildIndices(estudiantes){var porCedula={},porPeriodo={},porCarrera={};(estudiantes||[]).forEach(function(s){var ced=txt(s.numeroIdentificacion||s.cedula);var pid=txt(s.periodoId);var car=txt(s.nombreCarrera||s.carrera)||"SIN CARRERA";if(ced)porCedula[ced]=s;if(pid){porPeriodo[pid]=porPeriodo[pid]||[];porPeriodo[pid].push(s);}porCarrera[car]=porCarrera[car]||[];porCarrera[car].push(s);});return {estudiantesPorCedula:porCedula,estudiantesPorPeriodo:porPeriodo,estudiantesPorCarrera:porCarrera};}
  function diagnostics(snap){var errors=[],warnings=[];if(!snap.periodos.length)warnings.push("No existen períodos guardados en BaseLocal.");if(!snap.estudiantes.length)warnings.push("No existen estudiantes guardados en BaseLocal.");var sinCed=snap.estudiantes.filter(function(s){return !txt(s.numeroIdentificacion||s.cedula);}).length;if(sinCed)errors.push("Hay "+sinCed+" estudiantes sin cédula.");return {ok:errors.length===0,errores:errors,advertencias:warnings};}
  function getSnapshot(){var raw=repo().getSnapshot();var snap={meta:raw.meta||{},periodos:raw.periodos||[],estudiantes:raw.estudiantes||[],historial:raw.historial||{},snapshots:raw.snapshots||{},generatedAt:new Date().toISOString()};snap.indices=buildIndices(snap.estudiantes);snap.diagnostico=diagnostics(snap);snap.resumen={periodos:snap.periodos.length,estudiantes:snap.estudiantes.length,carreras:Object.keys(snap.indices.estudiantesPorCarrera).length};return snap;}
  function getPeriods(){return getSnapshot().periodos;}
  function getStudents(){return getSnapshot().estudiantes;}
  function getStudentsByPeriod(pid){return getStudents().filter(function(s){return txt(s.periodoId)===txt(pid);});}
  function exportJSON(){return JSON.stringify(getSnapshot(),null,2);}
  window.BaseLocalAPI={version:"3.0.0",ensureReady:function(){repo().ensureReady();return true;},buildDatabase:getSnapshot,getSnapshot:getSnapshot,getPeriods:getPeriods,getStudents:getStudents,getStudentsByPeriod:getStudentsByPeriod,getDiagnostics:function(){return getSnapshot().diagnostico;},exportJSON:exportJSON,helpers:{asText:txt}};
})(window);
