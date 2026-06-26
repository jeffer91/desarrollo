/* =========================================================
Nombre completo: excel-local.storage.js
Ruta o ubicación: /Requisitos/Gestion/Excel/excel-local/excel-local.storage.js
Función o funciones:
- Persistir snapshot local en localStorage de forma rápida.
- Mantener estructura estable para Base Local, Tabla, Ficha, Stats y Reportes.
- Migrar datos antiguos sin borrar campos nuevos de Firebase.
- Asegurar soporte para estadoMatricula e historialEstadoMatricula.
Con qué se conecta:
- excel-local.bridge.js
- excel-local.repo.js
========================================================= */
(function(window){
  "use strict";

  var VERSION = "1.3.0";

  function clone(value){try{return JSON.parse(JSON.stringify(value==null?null:value));}catch(e){return value;}}
  function now(){return new Date().toISOString();}
  function text(value){return String(value==null?"":value).trim();}

  function emptySnapshot(){
    return {meta:{app:"Requisitos",module:"ExcelLocal",version:VERSION,schemaVersion:3,createdAt:now(),updatedAt:now()},periods:[],students:[],history:[],diagnostics:[]};
  }

  function key(){return (window.ExcelLocalConfig&&window.ExcelLocalConfig.keys&&window.ExcelLocalConfig.keys.snapshot)||"REQ_EXCEL_LOCAL_V1:snapshot";}

  function normalizeStudent(student){
    var s = student && typeof student === "object" ? Object.assign({}, student) : {};
    var cedula = text(s.cedula || s.Cedula || s.CEDULA || s.numeroIdentificacion || s.numeroidentificacion || s.NumeroIdentificacion || s.identificacion || s.Identificacion || s.docId || s._docId);
    if(cedula){
      s.cedula = text(s.cedula || cedula);
      s.numeroIdentificacion = text(s.numeroIdentificacion || s.numeroidentificacion || cedula);
      s._docId = text(s._docId || s.docId || cedula);
      s.docId = text(s.docId || s._docId || cedula);
    }
    s.estadoMatricula = text(s.estadoMatricula || "ACTIVO").toUpperCase() === "RETIRADO" ? "RETIRADO" : "ACTIVO";
    s.historialEstadoMatricula = Array.isArray(s.historialEstadoMatricula) ? s.historialEstadoMatricula : [];
    s.updatedAt = text(s.updatedAt) || now();
    return s;
  }

  function normalizePeriod(period){
    var p = period && typeof period === "object" ? Object.assign({}, period) : {};
    var id = text(p.id || p.periodoId || p.value || p.label);
    p.id = id;
    p.periodoId = text(p.periodoId || id);
    p.label = text(p.label || p.periodoLabel || id);
    p.periodoLabel = text(p.periodoLabel || p.label || id);
    p.updatedAt = text(p.updatedAt || p.creadoEn) || now();
    return p;
  }

  function normalizeSnapshot(data){
    var base = data && typeof data === "object" ? data : emptySnapshot();
    var snap = Object.assign({}, base);
    snap.meta = snap.meta && typeof snap.meta === "object" ? Object.assign({}, snap.meta) : {};
    snap.periods = Array.isArray(snap.periods) ? snap.periods.map(normalizePeriod) : [];
    snap.students = Array.isArray(snap.students) ? snap.students.map(normalizeStudent) : [];
    snap.history = Array.isArray(snap.history) ? snap.history : [];
    snap.diagnostics = Array.isArray(snap.diagnostics) ? snap.diagnostics : [];
    snap.meta.app = snap.meta.app || "Requisitos";
    snap.meta.module = snap.meta.module || "ExcelLocal";
    snap.meta.version = VERSION;
    snap.meta.schemaVersion = 3;
    snap.meta.updatedAt = snap.meta.updatedAt || now();
    snap.meta.totalStudents = snap.students.length;
    snap.meta.totalPeriods = snap.periods.length;
    return snap;
  }

  function readSnapshot(){
    try{
      var raw=localStorage.getItem(key());
      if(!raw)return emptySnapshot();
      var data=JSON.parse(raw);
      return normalizeSnapshot(data);
    }catch(e){
      console.warn("[ExcelLocalStorage] lectura fallida",e);
      return emptySnapshot();
    }
  }

  function writeSnapshot(snapshot){
    var snap=normalizeSnapshot(snapshot);
    snap.meta.updatedAt=now();
    snap.meta.version=VERSION;
    snap.meta.schemaVersion=3;
    localStorage.setItem(key(),JSON.stringify(snap));
    return clone(snap);
  }

  function clear(){var snap=emptySnapshot();writeSnapshot(snap);return snap;}

  window.ExcelLocalStorage={emptySnapshot:emptySnapshot,normalizeSnapshot:normalizeSnapshot,readSnapshot:readSnapshot,writeSnapshot:writeSnapshot,clear:clear,clone:clone};
})(window);
