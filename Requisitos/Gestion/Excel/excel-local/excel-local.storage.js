/* =========================================================
Nombre completo: excel-local.storage.js
Ruta o ubicación: /Requisitos/Gestion/Excel/excel-local/excel-local.storage.js
Función o funciones:
- Persistir snapshot local en localStorage de forma rápida.
- Mantener estructura estable para BaseLocal, Tabla, Ficha y Stats.
Con qué se conecta:
- excel-local.bridge.js
- excel-local.repo.js
========================================================= */
(function(window){
  "use strict";
  function clone(value){try{return JSON.parse(JSON.stringify(value==null?null:value));}catch(e){return value;}}
  function now(){return new Date().toISOString();}
  function emptySnapshot(){return {meta:{app:"Requisitos",module:"ExcelLocal",version:"1.0.0",createdAt:now(),updatedAt:now()},periods:[],students:[],history:[],diagnostics:[]};}
  function key(){return (window.ExcelLocalConfig&&window.ExcelLocalConfig.keys&&window.ExcelLocalConfig.keys.snapshot)||"REQ_EXCEL_LOCAL_V1:snapshot";}
  function readSnapshot(){try{var raw=localStorage.getItem(key());if(!raw)return emptySnapshot();var data=JSON.parse(raw);return normalizeSnapshot(data);}catch(e){console.warn("[ExcelLocalStorage] lectura fallida",e);return emptySnapshot();}}
  function normalizeSnapshot(data){var snap=data&&typeof data==="object"?data:emptySnapshot();snap.meta=snap.meta&&typeof snap.meta==="object"?snap.meta:{};snap.periods=Array.isArray(snap.periods)?snap.periods:[];snap.students=Array.isArray(snap.students)?snap.students:[];snap.history=Array.isArray(snap.history)?snap.history:[];snap.diagnostics=Array.isArray(snap.diagnostics)?snap.diagnostics:[];snap.meta.updatedAt=snap.meta.updatedAt||now();return snap;}
  function writeSnapshot(snapshot){var snap=normalizeSnapshot(snapshot);snap.meta.updatedAt=now();localStorage.setItem(key(),JSON.stringify(snap));return clone(snap);}
  function clear(){var snap=emptySnapshot();writeSnapshot(snap);return snap;}
  window.ExcelLocalStorage={emptySnapshot:emptySnapshot,normalizeSnapshot:normalizeSnapshot,readSnapshot:readSnapshot,writeSnapshot:writeSnapshot,clear:clear,clone:clone};
})(window);
