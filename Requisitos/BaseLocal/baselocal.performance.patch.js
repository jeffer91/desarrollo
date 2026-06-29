/* =========================================================
Nombre completo: baselocal.performance.patch.js
Ruta o ubicación: /Requisitos/BaseLocal/baselocal.performance.patch.js
Función:
- Evitar cuelgues de Base Local al abrir estudiantes.
- Usar BL2EstudiantesRepo y BL2PaginationService para página real.
- Inferir períodos desde estudiantes si Firestore periodos viene vacío.
- Cambiar pull/sync manual a bajada segura por lotes y render diferido.
========================================================= */
(function(window, document){
  "use strict";

  var PATCH_VERSION = "1.0.0";
  var DEFAULT_PAGE_SIZE = 100;
  var BATCH_SIZE = 250;

  function text(value){return String(value == null ? "" : value).trim();}
  function norm(value){return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").toLowerCase();}
  function clone(value){try{return JSON.parse(JSON.stringify(value == null ? null : value));}catch(error){return value;}}
  function now(){return new Date().toISOString();}
  function delay(ms){return new Promise(function(resolve){setTimeout(resolve, ms || 0);});}

  function status(message){
    try{
      var box = document.getElementById("bl-status");
      if(box){box.textContent = message;box.className = "bl-status bl-status-info";}
    }catch(error){}
  }

  function getStorage(){if(!window.ExcelLocalStorage){throw new Error("ExcelLocalStorage no disponible.");}return window.ExcelLocalStorage;}
  function getStudentsService(){if(!window.BLEstudiantesService){throw new Error("BLEstudiantesService no disponible.");}return window.BLEstudiantesService;}
  function getPeriodsService(){if(!window.BLPeriodosService){throw new Error("BLPeriodosService no disponible.");}return window.BLPeriodosService;}

  function samePeriod(a,b){
    if(!text(b)){return true;}
    try{if(window.BLPeriodosCanon && typeof window.BLPeriodosCanon.samePeriod === "function"){return window.BLPeriodosCanon.samePeriod(a,b);}}catch(error){}
    return norm(a) === norm(b);
  }

  function field(row, names){
    row = row || {};
    for(var i=0;i<names.length;i+=1){
      var value = row[names[i]];
      if(text(value)){return value;}
    }
    return "";
  }

  function periodValue(row){return field(row,["periodoId","periodoLabel","periodo","Periodo","ultimoPeriodoId","_bl2PeriodoId","_bl2Periodo"]);}
  function studentStatus(row){var value = field(row,["estadoMatricula","_bl2EstadoMatricula"]);return norm(value)==="retirado" ? "RETIRADO" : "ACTIVO";}
  function divisionValue(row){var divs = Array.isArray(row && row.divisiones) ? row.divisiones : [];return text(divs[0] || row.division || row.Division || row["División"] || row._bl2Division || "Sin división");}
  function searchText(row){return norm([field(row,["cedula","numeroIdentificacion","_bl2Id","id"]),field(row,["nombres","Nombres","nombre","_bl2Nombre"]),field(row,["nombrecarrera","nombreCarrera","NombreCarrera","carrera","_bl2Carrera"]),field(row,["sede","Sede"]),periodValue(row),divisionValue(row),studentStatus(row)].join(" "));}

  function normalizePeriod(raw){
    if(window.BLPeriodosCanon && typeof window.BLPeriodosCanon.normalizePeriod === "function"){return window.BLPeriodosCanon.normalizePeriod(raw);}
    if(window.BLNormalizador && typeof window.BLNormalizador.normalizePeriod === "function"){return window.BLNormalizador.normalizePeriod(raw);}
    var label = text(raw && (raw.label || raw.periodoLabel || raw.periodo || raw.id || raw));
    return {id:text(raw && (raw.id || raw.periodoId)) || label, label:label};
  }

  function dedupePeriods(periods){
    if(window.BLPeriodosCanon && typeof window.BLPeriodosCanon.dedupe === "function"){return window.BLPeriodosCanon.dedupe(periods || []);}
    var map = Object.create(null);
    var out = [];
    (periods || []).forEach(function(period){
      var p = normalizePeriod(period);
      var key = norm(p.id || p.label);
      if(!key || map[key]){return;}
      map[key] = true;
      out.push(p);
    });
    return out;
  }

  function inferPeriodsFromStudents(students){
    var map = Object.create(null);
    var out = [];
    (Array.isArray(students) ? students : []).forEach(function(student){
      var raw = periodValue(student);
      if(!text(raw)){return;}
      var p = normalizePeriod({id:raw, periodoId:raw, label:field(student,["periodoLabel","periodo","Periodo","_bl2Periodo"]) || raw, source:"students_fallback"});
      var key = norm(p.id || p.label);
      if(!key || map[key]){return;}
      map[key] = true;
      out.push(p);
    });
    return dedupePeriods(out);
  }

  function snapshot(){
    var snap = null;
    try{snap = getStorage().readSnapshot();}catch(error){}
    snap = snap && typeof snap === "object" ? snap : {meta:{},periods:[],students:[],history:[],diagnostics:[]};
    snap.meta = snap.meta && typeof snap.meta === "object" ? snap.meta : {};
    snap.periods = Array.isArray(snap.periods) ? snap.periods : [];
    snap.students = Array.isArray(snap.students) ? snap.students : [];
    snap.history = Array.isArray(snap.history) ? snap.history : [];
    snap.diagnostics = Array.isArray(snap.diagnostics) ? snap.diagnostics : [];
    if(!snap.periods.length && snap.students.length){
      snap.periods = inferPeriodsFromStudents(snap.students);
      snap.meta.periodsInferredFromStudents = true;
      snap.meta.totalPeriods = snap.periods.length;
    }
    return snap;
  }

  function localFilterPage(students, options){
    options = options || {};
    var pageSize = Math.max(25, Math.min(500, Number(options.pageSize || DEFAULT_PAGE_SIZE) || DEFAULT_PAGE_SIZE));
    var page = Math.max(1, Number(options.page || 1) || 1);
    var offset = (page - 1) * pageSize;
    var wantedPeriod = text(options.periodId || "");
    var wantedSearch = norm(options.search || "");
    var wantedStatus = options.estadoMatricula == null ? "ACTIVO" : text(options.estadoMatricula);
    var wantedDivision = norm(options.division || "");
    var total = 0;
    var rows = [];

    (Array.isArray(students) ? students : []).forEach(function(row){
      if(wantedPeriod && !samePeriod(periodValue(row), wantedPeriod)){return;}
      if(wantedStatus && studentStatus(row) !== wantedStatus){return;}
      if(wantedDivision && norm(divisionValue(row)) !== wantedDivision){return;}
      if(wantedSearch && searchText(row).indexOf(wantedSearch) < 0){return;}
      if(total >= offset && rows.length < pageSize){rows.push(row);}
      total += 1;
    });

    var pages = Math.max(1, Math.ceil(total / pageSize));
    page = Math.max(1, Math.min(page, pages));
    return {rows:rows,total:total,pagination:{page:page,pageSize:pageSize,offset:offset,total:total,pages:pages,hasPrev:page>1,hasNext:page<pages,from:total?offset+1:0,to:Math.min(offset+pageSize,total),label:total?(offset+1)+"-"+Math.min(offset+pageSize,total)+" de "+total:"0 registros"}};
  }

  function queryStudents(options){
    options = options || {};
    var repo = window.BL2EstudiantesRepo;
    if(repo && typeof repo.listarPagina === "function"){
      try{
        var result = repo.listarPagina({periodId:options.periodId || "", search:options.search || "", estadoMatricula:options.estadoMatricula, matricula:options.estadoMatricula, division:options.division || "", page:options.page, pageSize:options.pageSize, offset:((options.page || 1)-1)*(options.pageSize || DEFAULT_PAGE_SIZE), limit:options.pageSize || DEFAULT_PAGE_SIZE});
        var rows = Array.isArray(result && result.rows) ? result.rows : [];
        var total = Number(result && result.total) || rows.length;
        var pager = window.BL2PaginationService && typeof window.BL2PaginationService.build === "function" ? window.BL2PaginationService.build(total,{page:options.page,pageSize:options.pageSize}) : localFilterPage(rows,{page:options.page,pageSize:options.pageSize}).pagination;
        return {rows:rows,total:total,pagination:pager,source:"BL2EstudiantesRepo"};
      }catch(error){console.warn("[BaseLocalPerformance] BL2 paginado falló, se usa fallback local", error);}
    }
    var snap = snapshot();
    var fallback = localFilterPage(snap.students, options);
    fallback.source = "local_fallback_page";
    return fallback;
  }

  function countStatusLight(students, options){
    options = options || {};
    var counts = {ACTIVO:0,RETIRADO:0,TOTAL:0};
    var wantedPeriod = text(options.periodId || "");
    var wantedDivision = norm(options.division || "");
    (Array.isArray(students) ? students : []).forEach(function(row){
      if(wantedPeriod && !samePeriod(periodValue(row), wantedPeriod)){return;}
      if(wantedDivision && norm(divisionValue(row)) !== wantedDivision){return;}
      var st = studentStatus(row);
      counts[st] = (counts[st] || 0) + 1;
      counts.TOTAL += 1;
    });
    return counts;
  }

  function listDivisionsLight(students, options){
    var wantedPeriod = text(options && options.periodId || "");
    var map = Object.create(null);
    (Array.isArray(students) ? students : []).forEach(function(row){
      if(wantedPeriod && !samePeriod(periodValue(row), wantedPeriod)){return;}
      map[divisionValue(row) || "Sin división"] = true;
    });
    return Object.keys(map).sort(function(a,b){return a.localeCompare(b,"es");});
  }

  function patchBaseLocalAPI(){
    if(!window.BaseLocalAPI || window.BaseLocalAPI.__performancePatched){return false;}
    var api = window.BaseLocalAPI;
    var originalBuildView = api.buildView;
    var originalGetPeriods = api.getPeriods;

    api.getPeriods = function(){
      var periods = [];
      try{periods = typeof originalGetPeriods === "function" ? originalGetPeriods() : [];}catch(error){periods = [];}
      if(!periods.length){periods = inferPeriodsFromStudents(snapshot().students);}
      return periods;
    };

    api.buildView = function(periodId, search, estadoMatricula, options){
      options = options || {};
      if(options.pageOnly === true || options.useBL2 === true){
        var snap = snapshot();
        var periods = api.getPeriods();
        var studentsPage = options.skipStudents === true ? {rows:[],total:0,pagination:localFilterPage([],options).pagination,source:"skip_students"} : queryStudents({periodId:periodId, search:search, estadoMatricula:estadoMatricula, division:options.division, page:options.page || 1, pageSize:options.pageSize || DEFAULT_PAGE_SIZE});
        var statusCounts = options.includeStatusCounts === true ? countStatusLight(snap.students,{periodId:periodId,division:options.division}) : {ACTIVO:0,RETIRADO:0,TOTAL:studentsPage.total || 0};
        return {periods:periods,students:studentsPage.rows,studentsTotal:studentsPage.total,pagination:studentsPage.pagination,statusCounts:statusCounts,totalStudentsPeriod:statusCounts.TOTAL || studentsPage.total || 0,history:options.includeHistory === true ? snap.history.slice().reverse().slice(0,80) : [],historyCount:snap.history.length,diagnostics:options.includeDiagnostics === true ? {ok:true,lazy:false,performancePatch:PATCH_VERSION,students:snap.students.length,periods:periods.length,meta:snap.meta} : {ok:true,lazy:true},careersCount:0,divisions:options.includeDivisions === true ? listDivisionsLight(snap.students,{periodId:periodId}) : [],divisionsSummary:{},snapshot:options.includeSnapshot === true ? snap : null,source:studentsPage.source};
      }
      return originalBuildView(periodId, search, estadoMatricula, options);
    };

    api.__performancePatched = true;
    return true;
  }

  function getFirebaseDb(){
    if(!window.firebase || typeof window.firebase.firestore !== "function"){throw new Error("Firebase no está cargado.");}
    try{if(!window.firebase.apps.length && typeof firebaseConfig !== "undefined" && firebaseConfig){window.firebase.initializeApp(firebaseConfig);}}catch(error){}
    if(window.db && typeof window.db.collection === "function"){return window.db;}
    try{if(typeof db !== "undefined" && db && typeof db.collection === "function"){return db;}}catch(error){}
    return window.firebase.firestore();
  }

  async function readStudentsByBatches(db){
    if(getStudentsService() && typeof getStudentsService().readInBatches === "function"){
      return getStudentsService().readInBatches(db,{batchSize:BATCH_SIZE,onBatch:function(info){status("Bajando estudiantes por lotes: " + info.total + "...");}});
    }
    var snap = await db.collection("Estudiantes").get();
    var rows = [];
    if(snap && typeof snap.forEach === "function"){
      var i = 0;
      snap.forEach(function(doc){rows.push(getStudentsService().normalizeStudent(Object.assign({}, typeof doc.data === "function" ? doc.data() : {}, {_firebaseId:doc.id}), i, {source:"firebase_batch_fallback"}));i += 1;});
    }
    return getStudentsService().dedupeByCedula(rows);
  }

  function writeSnapshotSafe(snapshotData, action){
    var clean = clone(snapshotData) || {};
    clean.meta = Object.assign({}, clean.meta || {}, {updatedAt:now(), totalStudents:(clean.students || []).length, totalPeriods:(clean.periods || []).length, performancePatch:PATCH_VERSION});
    clean.history = Array.isArray(clean.history) ? clean.history : [];
    clean.history.unshift({id:"bl_safe_" + (action || "pull") + "_" + Date.now(), action:action || "safePull", periodoId:"TODOS", periodoLabel:"Todos los períodos", fileName:"Firebase", totalRows:(clean.students || []).length, totalPeriods:(clean.periods || []).length, createdAt:now()});
    getStorage().writeSnapshot(clean);
    try{if(window.RequisitosBL && typeof window.RequisitosBL.rebuildSnapshotToCollections === "function"){window.RequisitosBL.rebuildSnapshotToCollections({force:true,silent:true});}}catch(error){}
    try{window.dispatchEvent(new CustomEvent("baselocal:firebase-pull-finished",{detail:{ok:true,action:action,totalStudents:clean.students.length,totalPeriods:clean.periods.length}}));}catch(error){}
    return clean;
  }

  async function safePull(action){
    var db = getFirebaseDb();
    status("Bajando períodos desde Firebase...");
    var periods = await getPeriodsService().read(db);
    await delay(30);
    status("Bajando estudiantes desde Firebase por lotes seguros...");
    var students = await readStudentsByBatches(db);
    if(!periods.length && students.length){periods = inferPeriodsFromStudents(students);}
    var written = writeSnapshotSafe({meta:{source:"firebase_safe",pulledAt:now()},periods:periods,students:students,history:[],diagnostics:[{ok:true,source:"firebase_safe",totalStudents:students.length,totalPeriods:periods.length,createdAt:now()}]}, action || "safePull");
    return {ok:true,mode:action || "safePull",safe:true,totalStudents:written.students.length,totalPeriods:written.periods.length,message:"Base Local actualizada con bajada segura por lotes."};
  }

  function patchFirebase(){
    if(!window.BaseLocalFirebase || window.BaseLocalFirebase.__performancePatched){return false;}
    var originalSync = window.BaseLocalFirebase.sync;
    var originalPull = window.BaseLocalFirebase.pull;
    window.BaseLocalFirebase.pull = function(){return safePull("safePull").catch(function(error){console.warn("[BaseLocalPerformance] safePull falló; se usa pull original", error);return originalPull.apply(window.BaseLocalFirebase, arguments);});};
    window.BaseLocalFirebase.sync = function(options){
      options = options || {};
      if(options.forceFull === true && typeof originalSync === "function"){return originalSync.apply(window.BaseLocalFirebase, arguments);}
      return safePull("safeSync");
    };
    window.BaseLocalFirebase.__performancePatched = true;
    return true;
  }

  function runPatch(){
    var api = patchBaseLocalAPI();
    var fb = patchFirebase();
    window.BaseLocalPerformancePatch = {version:PATCH_VERSION,ok:true,apiPatched:api,firebasePatched:fb,inferPeriodsFromStudents:inferPeriodsFromStudents,queryStudents:queryStudents,runPatch:runPatch};
    return window.BaseLocalPerformancePatch;
  }

  runPatch();
})(window, document);
