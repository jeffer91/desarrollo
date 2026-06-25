/* =========================================================
Nombre completo: excel-local.storage.js
Ruta o ubicación: /Requisitos/Gestion/Excel/excel-local/excel-local.storage.js
Función o funciones:
- Leer y escribir la base local en localStorage.
- Proteger la app ante datos corruptos o inexistentes.
Con qué se conecta:
- excel-local.config.js
- excel-local.repo.js
========================================================= */
(function(window){
  "use strict";
  function C(){if(!window.ExcelLocalConfig)throw new Error("ExcelLocalConfig no está disponible.");return window.ExcelLocalConfig;}
  function now(){return new Date().toISOString();}
  function clone(v){try{return JSON.parse(JSON.stringify(v));}catch(e){return v;}}
  function emptyDb(){var d=C().clone(C().data.defaults.db);return d;}
  function readJson(key,fallback){try{var raw=localStorage.getItem(key);return raw?JSON.parse(raw):clone(fallback);}catch(e){console.warn("[ExcelLocalStorage] Dato corrupto:",key,e);return clone(fallback);}}
  function writeJson(key,value){localStorage.setItem(key,JSON.stringify(value));return value;}
  function readDb(){var db=readJson(C().getKey("db"),emptyDb());db.periodos=db.periodos||{};db.estudiantes=db.estudiantes||{};db.historial=db.historial||{};db.snapshots=db.snapshots||{};return db;}
  function writeDb(db){var safe=db||emptyDb();safe.updatedAt=now();writeJson(C().getKey("db"),safe);return safe;}
  function readMeta(){return readJson(C().getKey("meta"),C().data.defaults.meta);}
  function writeMeta(meta){var m=Object.assign({},readMeta(),meta||{}, {updatedAt:now()});if(!m.createdAt)m.createdAt=now();writeJson(C().getKey("meta"),m);return m;}
  function reset(){var db=emptyDb();writeDb(db);writeMeta({resetAt:now()});return db;}
  function exportAll(){return {meta:readMeta(),db:readDb(),exportedAt:now()};}
  window.ExcelLocalStorage={readDb:readDb,writeDb:writeDb,readMeta:readMeta,writeMeta:writeMeta,reset:reset,exportAll:exportAll,clone:clone,now:now};
})(window);
