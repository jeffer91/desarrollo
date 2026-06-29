/* =========================================================
Nombre completo: baselocal.connector.js
Ruta o ubicación: /Requisitos/BaseLocal/baselocal.connector.js
Función o funciones:
- Conectar todos los módulos de Requisitos con una misma Base Local.
- Usar la sesión rápida de Maqueta cuando Requisitos ya cargó la Base Local.
- Compartir datos entre pantallas, iframes y la pantalla BL usando localStorage.
- Exponer APIs simples: RequisitosBL, BaseLocalBridge.
- Reconstruir colecciones espejo solo cuando la foto local cambió.
- Reflejar estudiantes también en tabla, fichas, stats, coordi, reportes y defensas.
- Evitar duplicación pesada de estudiantes en localStorage.
========================================================= */
(function(window){
  "use strict";

  var DB_PREFIX = "REQ_BL_DB_V1::";
  var SIGNAL_KEY = "REQ_BL_SIGNAL_V1";
  var SNAPSHOT_KEY = "REQ_EXCEL_LOCAL_V1:snapshot";
  var STATUS_KEY = "REQ_BL_CONNECTOR_STATUS_V1";
  var MIRROR_SIGNATURE_KEY = "REQ_BL_MIRROR_SIGNATURE_V1";
  var MIRROR_STORAGE_VERSION_KEY = "REQ_BL_MIRROR_STORAGE_VERSION_V1";
  var MIRROR_STORAGE_VERSION = "light-v2";

  var COLLECTIONS = ["periodos","estudiantes","requisitos","observaciones","fichas","tabla","stats","coordi","reportes","defensas","archivos_referencias","metadata"];
  var MIRROR_COLLECTIONS = ["periodos","estudiantes","requisitos","fichas","tabla","stats","coordi","reportes","defensas"];
  var LIGHT_MIRROR_COLLECTIONS = ["requisitos","fichas","tabla","stats","coordi","reportes","defensas"];

  var MODULE_COLLECTIONS = {requisito:"requisitos",excel:"requisitos",carga:"requisitos",tabla:"tabla",ficha:"fichas",stats:"stats",coordi:"coordi",repor:"reportes",reportes:"reportes",repo:"reportes",defensas:"defensas",defart:"defensas"};
  var mirrorState = {running:false,lastSignature:"",lastAt:""};

  function now(){return new Date().toISOString();}
  function today(){return now().slice(0,10);}
  function text(value){return String(value == null ? "" : value).trim();}
  function safeParse(value, fallback){try{return value ? JSON.parse(value) : fallback;}catch(error){return fallback;}}
  function clone(value){try{return JSON.parse(JSON.stringify(value == null ? null : value));}catch(error){return value;}}

  function isQuotaError(error){
    var msg = text(error && (error.message || error.name || error));
    return !!(error && (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED" || error.code === 22 || error.code === 1014 || /quota|exceeded/i.test(msg)));
  }

  function getSession(){
    try{if(window.parent && window.parent !== window && window.parent.MAQ_BASELOCAL_SESSION){return window.parent.MAQ_BASELOCAL_SESSION;}}catch(error){}
    try{if(window.top && window.top !== window && window.top.MAQ_BASELOCAL_SESSION){return window.top.MAQ_BASELOCAL_SESSION;}}catch(error){}
    try{if(window.MAQ_BASELOCAL_SESSION){return window.MAQ_BASELOCAL_SESSION;}}catch(error){}
    return null;
  }

  function getSavedMirrorSignature(){try{return window.sessionStorage.getItem(MIRROR_SIGNATURE_KEY) || "";}catch(error){return "";}}
  function saveMirrorSignature(signature){try{window.sessionStorage.setItem(MIRROR_SIGNATURE_KEY, signature || "");}catch(error){}}
  function getMirrorStorageVersion(){try{return window.localStorage.getItem(MIRROR_STORAGE_VERSION_KEY) || "";}catch(error){return "";}}
  function saveMirrorStorageVersion(){try{window.localStorage.setItem(MIRROR_STORAGE_VERSION_KEY, MIRROR_STORAGE_VERSION);}catch(error){}}

  function normalizeId(value, fallback){
    var raw = text(value || fallback || "");
    if(!raw){raw = "item-" + Date.now() + "-" + Math.random().toString(36).slice(2);}
    return raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w.-]+/g, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  }

  function dbKey(collection){return DB_PREFIX + collection;}
  function collectionFor(moduleName){var key = text(moduleName).toLowerCase();return MODULE_COLLECTIONS[key] || key || "metadata";}
  function getStorage(){return window.ExcelLocalStorage && typeof window.ExcelLocalStorage.readSnapshot === "function" ? window.ExcelLocalStorage : null;}

  function canonicalizeSnapshot(snapshot){
    var snap = snapshot || {};
    if(window.BLPeriodosCanon && typeof window.BLPeriodosCanon.canonicalizeSnapshot === "function"){
      snap = window.BLPeriodosCanon.canonicalizeSnapshot(snap);
    }
    snap.meta = snap.meta && typeof snap.meta === "object" ? snap.meta : {};
    snap.periods = Array.isArray(snap.periods) ? snap.periods : [];
    snap.students = Array.isArray(snap.students) ? snap.students : [];
    snap.history = Array.isArray(snap.history) ? snap.history : [];
    snap.diagnostics = Array.isArray(snap.diagnostics) ? snap.diagnostics : [];
    return snap;
  }

  function readRawSnapshot(){
    var session = getSession();
    if(session && typeof session.getSnapshot === "function"){
      try{
        var sessionSnap = session.getSnapshot({clone:false});
        if(sessionSnap && typeof sessionSnap === "object"){
          return canonicalizeSnapshot(clone(sessionSnap));
        }
      }catch(error){}
    }
    var storage = getStorage();
    var snap = storage ? storage.readSnapshot() : safeParse(window.localStorage.getItem(SNAPSHOT_KEY), {meta:{app:"Requisitos", module:"BaseLocal", source:"fallback", updatedAt:now()}, periods:[], students:[], history:[], diagnostics:[]});
    return canonicalizeSnapshot(snap);
  }

  function writeRawSnapshot(snapshot){
    var storage = getStorage();
    var clean = canonicalizeSnapshot(snapshot || {});
    if(storage && typeof storage.writeSnapshot === "function"){storage.writeSnapshot(clean);}
    else{safeSetItem(SNAPSHOT_KEY, JSON.stringify(clean));}
    try{
      var session = getSession();
      if(session && typeof session.setSnapshot === "function"){session.setSnapshot(clean,{source:"RequisitosBL.writeSnapshot",alreadyStored:true,clone:false});}
    }catch(error){}
    signal("snapshot-changed", {updatedAt:now()});
    return clean;
  }

  function purgeGeneratedCopies(keepCollection){
    var removed = 0;
    try{
      for(var i = window.localStorage.length - 1; i >= 0; i--){
        var key = window.localStorage.key(i) || "";
        var isMirror = key.indexOf(DB_PREFIX) === 0;
        var isBackup = key.indexOf("REQ_EXCEL_LOCAL_V1:beforeFirebaseSync:") === 0;
        if(isMirror){
          var collection = key.slice(DB_PREFIX.length);
          if(collection === keepCollection || collection === "metadata"){continue;}
        }
        if(isMirror || isBackup){try{window.localStorage.removeItem(key);removed += 1;}catch(error){}}
      }
    }catch(error){}
    try{window.sessionStorage.removeItem(MIRROR_SIGNATURE_KEY);}catch(error){}
    return removed;
  }

  function purgeMirrorCollections(){
    MIRROR_COLLECTIONS.forEach(function(collection){try{window.localStorage.removeItem(dbKey(collection));}catch(error){}});
    try{window.sessionStorage.removeItem(MIRROR_SIGNATURE_KEY);}catch(error){}
  }

  function safeSetItem(key, raw, keepCollection){
    try{window.localStorage.setItem(key, raw);return true;}catch(error){
      if(!isQuotaError(error)){throw error;}
      purgeGeneratedCopies(keepCollection || "");
      try{window.localStorage.setItem(key, raw);return true;}catch(secondError){
        if(!isQuotaError(secondError)){throw secondError;}
        return false;
      }
    }
  }

  function isLightCollection(collection){return LIGHT_MIRROR_COLLECTIONS.indexOf(collection) >= 0;}

  function compactForStorage(row){
    var source = row && typeof row === "object" ? row : {};
    var out = Array.isArray(source) ? [] : {};
    Object.keys(source).forEach(function(key){
      var value = source[key];
      var low = key.toLowerCase();
      if(low.indexOf("base64") >= 0 || low.indexOf("buffer") >= 0 || low.indexOf("blob") >= 0 || low === "raw" || low === "_raw"){return;}
      if(typeof value === "string" && value.length > 5000){out[key] = value.slice(0,5000) + "…";return;}
      out[key] = value;
    });
    return out;
  }

  function lightRecord(record, collection){
    if(!record || typeof record !== "object"){return record;}
    if(collection === "periodos" || collection === "metadata"){return compactForStorage(record);}
    var fields = ["cedula","Cedula","CEDULA","numeroIdentificacion","numeroidentificacion","identificacion","docId","_docId","id","codigo","nombres","Nombres","nombresCompletos","apellidos","nombrecarrera","nombreCarrera","NombreCarrera","carrera","Carrera","programa","sede","Sede","modalidad","jornada","periodoId","periodoLabel","periodo","ultimoPeriodoId","estadoMatricula","retiradoEn","historialEstadoMatricula","division","divisiones","updatedAt","createdAt","creadoEn","actualizadoEn","fechaDefensa","horaDefensa","tribunal","presidente","vocal","secretario","tutor","nota","notaFinal","nart","ndef","complexivo","supletorio"];
    var out = {};
    fields.forEach(function(field){if(Object.prototype.hasOwnProperty.call(record, field)){out[field] = record[field];}});
    out._mirrorRef = "estudiantes";
    out._mirrorCollection = collection || "mirror";
    out._mirrorLight = true;
    out._mirrorUpdatedAt = now();
    return compactForStorage(out);
  }

  function readCollection(collection){var rows = safeParse(window.localStorage.getItem(dbKey(collection)), []);return Array.isArray(rows) ? rows : [];}
  function writeCollection(collection, rows){
    var list = Array.isArray(rows) ? rows : [];
    var raw = JSON.stringify(list);
    if(safeSetItem(dbKey(collection), raw, collection)){return;}
    var light = list.map(function(row){return lightRecord(row, collection);});
    safeSetItem(dbKey(collection), JSON.stringify(light), collection);
  }

  function getRecordId(record, collection){
    if(!record || typeof record !== "object"){return normalizeId("", collection);}
    if(collection === "periodos"){return normalizeId(record.id || record.periodoId || record.label, collection);}
    return normalizeId(record.cedula || record.numeroIdentificacion || record.numeroidentificacion || record.identificacion || record.docId || record._docId || record.id || record.codigo || record.periodoId || record.periodId || record.reporteId || record.fichaId || record.key, collection);
  }

  function normalizeRecord(collection, record, source){
    var copy = Object.assign({}, record || {});
    var id = getRecordId(copy, collection);
    copy._blId = id;
    copy._blCollection = collection;
    copy._blSource = source || copy._blSource || "module";
    copy._blCreatedAt = copy._blCreatedAt || copy.creadoEn || copy.createdAt || now();
    copy._blUpdatedAt = now();
    copy._blDeleted = copy._blDeleted === true;
    return copy;
  }

  function guardar(collection, record, source, options){
    options = options || {};
    if(!collection || !record || typeof record !== "object"){return null;}
    var rows = readCollection(collection);
    var copy = normalizeRecord(collection, isLightCollection(collection) ? lightRecord(record, collection) : record, source);
    var index = rows.findIndex(function(row){return row && row._blId === copy._blId;});
    if(index >= 0){copy._blCreatedAt = rows[index]._blCreatedAt || copy._blCreatedAt;rows[index] = copy;}else{rows.push(copy);}
    writeCollection(collection, rows);
    if(options.silent !== true){signal("changed", {collection:collection, id:copy._blId, source:source || "module", count:rows.length});}
    return copy;
  }

  function guardarMuchos(collection, records, source, options){
    options = options || {};
    if(!Array.isArray(records) || !collection){return [];}
    var rows = options.replace === true ? [] : readCollection(collection);
    var indexById = {};
    rows.forEach(function(row, index){if(row && row._blId){indexById[row._blId] = index;}});
    var saved = [];
    records.forEach(function(record){
      if(!record || typeof record !== "object"){return;}
      var sourceRecord = isLightCollection(collection) ? lightRecord(record, collection) : record;
      var copy = normalizeRecord(collection, sourceRecord, source || "module_many");
      var index = Object.prototype.hasOwnProperty.call(indexById, copy._blId) ? indexById[copy._blId] : -1;
      if(index >= 0){copy._blCreatedAt = rows[index]._blCreatedAt || copy._blCreatedAt;rows[index] = copy;}
      else{indexById[copy._blId] = rows.length;rows.push(copy);}
      saved.push(copy);
    });
    writeCollection(collection, rows);
    if(options.silent !== true){signal("changed", {collection:collection, source:source || "module_many", count:rows.length, changed:saved.length, bulk:true, replace:options.replace === true});}
    return saved;
  }

  function replaceCollection(collection, records, source, options){
    return guardarMuchos(collection, Array.isArray(records) ? records : [], source || "replace", Object.assign({}, options || {}, {replace:true}));
  }

  function listar(collection, options){
    var rows = readCollection(collection);
    options = options || {};
    if(options.includeDeleted !== true){rows = rows.filter(function(row){return row && row._blDeleted !== true;});}
    return rows;
  }

  function buscarPorId(collection, id){var cleanId = normalizeId(id, collection);return readCollection(collection).find(function(row){return row && row._blId === cleanId;}) || null;}
  function marcarEliminado(collection, id, source){var row = buscarPorId(collection, id);if(!row){return null;}row._blDeleted = true;row._blDeletedAt = now();row._blUpdatedAt = now();return guardar(collection, row, source || "module_delete");}

  function snapshotSignature(snapshot){
    snapshot = snapshot || {};
    var meta = snapshot.meta || {};
    var periods = Array.isArray(snapshot.periods) ? snapshot.periods : [];
    var students = Array.isArray(snapshot.students) ? snapshot.students : [];
    var first = students[0] && (students[0].cedula || students[0].numeroIdentificacion || students[0]._docId || students[0].docId || "");
    var last = students[students.length - 1] && (students[students.length - 1].cedula || students[students.length - 1].numeroIdentificacion || students[students.length - 1]._docId || students[students.length - 1].docId || "");
    return [meta.updatedAt || meta.pulledAt || meta.createdAt || "", periods.length, students.length, first, last, MIRROR_STORAGE_VERSION].join("|");
  }

  function mirrorSnapshotToCollections(options){
    options = options || {};
    if(mirrorState.running){return {periods:0, students:0, skipped:true, reason:"running"};}
    var snapshot = readRawSnapshot();
    var periods = Array.isArray(snapshot.periods) ? snapshot.periods : [];
    var students = Array.isArray(snapshot.students) ? snapshot.students : [];
    var signature = snapshotSignature(snapshot);
    var savedSignature = getSavedMirrorSignature();
    var mustRebuildForStorage = getMirrorStorageVersion() !== MIRROR_STORAGE_VERSION;
    if(!mustRebuildForStorage && options.force !== true && options.rebuild !== true && signature && (signature === mirrorState.lastSignature || signature === savedSignature)){
      mirrorState.lastSignature = signature;
      return {periods:periods.length, students:students.length, defensas:students.length, skipped:true, reason:"same_snapshot_session"};
    }
    mirrorState.running = true;
    try{
      var replace = options.rebuild === true || options.replace === true || options.force === true || mustRebuildForStorage;
      if(replace){purgeMirrorCollections();}
      guardarMuchos("periodos", periods, "snapshot_mirror", {silent:true, replace:replace});
      guardarMuchos("estudiantes", students, "snapshot_mirror", {silent:true, replace:replace});
      LIGHT_MIRROR_COLLECTIONS.forEach(function(collection){guardarMuchos(collection, students, "snapshot_mirror_light", {silent:true, replace:true});});
      guardar("metadata", {id:"snapshot_mirror_status", totalPeriods:periods.length, totalStudents:students.length, totalDefensas:students.length, updatedAt:now(), signature:signature, rebuild:replace, storageVersion:MIRROR_STORAGE_VERSION, lightMirrors:true}, "snapshot_mirror", {silent:true});
      mirrorState.lastSignature = signature;
      mirrorState.lastAt = now();
      saveMirrorSignature(signature);
      saveMirrorStorageVersion();
      if(options.silent !== true){signal("mirror-complete", {periods:periods.length, students:students.length, defensas:students.length, updatedAt:mirrorState.lastAt, rebuild:replace, storageVersion:MIRROR_STORAGE_VERSION});}
      return {periods:periods.length, students:students.length, defensas:students.length, skipped:false, rebuild:replace, storageVersion:MIRROR_STORAGE_VERSION};
    }finally{mirrorState.running = false;}
  }

  function rebuildSnapshotToCollections(options){
    options = Object.assign({}, options || {}, {force:true, rebuild:true, replace:true});
    return mirrorSnapshotToCollections(options);
  }

  function conteos(){
    var snapshot = readRawSnapshot();
    var result = {collections:COLLECTIONS.length, records:0, byCollection:{}};
    COLLECTIONS.forEach(function(collection){
      var total = listar(collection).length;
      if(collection === "periodos" && Array.isArray(snapshot.periods) && snapshot.periods.length > total){total = snapshot.periods.length;}
      if(["estudiantes","requisitos","fichas","tabla","stats","coordi","reportes","defensas"].indexOf(collection) >= 0 && Array.isArray(snapshot.students) && snapshot.students.length > total){total = snapshot.students.length;}
      result.byCollection[collection] = total;
      result.records += total;
    });
    return result;
  }

  function signal(kind, payload){
    var detail = Object.assign({kind:kind, at:now()}, payload || {});
    try{window.dispatchEvent(new CustomEvent("requisitos:bl:" + kind, {detail:detail}));window.dispatchEvent(new CustomEvent("bl:" + kind, {detail:detail}));}catch(error){}
    try{if(window.parent && window.parent !== window){window.parent.postMessage({type:"requisitos:bl:" + kind, payload:detail}, "*");}}catch(error){}
    try{window.localStorage.setItem(SIGNAL_KEY, JSON.stringify({id:"signal-" + Date.now() + "-" + Math.random().toString(36).slice(2), kind:kind, payload:detail, at:now()}));}catch(error){}
  }

  function capturarGlobales(collection, globals, source){
    var saved = [];
    (globals || []).forEach(function(name){
      var value = window[name];
      if(Array.isArray(value) && value.length){saved = saved.concat(guardarMuchos(collection, value, source || "auto_capture"));}
      else if(value && typeof value === "object"){var item = guardar(collection, value, source || "auto_capture");if(item){saved.push(item);}}
    });
    return saved;
  }

  function pascal(value){return text(value).replace(/[_-]+/g, " ").replace(/\s+/g, " ").split(" ").filter(Boolean).map(function(part){return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();}).join("");}

  function conectarModulo(moduleName, options){
    options = options || {};
    var collection = options.collection || collectionFor(moduleName);
    var globalName = options.globalName || pascal(moduleName) + "BL";
    var globals = options.globals || [];
    var api = {module:moduleName, collection:collection, guardar:function(record){return guardar(collection, record, moduleName);}, guardarMuchos:function(records){return guardarMuchos(collection, records, moduleName + "_many");}, reemplazar:function(records){return replaceCollection(collection, records, moduleName + "_replace");}, listar:function(){return listar(collection);}, buscarPorId:function(id){return buscarPorId(collection, id);}, marcarEliminado:function(id){return marcarEliminado(collection, id, moduleName + "_delete");}, capturarAutomatico:function(){return capturarGlobales(collection, globals, "auto_capture_" + moduleName);}};
    window[globalName] = api;
    setTimeout(function(){api.capturarAutomatico();signal("module-ready", {module:moduleName, collection:collection, globalName:globalName, count:listar(collection).length});}, 250);
    window.addEventListener("load", function(){api.capturarAutomatico();});
    return api;
  }

  function getStatus(){return safeParse(window.localStorage.getItem(STATUS_KEY), {ok:true, mode:"local", updatedAt:now()});}
  function saveStatus(status){var next = Object.assign({}, getStatus(), status || {}, {updatedAt:now(), today:today()});try{window.localStorage.setItem(STATUS_KEY, JSON.stringify(next));}catch(error){}return next;}

  window.RequisitosBL = {version:"1.3.0",collections:COLLECTIONS.slice(),mirrorCollections:MIRROR_COLLECTIONS.slice(),today:today,collectionFor:collectionFor,readSnapshot:readRawSnapshot,writeSnapshot:writeRawSnapshot,mirrorSnapshotToCollections:mirrorSnapshotToCollections,rebuildSnapshotToCollections:rebuildSnapshotToCollections,replaceCollection:replaceCollection,guardar:guardar,guardarMuchos:guardarMuchos,listar:listar,buscarPorId:buscarPorId,marcarEliminado:marcarEliminado,conteos:conteos,capturarGlobales:capturarGlobales,conectarModulo:conectarModulo,notificar:signal,getStatus:getStatus,saveStatus:saveStatus,purgeGeneratedCopies:purgeGeneratedCopies};
  window.BaseLocalBridge = {version:"1.3.0",counts:conteos,getSnapshot:readRawSnapshot,writeSnapshot:writeRawSnapshot,mirrorSnapshotToCollections:mirrorSnapshotToCollections,rebuildSnapshotToCollections:rebuildSnapshotToCollections,list:listar,upsert:guardar,upsertMany:guardarMuchos,replace:replaceCollection,status:getStatus};

  try{var mirrorResult = mirrorSnapshotToCollections({silent:true});saveStatus({ok:true, mode:"connector_ready", optimized:true, sessionReady:!!getSession(), defensasMirror:true, rebuildReady:true, lightMirrors:true, storageVersion:MIRROR_STORAGE_VERSION, mirrorSkipped:mirrorResult.skipped === true, mirrorReason:mirrorResult.reason || "updated"});}
  catch(error){saveStatus({ok:false, mode:"connector_error", errorMessage:error.message || String(error)});}
})(window);
