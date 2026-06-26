/* =========================================================
Nombre completo: bl-healthcheck.js
Ruta o ubicación: /Requisitos/BaseLocal/services/bl-healthcheck.js
Función o funciones:
- Revisar que Base Local tenga servicios cargados, estudiantes válidos y periodos correctos.
- Detectar cédulas faltantes, duplicadas, estados inválidos y periodos problemáticos.
- Entregar un diagnóstico simple para la pestaña Diagnóstico.
Con qué se conecta:
- bl-campos.js
- bl-matricula.service.js
- baselocal.app.js
========================================================= */
(function(window){
  "use strict";

  function text(value){
    return window.BLCampos ? window.BLCampos.text(value) : String(value == null ? "" : value).trim();
  }

  function normalizeEstado(value){
    if(window.BLMatriculaService && typeof window.BLMatriculaService.normalizeEstado === "function"){
      return window.BLMatriculaService.normalizeEstado(value);
    }
    var clean = text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    return clean === "RETIRADO" ? "RETIRADO" : "ACTIVO";
  }

  function getCedula(student){
    if(window.BLMatriculaService && typeof window.BLMatriculaService.getCedula === "function"){
      return window.BLMatriculaService.getCedula(student);
    }
    return text(student && (student.cedula || student.numeroIdentificacion || student.docId || student._docId));
  }

  function isCedulaLike(value){
    return /^\d{7,13}$/.test(text(value));
  }

  function serviceStatus(){
    return {
      BLCampos:!!window.BLCampos,
      BLNormalizador:!!window.BLNormalizador,
      BLFiltros:!!window.BLFiltros,
      BLPeriodosService:!!window.BLPeriodosService,
      BLEstudiantesService:!!window.BLEstudiantesService,
      BLSyncDiario:!!window.BLSyncDiario,
      BLMatriculaService:!!window.BLMatriculaService,
      BLFirestorePatch:!!window.BLFirestorePatch,
      BaseLocalAPI:!!window.BaseLocalAPI,
      BaseLocalFirebase:!!window.BaseLocalFirebase,
      ExcelLocalStorage:!!window.ExcelLocalStorage,
      ExcelLocalRepo:!!window.ExcelLocalRepo
    };
  }

  function run(snapshot){
    var snap = snapshot && typeof snapshot === "object" ? snapshot : {periods:[], students:[], history:[]};
    var periods = Array.isArray(snap.periods) ? snap.periods : [];
    var students = Array.isArray(snap.students) ? snap.students : [];
    var issues = [];
    var cedulas = {};
    var estados = {ACTIVO:0, RETIRADO:0};
    var sinCedula = 0;
    var sinPeriodo = 0;
    var duplicadas = [];
    var periodosCedula = [];

    periods.forEach(function(period){
      var id = text(period && (period.id || period.periodoId));
      if(isCedulaLike(id)){
        periodosCedula.push(id);
      }
    });

    students.forEach(function(student){
      var cedula = getCedula(student);
      var periodoId = text(student && student.periodoId);
      var estado = normalizeEstado(student && student.estadoMatricula);
      estados[estado] = (estados[estado] || 0) + 1;
      if(!cedula){
        sinCedula += 1;
      }else if(cedulas[cedula]){
        duplicadas.push(cedula);
      }else{
        cedulas[cedula] = true;
      }
      if(!periodoId){
        sinPeriodo += 1;
      }
    });

    if(!periods.length){issues.push("No hay períodos en Base Local.");}
    if(!students.length){issues.push("No hay estudiantes en Base Local.");}
    if(sinCedula){issues.push("Hay " + sinCedula + " estudiantes sin cédula.");}
    if(sinPeriodo){issues.push("Hay " + sinPeriodo + " estudiantes sin periodoId.");}
    if(duplicadas.length){issues.push("Hay cédulas duplicadas: " + duplicadas.slice(0, 10).join(", ") + (duplicadas.length > 10 ? "..." : ""));}
    if(periodosCedula.length){issues.push("Hay períodos que parecen cédulas: " + periodosCedula.slice(0, 10).join(", ") + (periodosCedula.length > 10 ? "..." : ""));}

    var services = serviceStatus();
    Object.keys(services).forEach(function(name){
      if(!services[name]){
        issues.push("Servicio no cargado: " + name);
      }
    });

    return {
      ok:issues.length === 0,
      checkedAt:new Date().toISOString(),
      services:services,
      totals:{periods:periods.length, students:students.length, history:Array.isArray(snap.history) ? snap.history.length : 0},
      estados:estados,
      sinCedula:sinCedula,
      sinPeriodo:sinPeriodo,
      duplicadas:duplicadas,
      periodosCedula:periodosCedula,
      issues:issues
    };
  }

  window.BLHealthCheck = {run:run, serviceStatus:serviceStatus};
})(window);
