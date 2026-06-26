/* =========================================================
Nombre completo: baselocal.core.js
Ruta o ubicación: /Requisitos/BaseLocal/baselocal.core.js
Función o funciones:
- Leer la base local desde ExcelLocalRepo.
- Preparar datos para la pantalla BL y futuras apps.
- Evitar que cédulas aparezcan como períodos.
- Unificar períodos repetidos por mayúsculas, minúsculas o tildes.
Con qué se conecta:
- excel-local.repo.js
- baselocal.app.js
========================================================= */
(function(window){
  "use strict";

  var MONTHS = {
    enero:"Enero", febrero:"Febrero", marzo:"Marzo", abril:"Abril", mayo:"Mayo", junio:"Junio",
    julio:"Julio", agosto:"Agosto", septiembre:"Septiembre", setiembre:"Septiembre",
    octubre:"Octubre", noviembre:"Noviembre", diciembre:"Diciembre"
  };

  function repo(){
    if(!window.ExcelLocalRepo){
      throw new Error("ExcelLocalRepo no disponible.");
    }
    return window.ExcelLocalRepo;
  }

  function text(value){
    return String(value == null ? "" : value).trim();
  }

  function normalizeText(value){
    return text(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isCedulaLike(value){
    return /^\d{7,13}$/.test(text(value));
  }

  function isValidPeriod(value){
    var raw = text(value);
    var clean = normalizeText(raw);
    if(!raw || isCedulaLike(raw)){
      return false;
    }
    if(clean === "sin_periodo" || clean === "sin periodo"){
      return true;
    }
    return /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/.test(clean) && /20\d{2}/.test(clean);
  }

  function periodKey(period){
    var label = text(period && (period.label || period.periodoLabel || period.periodo || period.id));
    return normalizeText(label || (period && period.id));
  }

  function prettyPeriodLabel(value){
    var raw = text(value);
    var clean = normalizeText(raw);
    if(!clean){
      return raw;
    }
    Object.keys(MONTHS).forEach(function(month){
      var reg = new RegExp("\\b" + month + "\\b", "g");
      clean = clean.replace(reg, MONTHS[month]);
    });
    clean = clean.replace(/\ba\b/g, "a").replace(/\s+/g, " ").trim();
    return clean || raw;
  }

  function getSnapshot(){
    return repo().getSnapshot();
  }

  function getPeriods(){
    var map = {};
    var result = [];
    (repo().listPeriods() || []).forEach(function(period){
      var label = text(period && (period.label || period.periodoLabel || period.periodo || period.id));
      var id = text(period && (period.id || period.periodoId || period.value || label));
      var key = periodKey(period);

      if(!isValidPeriod(label || id) || !key || map[key]){
        return;
      }

      map[key] = true;
      result.push(Object.assign({}, period, {
        id:id || key.replace(/\s+/g, "_"),
        label:prettyPeriodLabel(label || id),
        updatedAt:text(period && period.updatedAt)
      }));
    });
    return result;
  }

  function getStudents(periodId, search){
    var list = repo().listStudentsByPeriod(periodId || "");
    var q = text(search).toLowerCase();
    if(q){
      list = list.filter(function(student){
        return [student.cedula, student.numeroIdentificacion, student.nombres, student.nombrecarrera, student.periodoLabel].join(" ").toLowerCase().indexOf(q) >= 0;
      });
    }
    return list;
  }

  function getHistory(){
    return repo().listHistory();
  }

  function getDiagnostics(){
    var diagnostics = repo().diagnostics();
    diagnostics.periodsFiltered = true;
    diagnostics.periodsVisible = getPeriods().length;
    return diagnostics;
  }

  function getCareersCount(students){
    var map = {};
    (students || []).forEach(function(student){
      var career = text(student.nombrecarrera || student.carrera) || "SIN CARRERA";
      map[career] = true;
    });
    return Object.keys(map).length;
  }

  function buildView(periodId, search){
    var students = getStudents(periodId, search);
    return {
      periods:getPeriods(),
      students:students,
      history:getHistory(),
      diagnostics:getDiagnostics(),
      careersCount:getCareersCount(students),
      snapshot:getSnapshot()
    };
  }

  window.BaseLocalAPI = {
    getSnapshot:getSnapshot,
    getPeriods:getPeriods,
    getStudents:getStudents,
    getHistory:getHistory,
    getDiagnostics:getDiagnostics,
    buildView:buildView
  };
})(window);
