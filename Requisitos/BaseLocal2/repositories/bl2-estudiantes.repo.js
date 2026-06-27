/* =========================================================
Nombre completo: bl2-estudiantes.repo.js
Ruta o ubicación: /Requisitos/BaseLocal2/repositories/bl2-estudiantes.repo.js
Función o funciones:
- Entregar estudiantes a Ficha, Tabla y módulos futuros usando BL2.
- Mantener compatibilidad con Base Local V1 mediante el puente BL2 actual.
- Exponer búsqueda, paginación, obtención por cédula, períodos y divisiones.
- Usar resultados limitados para que Ficha no cargue más de lo necesario.
Con qué se conecta:
- bl2-api.js
- services/bl2-search.service.js
- Ficha/ficha.core.js
========================================================= */
(function(window){
  "use strict";

  var DEFAULT_LIMIT = 120;
  var DIVISION_LIMIT = 5000;

  function parentValue(name){try{return window.parent && window.parent !== window ? window.parent[name] : null;}catch(error){return null;}}
  function api(){return window.BL2 || parentValue("BL2") || null;}
  function searchService(){return window.BL2SearchService || parentValue("BL2SearchService") || null;}
  function text(value){return String(value == null ? "" : value).trim();}
  function norm(value){return searchService() && searchService().normalize ? searchService().normalize(value) : text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();}

  function estadoOf(row){
    var raw = norm(row && (row._bl2EstadoMatricula || row.estadoMatricula || row.EstadoMatricula || row.estado || row.Estado || "ACTIVO"));
    return raw === "retirado" ? "RETIRADO" : "ACTIVO";
  }

  function cedulaOf(row){return text(row && (row._bl2Id || row.cedula || row.Cedula || row.CEDULA || row.numeroIdentificacion || row.numeroidentificacion || row.NumeroIdentificacion || row.identificacion || row.Identificacion || row._docId || row.docId || row.id));}
  function nombreOf(row){return text(row && (row._bl2Nombre || row.nombres || row.Nombres || row.nombre || row.Nombre || row.estudiante || row.Estudiante));}
  function carreraOf(row){return text(row && (row._bl2Carrera || row.nombreCarrera || row.nombrecarrera || row.NombreCarrera || row.carrera || row.Carrera));}
  function periodoOf(row){return text(row && (row._bl2Periodo || row.periodoId || row.ultimoPeriodoId || row.periodoLabel || row.periodo || row.Periodo));}
  function divisionOf(row){var divs = Array.isArray(row && row.divisiones) ? row.divisiones : [];return text(row && (row._bl2Division || divs[0] || row.division || row.Division || row.División || "Sin división"));}

  function samePeriod(a,b){
    if(!text(b)){return true;}
    try{if(window.BLPeriodosCanon && typeof window.BLPeriodosCanon.samePeriod === "function"){return window.BLPeriodosCanon.samePeriod(a,b);}}catch(error){}
    return text(a) === text(b) || norm(a) === norm(b);
  }

  function normalizeRow(row){
    var copy = Object.assign({}, row || {});
    copy._bl2Id = cedulaOf(copy);
    copy._bl2Nombre = nombreOf(copy);
    copy._bl2Carrera = carreraOf(copy);
    copy._bl2Periodo = periodoOf(copy);
    copy._bl2Division = divisionOf(copy);
    copy._bl2EstadoMatricula = estadoOf(copy);
    copy._bl2Search = searchService() && searchService().studentText ? searchService().studentText(copy) : norm([copy._bl2Id, copy._bl2Nombre, copy._bl2Carrera, copy._bl2Periodo, copy._bl2Division, copy._bl2EstadoMatricula].join(" "));
    return copy;
  }

  function listPeriods(){
    var bl2 = api();
    if(bl2 && bl2.periodos && typeof bl2.periodos.listar === "function"){
      return bl2.periodos.listar() || [];
    }
    return [];
  }

  function query(options){
    options = options || {};
    var bl2 = api();
    if(!bl2 || !bl2.estudiantes){return {rows:[], total:0, offset:0, limit:0, source:"sin_bl2"};}
    var payload = {
      search:options.search || options.q || "",
      q:options.search || options.q || "",
      periodId:options.periodId || options.periodoId || "",
      periodoId:options.periodoId || options.periodId || "",
      division:options.division || "",
      matricula:options.matricula == null ? "ACTIVO" : options.matricula,
      estadoMatricula:options.estadoMatricula == null ? (options.matricula == null ? "ACTIVO" : options.matricula) : options.estadoMatricula,
      offset:Math.max(0, Number(options.offset || 0) || 0),
      limit:Math.max(0, Number(options.limit == null ? DEFAULT_LIMIT : options.limit) || 0)
    };
    var result = typeof bl2.estudiantes.buscar === "function" ? bl2.estudiantes.buscar(payload) : bl2.estudiantes.listarPagina(payload);
    result = result || {rows:[], total:0};
    var rows = (Array.isArray(result.rows) ? result.rows : []).map(normalizeRow);
    return {rows:rows, total:Number(result.total || rows.length) || rows.length, offset:payload.offset, limit:payload.limit || rows.length, source:"bl2"};
  }

  function listarPagina(options){return query(options);}
  function buscar(options){return query(options);}

  function obtenerPorCedula(cedula, options){
    var wanted = text(cedula);
    if(!wanted){return null;}
    var bl2 = api();
    if(bl2 && bl2.estudiantes && typeof bl2.estudiantes.obtenerPorCedula === "function"){
      var direct = bl2.estudiantes.obtenerPorCedula(wanted, options || {});
      if(direct){return normalizeRow(direct);}
    }
    var rows = query(Object.assign({}, options || {}, {search:wanted, matricula:"", estadoMatricula:"", limit:20})).rows;
    return rows.find(function(row){return cedulaOf(row) === wanted;}) || null;
  }

  function listForDivisions(options){
    var opts = Object.assign({}, options || {}, {search:"", limit:DIVISION_LIMIT});
    return query(opts).rows;
  }

  function listDivisions(options){
    var rows = listForDivisions(options || {});
    var map = Object.create(null);
    rows.forEach(function(row){map[divisionOf(row) || "Sin división"] = true;});
    return Object.keys(map).sort(function(a,b){return a.localeCompare(b,"es");});
  }

  function status(){
    var bl2 = api();
    return {ok:!!bl2, mode:"bl2_estudiantes_repo", bl2Status:bl2 && typeof bl2.status === "function" ? bl2.status({deep:false}) : null, updatedAt:new Date().toISOString()};
  }

  window.BL2EstudiantesRepo = {version:"2.0.0-alpha.1",listPeriods:listPeriods,listarPeriodos:listPeriods,buscar:buscar,listarPagina:listarPagina,obtenerPorCedula:obtenerPorCedula,listDivisions:listDivisions,listForDivisions:listForDivisions,normalizeRow:normalizeRow,status:status,helpers:{cedulaOf:cedulaOf,nombreOf:nombreOf,carreraOf:carreraOf,periodoOf:periodoOf,divisionOf:divisionOf,estadoOf:estadoOf,samePeriod:samePeriod}};
})(window);
