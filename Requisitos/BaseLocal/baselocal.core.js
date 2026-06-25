/* =========================================================
Nombre completo: baselocal.core.js
Ruta o ubicación: /Requisitos/BaseLocal/baselocal.core.js
Función o funciones:
- Leer la base local desde ExcelLocalRepo.
- Preparar datos para la pantalla BL y futuras apps.
Con qué se conecta:
- excel-local.repo.js
- baselocal.app.js
========================================================= */
(function(window){
  "use strict";
  function repo(){if(!window.ExcelLocalRepo)throw new Error("ExcelLocalRepo no disponible.");return window.ExcelLocalRepo;}
  function text(v){return String(v==null?"":v).trim();}
  function getSnapshot(){return repo().getSnapshot();}
  function getPeriods(){return repo().listPeriods();}
  function getStudents(periodId,search){var list=repo().listStudentsByPeriod(periodId||"");var q=text(search).toLowerCase();if(q){list=list.filter(function(s){return [s.cedula,s.numeroIdentificacion,s.nombres,s.nombrecarrera,s.periodoLabel].join(" ").toLowerCase().indexOf(q)>=0;});}return list;}
  function getHistory(){return repo().listHistory();}
  function getDiagnostics(){return repo().diagnostics();}
  function getCareersCount(students){var map={};(students||[]).forEach(function(s){var c=text(s.nombrecarrera||s.carrera)||"SIN CARRERA";map[c]=true;});return Object.keys(map).length;}
  function buildView(periodId,search){var students=getStudents(periodId,search);return {periods:getPeriods(),students:students,history:getHistory(),diagnostics:getDiagnostics(),careersCount:getCareersCount(students),snapshot:getSnapshot()};}
  window.BaseLocalAPI={getSnapshot:getSnapshot,getPeriods:getPeriods,getStudents:getStudents,getHistory:getHistory,getDiagnostics:getDiagnostics,buildView:buildView};
})(window);
