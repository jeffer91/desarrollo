/* =========================================================
Nombre completo: baselocal.connector.js
Ruta o ubicación: /Requisitos/BaseLocal/baselocal.connector.js
Función o funciones:
- Conectar todos los módulos de Requisitos con una misma Base Local.
- Compartir datos entre pantallas, iframes y la pantalla BL usando localStorage.
- Exponer APIs simples: RequisitosBL, BaseLocalBridge.
- No guarda archivos físicos; solo datos JSON, estados, referencias y registros.
========================================================= */
(function(window){
  "use strict";

  var DB_PREFIX = "REQ_BL_DB_V1::";
  var SIGNAL_KEY = "REQ_BL_SIGNAL_V1";
  var SNAPSHOT_KEY = "REQ_EXCEL_LOCAL_V1:snapshot";
  var STATUS_KEY = "REQ_BL_CONNECTOR_STATUS_V1";

  var COLLECTIONS = [
    "periodos",
    "estudiantes",
    "requisitos",
    "observaciones",
    "fichas",
    "tabla",
    "stats",
    "coordi",
    "reportes",
    "defensas",
    "archivos_referencias",
    "metadata"
  ];

  var MODULE_COLLECTIONS = {
    requisito:"requisitos",
    excel:"requisitos",
    tabla:"tabla",
    ficha:"fichas",
    stats:"stats",
    coordi:"coordi",
    repor:"reportes",
    reportes:"reportes",
    repo:"reportes",
    defensas:"defensas",
    defart:"defensas"
  };

  function now(){
    return new Date().toISOString();
  }

  function today(){
    return now().slice(0,10);
  }

  function text(value){
    return String(value == null ? "" : value).trim();
  }

  function safeParse(value, fallback){
    try{
      return value ? JSON.parse(value) : fallback;
    }catch(error){
      return fallback;
    }
  }

  function clone(value){
    try{
      return JSON.parse(JSON.stringify(value == null ? null : value));
    }catch(error){
      return value;
    }
  }

  function normalizeId(value, fallback){
    var raw = text(value || fallback || "");
    if(!raw){
      raw = "item-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    }
    return raw
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w.-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function dbKey(collection){
    return DB_PREFIX + collection;
  }

  function collectionFor(moduleName){
    var key = text(moduleName).toLowerCase();
    return MODULE_COLLECTIONS[key] || key || "metadata";
  }

  function getStorage(){
    if(window.ExcelLocalStorage && typeof window.ExcelLocalStorage.readSnapshot === "function"){
      return window.ExcelLocalStorage;
    }
    return null;
  }

  function readRawSnapshot(){
    var storage = getStorage();
    if(storage){
      return storage.readSnapshot();
    }
    return safeParse(window.localStorage.getItem(SNAPSHOT_KEY), {
      meta:{app:"Requisitos", module:"BaseLocal", source:"fallback", updatedAt:now()},
      periods:[],
      students:[],
      history:[],
      diagnostics:[]
    });
  }

  function writeRawSnapshot(snapshot){
    var storage = getStorage();
    var clean = snapshot || {};
    if(storage && typeof storage.writeSnapshot === "function"){
      storage.writeSnapshot(clean);
    }else{
      window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(clean));
    }
    signal("snapshot-changed", {updatedAt:now()});
    return clean;
  }

  function readCollection(collection){
    var rows = safeParse(window.localStorage.getItem(dbKey(collection)), []);
    return Array.isArray(rows) ? rows : [];
  }

  function writeCollection(collection, rows){
    window.localStorage.setItem(dbKey(collection), JSON.stringify(Array.isArray(rows) ? rows : []));
  }

  function getRecordId(record, collection){
    if(!record || typeof record !== "object"){
      return normalizeId("", collection);
    }

    if(collection === "defensas"){
      return normalizeId([
        record._blId,
        record.id,
        record.docId,
        record._docId,
        record.cedula,
        record.numeroIdentificacion,
        record.numeroidentificacion,
        record.identificacion,
        record.fecha,
        record.dia,
        record.hora,
        record.aula,
        record.sede
      ].filter(Boolean).join("-"), collection);
    }

    return normalizeId(
      record._blId || record.id || record.docId || record._docId ||
      record.cedula || record.Cedula || record.CEDULA ||
      record.numeroIdentificacion || record.numeroidentificacion ||
      record.identificacion || record.codigo || record.periodoId ||
      record.periodId || record.reporteId || record.fichaId || record.key,
      collection
    );
  }

  function normalizeRecord(collection, record, source){
    var copy = Object.assign({}, record || {});
    var id = getRecordId(copy, collection);
    copy._blId = id;
    copy._blCollection = collection;
    copy._blSource = source || copy._blSource || "module";
    copy._blCreatedAt = copy._blCreatedAt || copy.creadoEn || copy.createdAt || now();
    copy._blUpdatedAt = copy._blUpdatedAt || copy.actualizadoEn || copy.updatedAt || copy.fechaActualizacion || now();
    copy._blDeleted = copy._blDeleted === true;
    return copy;
  }

  function guardar(collection, record, source){
    if(!collection || !record || typeof record !== "object"){
      return null;
    }

    var rows = readCollection(collection);
    var copy = normalizeRecord(collection, record, source);
    var index = rows.findIndex(function(row){return row && row._blId === copy._blId;});

    if(index >= 0){
      copy._blCreatedAt = rows[index]._blCreatedAt || copy._blCreatedAt;
      rows[index] = copy;
    }else{
      rows.push(copy);
    }

    writeCollection(collection, rows);
    signal("changed", {collection:collection, id:copy._blId, source:source || "module", count:rows.length});
    return copy;
  }

  function guardarMuchos(collection, records, source){
    if(!Array.isArray(records)){
      return [];
    }
    return records.map(function(record){
      return guardar(collection, record, source || "module_many");
    }).filter(Boolean);
  }

  function listar(collection, options){
    var rows = readCollection(collection);
    options = options || {};
    if(options.includeDeleted !== true){
      rows = rows.filter(function(row){return row && row._blDeleted !== true;});
    }
    return rows;
  }

  function buscarPorId(collection, id){
    var cleanId = normalizeId(id, collection);
    return readCollection(collection).find(function(row){return row && row._blId === cleanId;}) || null;
  }

  function marcarEliminado(collection, id, source){
    var row = buscarPorId(collection, id);
    if(!row){
      return null;
    }
    row._blDeleted = true;
    row._blDeletedAt = now();
    row._blUpdatedAt = now();
    return guardar(collection, row, source || "module_delete");
  }

  function mirrorSnapshotToCollections(){
    var snapshot = readRawSnapshot();
    var periods = Array.isArray(snapshot.periods) ? snapshot.periods : [];
    var students = Array.isArray(snapshot.students) ? snapshot.students : [];
    guardarMuchos("periodos", periods, "snapshot_mirror");
    guardarMuchos("estudiantes", students, "snapshot_mirror");
    guardarMuchos("requisitos", students, "snapshot_mirror");
    guardar("metadata", {
      id:"snapshot_mirror_status",
      totalPeriods:periods.length,
      totalStudents:students.length,
      updatedAt:now()
    }, "snapshot_mirror");
    return {periods:periods.length, students:students.length};
  }

  function conteos(){
    var snapshot = readRawSnapshot();
    var result = {collections:COLLECTIONS.length, records:0, byCollection:{}};
    COLLECTIONS.forEach(function(collection){
      var total = listar(collection).length;
      if(collection === "periodos" && Array.isArray(snapshot.periods) && snapshot.periods.length > total){
        total = snapshot.periods.length;
      }
      if((collection === "estudiantes" || collection === "requisitos") && Array.isArray(snapshot.students) && snapshot.students.length > total){
        total = snapshot.students.length;
      }
      result.byCollection[collection] = total;
      result.records += total;
    });
    return result;
  }

  function signal(kind, payload){
    var detail = Object.assign({kind:kind, at:now()}, payload || {});
    try{
      window.dispatchEvent(new CustomEvent("requisitos:bl:" + kind, {detail:detail}));
      window.dispatchEvent(new CustomEvent("bl:" + kind, {detail:detail}));
    }catch(error){}
    try{
      if(window.parent && window.parent !== window){
        window.parent.postMessage({type:"requisitos:bl:" + kind, payload:detail}, "*");
      }
    }catch(error){}
    try{
      window.localStorage.setItem(SIGNAL_KEY, JSON.stringify({id:"signal-" + Date.now() + "-" + Math.random().toString(36).slice(2), kind:kind, payload:detail, at:now()}));
    }catch(error){}
  }

  function capturarGlobales(collection, globals, source){
    var saved = [];
    (globals || []).forEach(function(name){
      var value = window[name];
      if(Array.isArray(value) && value.length){
        saved = saved.concat(guardarMuchos(collection, value, source || "auto_capture"));
      }else if(value && typeof value === "object"){
        var item = guardar(collection, value, source || "auto_capture");
        if(item){
          saved.push(item);
        }
      }
    });
    return saved;
  }

  function pascal(value){
    return text(value)
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .split(" ")
      .filter(Boolean)
      .map(function(part){return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();})
      .join("");
  }

  function conectarModulo(moduleName, options){
    options = options || {};
    var collection = options.collection || collectionFor(moduleName);
    var globalName = options.globalName || pascal(moduleName) + "BL";
    var globals = options.globals || [];

    var api = {
      module:moduleName,
      collection:collection,
      guardar:function(record){return guardar(collection, record, moduleName);},
      guardarMuchos:function(records){return guardarMuchos(collection, records, moduleName + "_many");},
      listar:function(){return listar(collection);},
      buscarPorId:function(id){return buscarPorId(collection, id);},
      marcarEliminado:function(id){return marcarEliminado(collection, id, moduleName + "_delete");},
      capturarAutomatico:function(){return capturarGlobales(collection, globals, "auto_capture_" + moduleName);}
    };

    window[globalName] = api;

    setTimeout(function(){
      api.capturarAutomatico();
      signal("module-ready", {module:moduleName, collection:collection, globalName:globalName, count:listar(collection).length});
    }, 250);

    window.addEventListener("load", function(){
      api.capturarAutomatico();
    });

    return api;
  }

  function getStatus(){
    return safeParse(window.localStorage.getItem(STATUS_KEY), {ok:true, mode:"local", updatedAt:now()});
  }

  function saveStatus(status){
    var next = Object.assign({}, getStatus(), status || {}, {updatedAt:now(), today:today()});
    window.localStorage.setItem(STATUS_KEY, JSON.stringify(next));
    return next;
  }

  window.RequisitosBL = {
    version:"1.0.0",
    collections:COLLECTIONS.slice(),
    today:today,
    collectionFor:collectionFor,
    readSnapshot:readRawSnapshot,
    writeSnapshot:writeRawSnapshot,
    mirrorSnapshotToCollections:mirrorSnapshotToCollections,
    guardar:guardar,
    guardarMuchos:guardarMuchos,
    listar:listar,
    buscarPorId:buscarPorId,
    marcarEliminado:marcarEliminado,
    conteos:conteos,
    capturarGlobales:capturarGlobales,
    conectarModulo:conectarModulo,
    notificar:signal,
    getStatus:getStatus,
    saveStatus:saveStatus
  };

  window.BaseLocalBridge = {
    version:"1.0.0",
    counts:conteos,
    getSnapshot:readRawSnapshot,
    writeSnapshot:writeRawSnapshot,
    mirrorSnapshotToCollections:mirrorSnapshotToCollections,
    list:listar,
    upsert:guardar,
    status:getStatus
  };

  try{
    mirrorSnapshotToCollections();
    saveStatus({ok:true, mode:"connector_ready"});
  }catch(error){
    saveStatus({ok:false, mode:"connector_error", errorMessage:error.message || String(error)});
  }
})(window);
