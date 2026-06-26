/* =========================================================
Nombre completo: baselocal.firebase.js
Ruta o ubicación: /Requisitos/BaseLocal/baselocal.firebase.js
Función o funciones:
- Sincronizar Base Local ↔ Firebase una vez al día al abrir BL.
- Leer principalmente las colecciones reales: Estudiantes y periodos.
- Mantener funcionando la Base Local aunque no haya internet.
- Subir estudiantes con parche controlado para no sobrescribir campos sensibles.
Con qué se conecta:
- services/bl-periodos.service.js
- services/bl-estudiantes.service.js
- services/bl-sync-diario.js
- services/bl-firestore-patch.js
- baselocal.app.js
- excel-local.storage.js
- firebase-config.js
========================================================= */
(function(window){
  "use strict";

  var STATUS_KEY = "REQ_EXCEL_LOCAL_V1:firebasePullStatus";
  var SYNC_STATUS_KEY = "REQ_BL_DAILY_SYNC_STATUS_V1";
  var BACKUP_KEY_PREFIX = "REQ_EXCEL_LOCAL_V1:beforeFirebaseSync:";
  var SIGNAL_KEY = "REQ_BL_SIGNAL_V1";

  function text(value){return String(value == null ? "" : value).trim();}
  function now(){return new Date().toISOString();}
  function today(){return now().slice(0, 10);}
  function clone(value){try{return JSON.parse(JSON.stringify(value == null ? null : value));}catch(error){return value;}}
  function getStorage(){if(!window.ExcelLocalStorage){throw new Error("ExcelLocalStorage no está disponible.");}return window.ExcelLocalStorage;}
  function getPeriodosService(){if(!window.BLPeriodosService){throw new Error("BLPeriodosService no está disponible.");}return window.BLPeriodosService;}
  function getEstudiantesService(){if(!window.BLEstudiantesService){throw new Error("BLEstudiantesService no está disponible.");}return window.BLEstudiantesService;}
  function getDailyService(){return window.BLSyncDiario || null;}
  function getPatchService(){return window.BLFirestorePatch || null;}

  function emit(kind, payload){
    var detail = Object.assign({kind:kind, at:now()}, payload || {});
    try{
      window.dispatchEvent(new CustomEvent("baselocal:" + kind, {detail:clone(detail)}));
      window.dispatchEvent(new CustomEvent("requisitos:bl:" + kind, {detail:clone(detail)}));
      window.dispatchEvent(new CustomEvent("bl:" + kind, {detail:clone(detail)}));
    }catch(error){}
    try{if(window.parent && window.parent !== window){window.parent.postMessage({type:"requisitos:bl:" + kind, payload:detail}, "*");}}catch(error){}
    try{window.localStorage.setItem(SIGNAL_KEY, JSON.stringify({id:"signal-" + Date.now(), kind:kind, payload:detail, at:now()}));}catch(error){}
  }

  function saveStatus(payload){
    var status = Object.assign({checkedAt:now()}, payload || {});
    try{window.localStorage.setItem(STATUS_KEY, JSON.stringify(status));}catch(error){console.warn("[BaseLocalFirebase] No se pudo guardar estado", error);}
    return status;
  }

  function getLastStatus(){try{var raw = window.localStorage.getItem(STATUS_KEY);return raw ? JSON.parse(raw) : {ok:false, mode:"sin_estado"};}catch(error){return {ok:false, mode:"sin_estado"};}}
  function getSyncStatus(){try{var raw = window.localStorage.getItem(SYNC_STATUS_KEY);return raw ? JSON.parse(raw) : {ok:false, mode:"sin_estado", lastSyncDate:""};}catch(error){return {ok:false, mode:"sin_estado", lastSyncDate:""};}}

  function saveSyncStatus(payload){
    var previous = getSyncStatus();
    var status = Object.assign({}, previous, payload || {}, {updatedAt:now()});
    try{window.localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status));}catch(error){console.warn("[BaseLocalFirebase] No se pudo guardar estado diario", error);}
    return status;
  }

  function getFirebaseConfigIfAvailable(){try{if(typeof firebaseConfig !== "undefined" && firebaseConfig){return firebaseConfig;}}catch(error){return null;}return null;}

  function ensureFirebaseInitialized(){
    if(!window.firebase || typeof window.firebase.firestore !== "function"){throw new Error("Firebase no está cargado. Revisa internet o los scripts de Firebase.");}
    try{
      if(!window.firebase.apps.length){
        var cfg = getFirebaseConfigIfAvailable();
        if(!cfg){throw new Error("No existe configuración Firebase para inicializar.");}
        window.firebase.initializeApp(cfg);
      }
    }catch(error){if(!window.firebase.apps || !window.firebase.apps.length){throw error;}}
  }

  function getDb(){
    ensureFirebaseInitialized();
    if(window.db && typeof window.db.collection === "function"){return window.db;}
    try{if(typeof db !== "undefined" && db && typeof db.collection === "function"){return db;}}catch(error){}
    return window.firebase.firestore();
  }

  function parseTime(value){var time = Date.parse(text(value));return Number.isFinite(time) ? time : 0;}
  function rowUpdatedAt(row){row = row || {};return parseTime(row.updatedAt || row.forceUploadedAt || row.ultimaSincronizacion || row.actualizadoEn || row.createdAt || row.creadoEn || "");}
  function maxUpdatedIso(rows, fallback){var max = 0;(rows || []).forEach(function(row){max = Math.max(max, rowUpdatedAt(row));});return max ? new Date(max).toISOString() : (fallback || now());}

  function normalizeSnapshot(snapshot){
    var base = snapshot && typeof snapshot === "object" ? snapshot : {};
    var periods = getPeriodosService().dedupe((base.periods || []).map(function(period){return getPeriodosService().normalizePeriod(period);}));
    var students = getEstudiantesService().normalizeLocalList(base.students || []);
    var maxDataUpdatedAt = maxUpdatedIso(students.concat(periods), "");
    var meta = Object.assign({app:"Requisitos", module:"ExcelLocal", version:"1.2.1", updatedAt:maxDataUpdatedAt || now()}, base.meta || {});
    meta.totalStudents = students.length;
    meta.totalPeriods = periods.length;
    meta.updatedAt = meta.updatedAt || maxDataUpdatedAt || now();
    return {meta:meta, periods:periods, students:students, history:Array.isArray(base.history) ? base.history : [], diagnostics:Array.isArray(base.diagnostics) ? base.diagnostics : []};
  }

  function readLocalSnapshot(){return normalizeSnapshot(getStorage().readSnapshot());}

  function writeLocalSnapshot(snapshot, action){
    var clean = normalizeSnapshot(snapshot);
    clean.meta = clean.meta || {};
    clean.meta.updatedAt = now();
    clean.history = Array.isArray(clean.history) ? clean.history : [];
    clean.history.unshift({id:"bl_" + (action || "sync") + "_" + Date.now(), action:action || "sync", periodoId:"TODOS", periodoLabel:"Todos los períodos", fileName:"Base Local", totalRows:Array.isArray(clean.students) ? clean.students.length : 0, totalPeriods:Array.isArray(clean.periods) ? clean.periods.length : 0, createdAt:now()});
    getStorage().writeSnapshot(clean);
    if(window.RequisitosBL && typeof window.RequisitosBL.mirrorSnapshotToCollections === "function"){window.RequisitosBL.mirrorSnapshotToCollections({force:true, silent:true});}
    emit("local-updated", {action:action || "sync"});
    return clean;
  }

  function backupCurrentLocal(reason){
    try{
      var current = readLocalSnapshot();
      var hasData = current && ((Array.isArray(current.students) && current.students.length) || (Array.isArray(current.periods) && current.periods.length));
      if(hasData){window.localStorage.setItem(BACKUP_KEY_PREFIX + Date.now(), JSON.stringify({reason:reason || "before_sync", createdAt:now(), snapshot:current}));}
    }catch(error){console.warn("[BaseLocalFirebase] No se pudo crear copia previa", error);}
  }

  function snapshotHasData(snapshot){return !!(snapshot && ((Array.isArray(snapshot.students) && snapshot.students.length) || (Array.isArray(snapshot.periods) && snapshot.periods.length)));}

  function snapshotUpdatedAt(snapshot){
    if(!snapshot){return 0;}
    var meta = snapshot.meta || {};
    var byMeta = parseTime(meta.updatedAt || meta.pulledAt || meta.createdAt || snapshot.updatedAt || snapshot.actualizadoEn || "");
    var byRows = 0;
    (snapshot.students || []).concat(snapshot.periods || []).forEach(function(row){byRows = Math.max(byRows, rowUpdatedAt(row));});
    return Math.max(byMeta, byRows);
  }

  async function readRemoteSnapshot(db){
    var pulledAt = now();
    var periodRows = await getPeriodosService().read(db);
    var studentRows = await getEstudiantesService().read(db);
    var remoteUpdatedAt = maxUpdatedIso(studentRows.concat(periodRows), pulledAt);
    return normalizeSnapshot({
      meta:{app:"Requisitos", module:"ExcelLocal", version:"1.2.1", source:"firebase", pulledAt:pulledAt, updatedAt:remoteUpdatedAt},
      periods:periodRows,
      students:studentRows,
      history:[{id:"firebase_pull_" + Date.now(), action:"pullFirebase", periodoId:"TODOS", periodoLabel:"Todos los períodos", fileName:"Firebase", totalRows:studentRows.length, totalPeriods:periodRows.length, createdAt:pulledAt}],
      diagnostics:[{ok:true, source:"firebase", pulledAt:pulledAt, updatedAt:remoteUpdatedAt, totalStudents:studentRows.length, totalPeriods:periodRows.length, collections:[{collection:"periodos", rows:periodRows.length}, {collection:"Estudiantes", rows:studentRows.length}]}]
    });
  }

  function cleanForFirebase(row){
    var clean = clone(row || {}) || {};
    Object.keys(clean).forEach(function(key){if(key.charAt(0) === "_"){delete clean[key];}});
    clean.updatedAt = clean.updatedAt || now();
    clean.ultimaSincronizacion = now();
    return clean;
  }

  function controlledStudentPatch(student){
    var patchService = getPatchService();
    if(patchService && typeof patchService.buildPatch === "function"){
      return patchService.buildPatch(student);
    }
    var docId = text(student.cedula || student.numeroIdentificacion || student.docId || student._docId);
    return {
      cedula:text(student.cedula || docId),
      numeroIdentificacion:text(student.numeroIdentificacion || student.cedula || docId),
      estadoMatricula:text(student.estadoMatricula || "ACTIVO"),
      retiradoEn:student.retiradoEn || "",
      historialEstadoMatricula:Array.isArray(student.historialEstadoMatricula) ? clone(student.historialEstadoMatricula) : [],
      periodoId:text(student.periodoId || ""),
      ultimoPeriodoId:text(student.ultimoPeriodoId || student.periodoId || ""),
      updatedAt:now(),
      ultimaSincronizacion:now()
    };
  }

  async function commitInChunks(db, writes){
    var size = 450;
    for(var i = 0; i < writes.length; i += size){
      var batch = db.batch();
      writes.slice(i, i + size).forEach(function(item){batch.set(item.ref, item.data, {merge:true});});
      await batch.commit();
    }
  }

  async function writeRemoteSnapshot(db, snapshot){
    var clean = normalizeSnapshot(snapshot);
    clean.meta = Object.assign({}, clean.meta || {}, {app:"Requisitos", module:"ExcelLocal", source:"local_to_firebase", updatedAt:now(), pushedAt:now(), totalStudents:Array.isArray(clean.students) ? clean.students.length : 0, totalPeriods:Array.isArray(clean.periods) ? clean.periods.length : 0});
    var writes = [];

    (clean.periods || []).forEach(function(period){
      var periodId = text(period.id || period.periodoId);
      if(periodId){writes.push({ref:db.collection("periodos").doc(periodId), data:cleanForFirebase(period)});}
    });

    (clean.students || []).forEach(function(student){
      var docId = text(student.cedula || student.numeroIdentificacion || student.docId || student._docId);
      if(!docId){return;}
      writes.push({ref:db.collection("Estudiantes").doc(docId), data:controlledStudentPatch(student)});
    });

    await commitInChunks(db, writes);
    return clean;
  }

  async function pull(){
    try{
      var db = getDb();
      var remote = await readRemoteSnapshot(db);
      if(!snapshotHasData(remote)){throw new Error("Firebase no devolvió estudiantes ni períodos para Base Local.");}
      backupCurrentLocal("before_pull");
      var written = writeLocalSnapshot(remote, "pullFirebase");
      var summary = saveStatus({ok:true, mode:"pull", source:"firebase", pulledAt:written.meta.pulledAt || now(), totalStudents:written.students.length, totalPeriods:written.periods.length, collections:[{collection:"periodos", rows:written.periods.length}, {collection:"Estudiantes", rows:written.students.length}], message:"Datos bajados correctamente desde Firebase."});
      saveSyncStatus({ok:true, mode:"pull", lastSyncDate:today(), lastSyncAt:now(), message:summary.message});
      emit("firebase-pull-finished", summary);
      return summary;
    }catch(error){
      var failed = saveStatus({ok:false, mode:"pull", source:"firebase", errorMessage:error && error.message ? error.message : String(error), message:error && error.message ? error.message : String(error)});
      saveSyncStatus({ok:false, mode:"pull_error", lastError:failed.message, message:failed.message});
      throw new Error(failed.message || "No se pudo bajar la información desde Firebase.");
    }
  }

  async function push(){
    try{
      var db = getDb();
      var local = readLocalSnapshot();
      if(!snapshotHasData(local)){throw new Error("La Base Local no tiene datos para subir a Firebase.");}
      var pushed = await writeRemoteSnapshot(db, local);
      var summary = saveStatus({ok:true, mode:"push", source:"local", pushedAt:now(), totalStudents:pushed.students.length, totalPeriods:pushed.periods.length, collections:[{collection:"periodos", rows:pushed.periods.length}, {collection:"Estudiantes", rows:pushed.students.length}], message:"Datos locales actualizados en Firebase con parche controlado."});
      saveSyncStatus({ok:true, mode:"push", lastSyncDate:today(), lastSyncAt:now(), message:summary.message});
      emit("firebase-push-finished", summary);
      return summary;
    }catch(error){
      var failed = saveStatus({ok:false, mode:"push", source:"local", errorMessage:error && error.message ? error.message : String(error), message:error && error.message ? error.message : String(error)});
      saveSyncStatus({ok:false, mode:"push_error", lastError:failed.message, message:failed.message});
      throw new Error(failed.message || "No se pudo subir la Base Local a Firebase.");
    }
  }

  async function sync(options){
    options = options || {};
    var mode = options.mode || "manual";
    if(navigator.onLine === false){
      var offline = saveSyncStatus({ok:false, mode:"offline", lastError:"Sin internet", message:"Sin internet. Base Local sigue funcionando y sincronizará después."});
      emit("sync-offline", offline);
      return offline;
    }

    try{
      var db = getDb();
      backupCurrentLocal("before_sync_" + mode);
      var local = readLocalSnapshot();
      var remote = await readRemoteSnapshot(db);
      var localHas = snapshotHasData(local);
      var remoteHas = snapshotHasData(remote);
      var action = "none";
      var finalSnapshot = local;

      if(localHas && !remoteHas){finalSnapshot = await writeRemoteSnapshot(db, local);action = "restore_firebase_from_local";}
      else if(!localHas && remoteHas){finalSnapshot = writeLocalSnapshot(remote, "restoreLocalFromFirebase");action = "restore_local_from_firebase";}
      else if(localHas && remoteHas){
        if(snapshotUpdatedAt(local) > snapshotUpdatedAt(remote)){finalSnapshot = await writeRemoteSnapshot(db, local);action = "local_newer_to_firebase_patch";}
        else{finalSnapshot = writeLocalSnapshot(remote, "firebaseNewerToLocal");action = "firebase_newer_to_local";}
      }else{action = "empty_both";}

      var summary = saveStatus({ok:true, mode:"sync", syncMode:mode, action:action, source:"Estudiantes_periodos", syncedAt:now(), totalStudents:finalSnapshot && finalSnapshot.students ? finalSnapshot.students.length : 0, totalPeriods:finalSnapshot && finalSnapshot.periods ? finalSnapshot.periods.length : 0, message:"Sincronización Base Local ↔ Firebase finalizada. Acción: " + action + "."});
      saveSyncStatus({ok:true, mode:"sync", action:action, lastSyncDate:today(), lastSyncAt:now(), message:summary.message});
      emit("sync-complete", summary);
      return summary;
    }catch(error){
      var failed = saveStatus({ok:false, mode:"sync", source:"Estudiantes_periodos", errorMessage:error && error.message ? error.message : String(error), message:error && error.message ? error.message : String(error)});
      saveSyncStatus({ok:false, mode:"sync_error", lastError:failed.message, message:failed.message});
      emit("sync-error", failed);
      throw new Error(failed.message || "No se pudo sincronizar Base Local con Firebase.");
    }
  }

  async function runDailyIfNeeded(forceRun){
    var daily = getDailyService();
    if(daily && !daily.shouldRun(forceRun)){return daily.skipped();}
    if(daily){daily.markStarted("daily");}
    try{var result = await sync({mode:"daily"});if(daily){daily.markSuccess(result);}return result;}
    catch(error){if(daily){daily.markError(error);}throw error;}
  }

  window.BaseLocalFirebase = {pull:pull, push:push, sync:sync, runDailyIfNeeded:runDailyIfNeeded, getLastStatus:getLastStatus, getSyncStatus:getSyncStatus, readLocalSnapshot:readLocalSnapshot, readRemoteSnapshot:function(){return readRemoteSnapshot(getDb());}};
})(window);
