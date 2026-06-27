/* =========================================================
Nombre completo: bl2-legacy-adapter.js
Ruta o ubicación: /Requisitos/BaseLocal2/bl2-legacy-adapter.js
Función o funciones:
- Adaptar la Base Local actual V1 a la API BL2 sin romper pantallas existentes.
- Leer snapshot desde MAQ_BASELOCAL_SESSION, ExcelLocalStorage o ExcelLocalRepo.
- Entregar consultas simples de períodos, estudiantes, búsqueda y resumen.
- Servir como puente temporal hasta que SQLite/IndexedDB quede implementado.
Con qué se conecta:
- bl2-config.js
- bl2-api.js
- maq-baselocal-session.js
- excel-local.storage.js
- excel-local.repo.js
========================================================= */
(function(window){
  "use strict";

  var cache = {snapshot:null, readAt:0, signature:""};
  var CACHE_MS = 800;

  function now(){return new Date().toISOString();}
  function text(value){return String(value == null ? "" : value).trim();}
  function norm(value){return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();}
  function clone(value){try{return JSON.parse(JSON.stringify(value == null ? null : value));}catch(error){return value;}}

  function emptySnapshot(){return {meta:{app:"Requisitos", module:"BL2LegacyAdapter", source:"empty", updatedAt:now(), totalPeriods:0, totalStudents:0}, periods:[], students:[], history:[], diagnostics:[]};}

  function normalizeSnapshot(snapshot){
    var snap = snapshot && typeof snapshot === "object" ? snapshot : emptySnapshot();
    snap.meta = snap.meta && typeof snap.meta === "object" ? snap.meta : {};
    snap.periods = Array.isArray(snap.periods) ? snap.periods : [];
    snap.students = Array.isArray(snap.students) ? snap.students : [];
    snap.history = Array.isArray(snap.history) ? snap.history : [];
    snap.diagnostics = Array.isArray(snap.diagnostics) ? snap.diagnostics : [];
    snap.meta.totalPeriods = snap.periods.length;
    snap.meta.totalStudents = snap.students.length;
    snap.meta.source = snap.meta.source || "legacy";
    return snap;
  }

  function sessionCandidates(){
    var list = [];
    try{if(window.MAQ_BASELOCAL_SESSION){list.push(window.MAQ_BASELOCAL_SESSION);}}catch(error){}
    try{if(window.parent && window.parent !== window && window.parent.MAQ_BASELOCAL_SESSION){list.push(window.parent.MAQ_BASELOCAL_SESSION);}}catch(error){}
    try{if(window.top && window.top !== window && window.top.MAQ_BASELOCAL_SESSION){list.push(window.top.MAQ_BASELOCAL_SESSION);}}catch(error){}
    return list;
  }

  function fromSession(){
    var list = sessionCandidates();
    for(var i = 0; i < list.length; i += 1){
      try{
        if(list[i] && typeof list[i].getSnapshot === "function"){
          var snap = list[i].getSnapshot({clone:false});
          if(snap && typeof snap === "object"){return normalizeSnapshot(snap);}
        }
      }catch(error){}
    }
    return null;
  }

  function fromStorage(){
    try{if(window.ExcelLocalStorage && typeof window.ExcelLocalStorage.readSnapshot === "function"){return normalizeSnapshot(window.ExcelLocalStorage.readSnapshot());}}catch(error){}
    try{if(window.parent && window.parent !== window && window.parent.ExcelLocalStorage && typeof window.parent.ExcelLocalStorage.readSnapshot === "function"){return normalizeSnapshot(window.parent.ExcelLocalStorage.readSnapshot());}}catch(error){}
    return null;
  }

  function fromRepo(){
    try{if(window.ExcelLocalRepo && typeof window.ExcelLocalRepo.getSnapshot === "function"){return normalizeSnapshot(window.ExcelLocalRepo.getSnapshot());}}catch(error){}
    try{if(window.parent && window.parent !== window && window.parent.ExcelLocalRepo && typeof window.parent.ExcelLocalRepo.getSnapshot === "function"){return normalizeSnapshot(window.parent.ExcelLocalRepo.getSnapshot());}}catch(error){}
    return null;
  }

  function signatureOf(snapshot){
    snapshot = snapshot || {};
    var students = Array.isArray(snapshot.students) ? snapshot.students : [];
    var periods = Array.isArray(snapshot.periods) ? snapshot.periods : [];
    var meta = snapshot.meta || {};
    var first = students[0] || {};
    var last = students[students.length - 1] || {};
    return [meta.updatedAt || meta.pulledAt || "", periods.length, students.length, first.cedula || first.numeroIdentificacion || first._docId || "", last.cedula || last.numeroIdentificacion || last._docId || ""].join("|");
  }

  function readSnapshot(options){
    options = options || {};
    if(options.force !== true && cache.snapshot && Date.now() - cache.readAt < CACHE_MS){return options.clone === false ? cache.snapshot : clone(cache.snapshot);}
    var snap = fromSession() || fromStorage() || fromRepo() || emptySnapshot();
    snap = normalizeSnapshot(snap);
    cache.snapshot = snap;
    cache.readAt = Date.now();
    cache.signature = signatureOf(snap);
    return options.clone === false ? snap : clone(snap);
  }

  function invalidate(){cache.snapshot=null;cache.readAt=0;cache.signature="";}
  function samePeriod(a,b){if(!text(b)){return true;}try{if(window.BLPeriodosCanon && typeof window.BLPeriodosCanon.samePeriod === "function"){return window.BLPeriodosCanon.samePeriod(a,b);}}catch(error){}return text(a) === text(b) || norm(a) === norm(b);}
  function estadoOf(row){var raw = norm(row && (row.estadoMatricula || row.EstadoMatricula || row.estado || row.Estado || "ACTIVO"));return raw === "retirado" ? "RETIRADO" : "ACTIVO";}
  function cedulaOf(row){return text(row && (row.cedula || row.Cedula || row.CEDULA || row.numeroIdentificacion || row.numeroidentificacion || row.NumeroIdentificacion || row.identificacion || row.Identificacion || row._docId || row.docId || row.id));}
  function nombreOf(row){return text(row && (row.nombres || row.Nombres || row.nombre || row.Nombre || row.estudiante || row.Estudiante));}
  function carreraOf(row){return text(row && (row.nombrecarrera || row.nombreCarrera || row.NombreCarrera || row.carrera || row.Carrera || row.programa || row.Programa));}
  function periodoOf(row){return text(row && (row.periodoId || row.ultimoPeriodoId || row.periodoLabel || row.periodo || row.Periodo));}
  function divisionOf(row){var divs = Array.isArray(row && row.divisiones) ? row.divisiones : [];return text(divs[0] || row.division || row.Division || row.División || "Sin división");}
  function correoOf(row){return text(row && (row.CorreoPersonal || row.correoPersonal || row.CorreoInstitucional || row.correoInstitucional || row.email || row.correo));}
  function celularOf(row){return text(row && (row.Celular || row.celular || row.Telefono || row.telefono));}

  function studentSearchText(row){return norm([cedulaOf(row), nombreOf(row), carreraOf(row), periodoOf(row), divisionOf(row), correoOf(row), celularOf(row), estadoOf(row)].join(" "));}

  function normalizeStudentView(row){
    var copy = Object.assign({}, row || {});
    copy._bl2Id = cedulaOf(copy) || text(copy._docId || copy.docId || copy.id);
    copy._bl2Search = studentSearchText(copy);
    copy._bl2EstadoMatricula = estadoOf(copy);
    copy._bl2Nombre = nombreOf(copy);
    copy._bl2Carrera = carreraOf(copy);
    copy._bl2Periodo = periodoOf(copy);
    copy._bl2Division = divisionOf(copy);
    return copy;
  }

  function listPeriods(){
    return readSnapshot({clone:false}).periods.slice();
  }

  function listStudents(options){
    options = options || {};
    var snap = readSnapshot({clone:false});
    var search = norm(options.search || options.q || "");
    var periodId = text(options.periodoId || options.periodId || "");
    var division = text(options.division || "");
    var estado = options.matricula == null ? (options.estadoMatricula == null ? "ACTIVO" : text(options.estadoMatricula)) : text(options.matricula);
    var offset = Math.max(0, Number(options.offset || 0) || 0);
    var limit = Math.max(0, Number(options.limit || 0) || 0);
    var rows = (snap.students || []).map(normalizeStudentView).filter(function(row){
      if(estado && row._bl2EstadoMatricula !== estado){return false;}
      if(periodId && !samePeriod(row.periodoId || row.ultimoPeriodoId || row.periodoLabel, periodId)){return false;}
      if(division && norm(row._bl2Division) !== norm(division)){return false;}
      if(search && row._bl2Search.indexOf(search) < 0){return false;}
      return true;
    });
    var total = rows.length;
    if(limit){rows = rows.slice(offset, offset + limit);}
    return {rows:rows, total:total, offset:offset, limit:limit || total};
  }

  function searchStudents(query, options){
    options = Object.assign({}, options || {}, {search:query || (options && options.search) || ""});
    return listStudents(options);
  }

  function getStudentById(id, options){
    var wanted = text(id);
    if(!wanted){return null;}
    var result = listStudents(Object.assign({}, options || {}, {estadoMatricula:"", matricula:"", limit:0}));
    return result.rows.find(function(row){return text(row._bl2Id) === wanted || cedulaOf(row) === wanted || text(row._docId || row.docId || row.id) === wanted;}) || null;
  }

  function resumen(options){
    options = options || {};
    var rows = listStudents(Object.assign({}, options, {matricula:"", estadoMatricula:"", limit:0})).rows;
    var out = {total:0, activos:0, retirados:0, carreras:{}, periodos:{}, updatedAt:now()};
    rows.forEach(function(row){
      out.total += 1;
      if(row._bl2EstadoMatricula === "RETIRADO"){out.retirados += 1;}else{out.activos += 1;}
      var carrera = carreraOf(row) || "SIN CARRERA";
      var periodo = periodoOf(row) || "SIN PERIODO";
      out.carreras[carrera] = (out.carreras[carrera] || 0) + 1;
      out.periodos[periodo] = (out.periodos[periodo] || 0) + 1;
    });
    return out;
  }

  function status(){
    var snap = readSnapshot({clone:false});
    return {ok:true, mode:"legacy_bridge", source:snap.meta && snap.meta.source || "legacy", periods:snap.periods.length, students:snap.students.length, history:snap.history.length, signature:cache.signature, updatedAt:now()};
  }

  window.BL2LegacyAdapter = {version:"2.0.0-alpha.1",readSnapshot:readSnapshot,invalidate:invalidate,listPeriods:listPeriods,listStudents:listStudents,searchStudents:searchStudents,getStudentById:getStudentById,resumen:resumen,status:status,helpers:{cedulaOf:cedulaOf,nombreOf:nombreOf,carreraOf:carreraOf,periodoOf:periodoOf,divisionOf:divisionOf,estadoOf:estadoOf}};
})(window);
