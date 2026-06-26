/* =========================================================
Nombre completo: baselocal.core.js
Ruta o ubicación: /Requisitos/BaseLocal/baselocal.core.js
Función o funciones:
- Leer la base local desde ExcelLocalRepo.
- Preparar datos para la pantalla Base Local.
- Usar servicios pequeños para campos, normalización y filtros.
- Mostrar estudiantes activos por defecto y retirados solo con filtro.
Con qué se conecta:
- excel-local.repo.js
- services/bl-campos.js
- services/bl-normalizador.js
- services/bl-filtros.js
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

  function campos(){
    if(!window.BLCampos){
      throw new Error("BLCampos no disponible.");
    }
    return window.BLCampos;
  }

  function normalizador(){
    if(!window.BLNormalizador){
      throw new Error("BLNormalizador no disponible.");
    }
    return window.BLNormalizador;
  }

  function filtros(){
    if(!window.BLFiltros){
      throw new Error("BLFiltros no disponible.");
    }
    return window.BLFiltros;
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

  function isMachinePeriodId(value){
    return /^20\d{2}[-_]\d{2}(_{1,2}|[-_])20\d{2}[-_]\d{2}$/.test(text(value));
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
    if(isMachinePeriodId(raw)){
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

  function getAllStudentsRaw(){
    if(typeof repo().listAllStudents === "function"){
      return repo().listAllStudents() || [];
    }
    return repo().listStudentsByPeriod("") || [];
  }

  function getPeriods(){
    var map = {};
    var result = [];
    (repo().listPeriods() || []).forEach(function(period){
      var normalized = normalizador().normalizePeriod(period);
      var label = text(normalized.label || normalized.periodoLabel || normalized.id);
      var id = text(normalized.id || normalized.periodoId || label);
      var key = periodKey(normalized);

      if(!isValidPeriod(label || id) || !key || map[key]){
        return;
      }

      map[key] = true;
      result.push(Object.assign({}, normalized, {
        id:id || key.replace(/\s+/g, "_"),
        label:prettyPeriodLabel(label || id),
        updatedAt:text(normalized.updatedAt)
      }));
    });
    return result;
  }

  function getStudents(periodId, search, estadoMatricula){
    return filtros().filterStudents(getAllStudentsRaw(), {
      periodoId:periodId || "",
      search:search || "",
      estadoMatricula:estadoMatricula == null ? "ACTIVO" : estadoMatricula
    });
  }

  function getStudentsForPeriod(periodId){
    return filtros().filterStudents(getAllStudentsRaw(), {
      periodoId:periodId || "",
      search:"",
      estadoMatricula:""
    });
  }

  function getHistory(){
    return repo().listHistory();
  }

  function getDiagnostics(){
    var diagnostics = repo().diagnostics();
    diagnostics.periodsFiltered = true;
    diagnostics.periodsVisible = getPeriods().length;
    diagnostics.statusCounts = filtros().countByStatus(getAllStudentsRaw());
    diagnostics.baseLocalServices = {
      campos:!!window.BLCampos,
      normalizador:!!window.BLNormalizador,
      filtros:!!window.BLFiltros
    };
    return diagnostics;
  }

  function getCareersCount(students){
    return filtros().uniqueCareers(students || []).length;
  }

  function buildView(periodId, search, estadoMatricula){
    var students = getStudents(periodId, search, estadoMatricula);
    var studentsForPeriod = getStudentsForPeriod(periodId);
    var statusCounts = filtros().countByStatus(studentsForPeriod);
    return {
      periods:getPeriods(),
      students:students,
      allStudentsForPeriod:studentsForPeriod,
      statusCounts:statusCounts,
      totalStudentsPeriod:statusCounts.TOTAL || studentsForPeriod.length,
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
