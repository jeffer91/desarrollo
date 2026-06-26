/* =========================================================
Nombre completo: excel-local.storage.js
Ruta o ubicación: /Requisitos/Gestion/Excel/excel-local/excel-local.storage.js
Función o funciones:
- Persistir snapshot local en localStorage de forma rápida.
- Mantener estructura estable para Base Local, Tabla, Ficha, Stats y Reportes.
- Migrar datos antiguos sin borrar campos nuevos de Firebase.
- Asegurar soporte para estadoMatricula, historialEstadoMatricula y divisiones.
Con qué se conecta:
- excel-local.bridge.js
- excel-local.repo.js
- bl-periodos-canon.service.js
- bl-divisiones.service.js
========================================================= */
(function(window){
  "use strict";

  var VERSION = "1.4.0";

  function clone(value){try{return JSON.parse(JSON.stringify(value==null?null:value));}catch(e){return value;}}
  function now(){return new Date().toISOString();}
  function text(value){return String(value==null?"":value).trim();}
  function norm(value){return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim().toLowerCase();}

  function emptySnapshot(){return {meta:{app:"Requisitos",module:"ExcelLocal",version:VERSION,schemaVersion:4,createdAt:now(),updatedAt:now()},periods:[],students:[],history:[],diagnostics:[]};}
  function key(){return (window.ExcelLocalConfig&&window.ExcelLocalConfig.keys&&window.ExcelLocalConfig.keys.snapshot)||"REQ_EXCEL_LOCAL_V1:snapshot";}

  function normalizeDivisiones(value){
    if(window.BLDivisionesService&&typeof window.BLDivisionesService.normalizeDivisiones==="function")return window.BLDivisionesService.normalizeDivisiones(value);
    if(Array.isArray(value)){
      var seen={};var out=[];
      value.forEach(function(item){var name=text(typeof item==="object"&&item?(item.nombre||item.name||item.label||item.id):item);var k=norm(name);if(!name||k==="sin division"||seen[k])return;seen[k]=true;out.push(name);});
      return out;
    }
    var single=text(value);return single&&norm(single)!=="sin division"?[single]:[];
  }

  function normalizeStudent(student){
    var s = student && typeof student === "object" ? Object.assign({}, student) : {};
    var cedula = text(s.cedula || s.Cedula || s.CEDULA || s.numeroIdentificacion || s.numeroidentificacion || s.NumeroIdentificacion || s.identificacion || s.Identificacion || s.docId || s._docId);
    if(cedula){s.cedula = text(s.cedula || cedula);s.numeroIdentificacion = text(s.numeroIdentificacion || s.numeroidentificacion || cedula);s._docId = text(s._docId || s.docId || cedula);s.docId = text(s.docId || s._docId || cedula);}
    s.estadoMatricula = text(s.estadoMatricula || "ACTIVO").toUpperCase() === "RETIRADO" ? "RETIRADO" : "ACTIVO";
    s.historialEstadoMatricula = Array.isArray(s.historialEstadoMatricula) ? s.historialEstadoMatricula : [];
    s.divisiones = normalizeDivisiones(s.divisiones || s.division || s.Division || s.División);
    if(s.divisiones.length){s.division=s.divisiones[0];}else{delete s.division;}
    s.updatedAt = text(s.updatedAt) || now();
    return s;
  }

  function normalizePeriod(period){
    if(window.BLPeriodosCanon&&typeof window.BLPeriodosCanon.normalizePeriod==="function")return window.BLPeriodosCanon.normalizePeriod(period);
    var p = period && typeof period === "object" ? Object.assign({}, period) : {};
    var id = text(p.id || p.periodoId || p.value || p.label);
    p.id = id;
    p.periodoId = text(p.periodoId || id);
    p.label = text(p.label || p.periodoLabel || id);
    p.periodoLabel = text(p.periodoLabel || p.label || id);
    p.updatedAt = text(p.updatedAt || p.creadoEn) || now();
    return p;
  }

  function dedupePeriods(periods){
    if(window.BLPeriodosCanon&&typeof window.BLPeriodosCanon.dedupe==="function")return window.BLPeriodosCanon.dedupe(periods||[]);
    var map={};var out=[];
    (periods||[]).forEach(function(period){var p=normalizePeriod(period);var k=norm(p.label||p.id);if(!k||map[k])return;map[k]=true;out.push(p);});
    return out;
  }

  function normalizeSnapshot(data){
    if(window.BLPeriodosCanon&&typeof window.BLPeriodosCanon.canonicalizeSnapshot==="function")data=window.BLPeriodosCanon.canonicalizeSnapshot(data);
    var base = data && typeof data === "object" ? data : emptySnapshot();
    var snap = Object.assign({}, base);
    snap.meta = snap.meta && typeof snap.meta === "object" ? Object.assign({}, snap.meta) : {};
    snap.periods = dedupePeriods(Array.isArray(snap.periods) ? snap.periods : []);
    snap.students = Array.isArray(snap.students) ? snap.students.map(normalizeStudent) : [];
    snap.history = Array.isArray(snap.history) ? snap.history : [];
    snap.diagnostics = Array.isArray(snap.diagnostics) ? snap.diagnostics : [];
    snap.meta.app = snap.meta.app || "Requisitos";
    snap.meta.module = snap.meta.module || "ExcelLocal";
    snap.meta.version = VERSION;
    snap.meta.schemaVersion = 4;
    snap.meta.updatedAt = snap.meta.updatedAt || now();
    snap.meta.totalStudents = snap.students.length;
    snap.meta.totalPeriods = snap.periods.length;
    return snap;
  }

  function readSnapshot(){try{var raw=localStorage.getItem(key());if(!raw)return emptySnapshot();return normalizeSnapshot(JSON.parse(raw));}catch(e){console.warn("[ExcelLocalStorage] lectura fallida",e);return emptySnapshot();}}
  function writeSnapshot(snapshot){var snap=normalizeSnapshot(snapshot);snap.meta.updatedAt=now();snap.meta.version=VERSION;snap.meta.schemaVersion=4;localStorage.setItem(key(),JSON.stringify(snap));return clone(snap);}
  function clear(){var snap=emptySnapshot();writeSnapshot(snap);return snap;}

  window.ExcelLocalStorage={emptySnapshot:emptySnapshot,normalizeSnapshot:normalizeSnapshot,readSnapshot:readSnapshot,writeSnapshot:writeSnapshot,clear:clear,clone:clone};
})(window);
