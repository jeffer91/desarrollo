/* =========================================================
Nombre completo: excel-local.bridge.js
Ruta o ubicación: /Requisitos/Gestion/Excel/excel-local/excel-local.bridge.js
Función o funciones:
- Exponer un puente común para leer la base local de Excel.
- Entregar un shim básico compatible con módulos que esperan db/sync.
Con qué se conecta:
- excel-local.repo.js
- BaseLocal/baselocal.core.js
========================================================= */
(function(window){
  "use strict";
  function repo(){if(!window.ExcelLocalRepo)throw new Error("ExcelLocalRepo no está disponible.");return window.ExcelLocalRepo;}
  function ensureReady(){return repo().ensureReady();}
  function getDb(){return {kind:"localStorage",collection:function(name){return {name:name,get:function(){return Promise.resolve({docs:[]});}};}};}
  function getSyncShim(){return {run:function(){return Promise.resolve({ok:true,mode:"local",message:"Sincronización Firebase se activa en el bloque 4."});},isRunning:function(){return false;}};}
  window.ExcelLocalBridge={ensureReady:ensureReady,getDb:getDb,getSyncShim:getSyncShim,getSnapshot:function(){return repo().getSnapshot();},getRepo:function(){return repo();}};
})(window);
