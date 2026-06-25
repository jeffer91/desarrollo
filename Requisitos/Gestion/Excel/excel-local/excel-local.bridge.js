/* =========================================================
Nombre completo: excel-local.bridge.js
Ruta o ubicación: /Requisitos/Gestion/Excel/excel-local/excel-local.bridge.js
Función o funciones:
- Crear puente local compatible con otras pantallas.
- Exponer getDb(), getSnapshot() y un shim de sincronización seguro.
Con qué se conecta:
- excel-local.config.js
- excel-local.storage.js
- excel-local.repo.js
========================================================= */
(function(window){
  "use strict";
  function storage(){if(!window.ExcelLocalStorage)throw new Error("ExcelLocalStorage no disponible.");return window.ExcelLocalStorage;}
  function ensureReady(){var s=storage().readSnapshot();storage().writeSnapshot(s);return true;}
  function getSnapshot(){ensureReady();return storage().readSnapshot();}
  function getDb(){return {type:"localStorage",name:"ExcelLocal",snapshot:getSnapshot(),updatedAt:new Date().toISOString()};}
  function getSyncShim(){return {async push(){return {ok:false,skipped:true,message:"Firebase se activa en el bloque de sincronización."};},async pull(){return {ok:false,skipped:true,message:"Firebase se activa en el bloque de sincronización."};},async compare(){return {ok:true,mode:"local-only",local:getSnapshot(),remote:null};}};}
  window.ExcelLocalBridge={ensureReady:ensureReady,getSnapshot:getSnapshot,getDb:getDb,getSyncShim:getSyncShim};
})(window);
