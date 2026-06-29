/* =========================================================
Nombre completo: bl2-api.js
Ruta o ubicación: /Requisitos/BaseLocal2/bl2-api.js
Función o funciones:
- Exponer una API única BL2 para las pantallas de Requisitos.
- Usar por ahora el adaptador legado sin romper Base Local V1.
- Preparar la ruta para SQLite en Electron e IndexedDB en navegador.
- Entregar consultas rápidas de estudiantes, períodos, resumen y diagnóstico.
- No leer el snapshot pesado durante el arranque de Maqueta.
- Mantener SQLite/IndexedDB como motor asíncrono hasta migrar pantallas en bloques siguientes.
- Exponer migración manual de Base Local V1 hacia BL2.
- Invalidar caché sin disparar render reentrante por defecto.
Con qué se conecta:
- bl2-config.js
- bl2-detect-runtime.js
- bl2-legacy-adapter.js
- db/bl2-storage.js
- migration/bl2-migrate-from-v1.js
- futuras capas SQLite/IndexedDB
========================================================= */
(function(window){
  "use strict";

  var VERSION = "2.0.0-alpha.2";
  var bootedAt = new Date().toISOString();
  var state = {ready:false, mode:"initializing", storage:"legacy", runtime:null, lastError:"", adapterName:"legacy"};

  function now(){return new Date().toISOString();}
  function safe(label, fn, fallback){try{return typeof fn === "function" ? fn() : fallback;}catch(error){state.lastError = error && error.message ? error.message : String(error);console.warn("[BL2 " + label + "]", error);return fallback;}}
  function emit(kind, payload){var detail = Object.assign({kind:kind, at:now(), version:VERSION}, payload || {});try{window.dispatchEvent(new CustomEvent("bl2:" + kind, {detail:detail}));}catch(error){}try{if(window.parent && window.parent !== window){window.parent.postMessage({type:"bl2:" + kind, payload:detail}, "*");}}catch(error){}}

  function config(){return window.BL2Config || null;}
  function runtime(){return window.BL2Runtime || null;}
  function legacy(){return window.BL2LegacyAdapter || null;}
  function storage(){return window.BL2Storage || null;}
  function migrator(){return window.BL2Migrator || null;}
  function migrationReport(){return window.BL2MigrationReport || null;}
  function canServeSync(ad){return !!(ad && typeof ad.canServeSync === "function" && ad.canServeSync());}

  function resolveAdapter(){
    var rt = runtime() && typeof runtime().detect === "function" ? runtime().detect(true) : {preferredStorage:"legacy"};
    var preferred = rt.preferredStorage || "legacy";
    state.runtime = rt;
    state.storage = preferred;

    if(preferred === "sqlite" && canServeSync(window.BL2SQLiteAdapter)){state.mode="sqlite";state.adapterName="sqlite";return window.BL2SQLiteAdapter;}
    if(preferred === "indexeddb" && canServeSync(window.BL2IndexedDBAdapter)){state.mode="indexeddb";state.adapterName="indexeddb";return window.BL2IndexedDBAdapter;}
    if(legacy()){state.mode="legacy_bridge";state.adapterName="legacy";return legacy();}
    state.mode="unavailable";state.adapterName="none";
    return null;
  }

  function adapter(){var ad = resolveAdapter();if(!ad){throw new Error("BL2 no tiene adaptador disponible.");}return ad;}

  function status(options){
    options = options || {};
    var adStatus = safe("adapter.status", function(){return adapter().status ? adapter().status({deep:options.deep === true}) : {ok:true};}, {ok:false, mode:"sin_adapter"});
    var storageStatus = safe("storage.status", function(){return storage() && typeof storage().status === "function" ? storage().status() : {ok:false, mode:"sin_storage"};}, {ok:false, mode:"sin_storage"});
    var migrationStatus = safe("migration.status", function(){return migrator() && typeof migrator().status === "function" ? migrator().status() : {ok:true, mode:"sin_migrador"};}, {ok:false, mode:"sin_migrador"});
    var data = {ok:adStatus.ok !== false && !state.lastError, version:VERSION, ready:state.ready, mode:state.mode, storage:state.storage, adapter:state.adapterName, bootedAt:bootedAt, runtime:state.runtime, lastError:state.lastError, adapterStatus:adStatus, storageStatus:storageStatus, migrationStatus:migrationStatus, updatedAt:now()};
    if(config() && typeof config().saveStatus === "function"){config().saveStatus(data);}
    return data;
  }

  function invalidate(options){
    options = options || {};
    safe("adapter.invalidate", function(){if(adapter().invalidate){adapter().invalidate();}}, null);
    var current = status({deep:false});
    if(options.emit === true){emit("invalidated", current);}
    return current;
  }

  function boot(){
    try{resolveAdapter();state.ready = true;state.lastError = "";var current = status({deep:false});emit("ready", current);return current;}
    catch(error){state.ready = false;state.lastError = error && error.message ? error.message : String(error);var failed = status({deep:false});emit("error", failed);return failed;}
  }

  var api = {
    version:VERSION,
    boot:boot,
    status:status,
    invalidate:invalidate,
    runtime:function(){return state.runtime || (runtime() && runtime().detect ? runtime().detect(true) : null);},
    periodos:{listar:function(){return safe("periodos.listar", function(){return adapter().listPeriods ? adapter().listPeriods() : [];}, []);}},
    estudiantes:{
      buscar:function(options){return safe("estudiantes.buscar", function(){return adapter().searchStudents ? adapter().searchStudents((options && (options.search || options.q)) || "", options || {}) : {rows:[], total:0};}, {rows:[], total:0});},
      listarPagina:function(options){return safe("estudiantes.listarPagina", function(){return adapter().listStudents ? adapter().listStudents(options || {}) : {rows:[], total:0};}, {rows:[], total:0});},
      obtenerPorCedula:function(cedula, options){return safe("estudiantes.obtenerPorCedula", function(){return adapter().getStudentById ? adapter().getStudentById(cedula, options || {}) : null;}, null);}
    },
    stats:{resumen:function(options){return safe("stats.resumen", function(){return adapter().resumen ? adapter().resumen(options || {}) : {total:0, activos:0, retirados:0, carreras:{}, periodos:{}};}, {total:0, activos:0, retirados:0, carreras:{}, periodos:{}});}},
    storage:{
      estado:function(){return safe("storage.estado", function(){return storage() && typeof storage().status === "function" ? storage().status() : {ok:false, mode:"sin_storage"};}, {ok:false, mode:"sin_storage"});},
      inicializar:function(options){return storage() && typeof storage().initialize === "function" ? storage().initialize(options || {}) : Promise.resolve({ok:false, mode:"sin_storage"});},
      copiarDesdeLegacy:function(options){return storage() && typeof storage().copyFromLegacy === "function" ? storage().copyFromLegacy(options || {}) : Promise.resolve({ok:false, mode:"sin_storage"});}
    },
    migracion:{
      estado:function(){return safe("migracion.estado", function(){return migrator() && typeof migrator().status === "function" ? migrator().status() : {ok:false, mode:"sin_migrador"};}, {ok:false, mode:"sin_migrador"});},
      previsualizar:function(options){return safe("migracion.previsualizar", function(){return migrator() && typeof migrator().preview === "function" ? migrator().preview(options || {}) : {ok:false, errors:[{message:"Migrador no disponible"}]};}, {ok:false, errors:[{message:"Migrador no disponible"}]});},
      ejecutar:function(options){return migrator() && typeof migrator().run === "function" ? migrator().run(options || {}) : Promise.resolve({ok:false, mode:"sin_migrador"});},
      reporte:function(){return safe("migracion.reporte", function(){return migrationReport() && typeof migrationReport().read === "function" ? migrationReport().read() : null;}, null);}
    },
    sync:{estado:function(){return {ok:true, mode:"pendiente_bloque_10", message:"Firebase incremental se implementará en el bloque 10.", updatedAt:now()};}},
    compat:{snapshot:function(options){return safe("compat.snapshot", function(){return adapter().readSnapshot ? adapter().readSnapshot(options || {}) : null;}, null);},legacyAdapter:function(){return legacy();}}
  };

  window.BL2 = api;
  boot();
})(window);
