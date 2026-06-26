/* =========================================================
Nombre completo: baselocal.firebase.js
Ruta o ubicación: /Requisitos/BaseLocal/baselocal.firebase.js
Función o funciones:
- Sincronizar Base Local ↔ Firebase una vez al día al abrir BL.
- Permitir sincronización manual con botón.
- Mantener funcionando la base local aunque no haya internet.
- Evitar que cédulas se interpreten como períodos.
- Unificar períodos repetidos por mayúsculas, minúsculas o tildes.
Con qué se conecta:
- baselocal.app.js
- baselocal.connector.js
- excel-local.storage.js
- firebase-config.js
========================================================= */
(function(window){
  "use strict";

  var STATUS_KEY = "REQ_EXCEL_LOCAL_V1:firebasePullStatus";
  var SYNC_STATUS_KEY = "REQ_BL_DAILY_SYNC_STATUS_V1";
  var BACKUP_KEY_PREFIX = "REQ_EXCEL_LOCAL_V1:beforeFirebaseSync:";
  var SIGNAL_KEY = "REQ_BL_SIGNAL_V1";

  var COLLECTIONS = {
    students:["Estudiantes", "estudiantes", "requisitos_estudiantes"],
    periods:["periodos", "Periodos", "requisitos_periodos"],
    snapshots:["requisitos_base_local", "base_local", "BaseLocal"]
  };

  var MONTHS = {
    enero:"Enero", febrero:"Febrero", marzo:"Marzo", abril:"Abril", mayo:"Mayo", junio:"Junio",
    julio:"Julio", agosto:"Agosto", septiembre:"Septiembre", setiembre:"Septiembre",
    octubre:"Octubre", noviembre:"Noviembre", diciembre:"Diciembre"
  };

  function text(value){
    return String(value == null ? "" : value).trim();
  }

  function now(){
    return new Date().toISOString();
  }

  function today(){
    return now().slice(0, 10);
  }

  function clone(value){
    try{
      return JSON.parse(JSON.stringify(value == null ? null : value));
    }catch(error){
      return value;
    }
  }

  function normalizeText(value){
    return text(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isCedulaLike(value){
    return /^\d{7,13}$/.test(text(value));
  }

  function hasMonthAndYear(value){
    var clean = normalizeText(value);
    return /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\b/.test(clean) && /20\d{2}/.test(clean);
  }

  function isValidPeriodText(value){
    var raw = text(value);
    var clean = normalizeText(raw);
    if(!raw || isCedulaLike(raw)){
      return false;
    }
    if(clean === "sin_periodo" || clean === "sin periodo"){
      return true;
    }
    return hasMonthAndYear(raw);
  }

  function periodKey(value){
    var clean = normalizeText(value);
    if(clean === "setiembre"){
      clean = "septiembre";
    }
    return clean.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  }

  function prettyPeriodLabel(value){
    var clean = normalizeText(value);
    if(!clean){
      return text(value);
    }
    Object.keys(MONTHS).forEach(function(month){
      clean = clean.replace(new RegExp("\\b" + month + "\\b", "g"), MONTHS[month]);
    });
    return clean.replace(/\ba\b/g, "a").replace(/\s+/g, " ").trim();
  }

  function safeDate(value){
    try{
      if(value && typeof value.toDate === "function"){
        return value.toDate().toISOString();
      }
      if(value instanceof Date){
        return value.toISOString();
      }
    }catch(error){
      return text(value);
    }
    return value;
  }

  function cleanValue(value){
    var dated = safeDate(value);
    if(dated !== value){
      return dated;
    }
    if(Array.isArray(value)){
      return value.map(cleanValue);
    }
    if(value && typeof value === "object"){
      var out = {};
      Object.keys(value).forEach(function(key){
        out[key] = cleanValue(value[key]);
      });
      return out;
    }
    return value;
  }

  function cleanObject(value){
    return cleanValue(value || {});
  }

  function emit(kind, payload){
    var detail = Object.assign({kind:kind, at:now()}, payload || {});
    try{
      window.dispatchEvent(new CustomEvent("baselocal:" + kind, {detail:clone(detail)}));
      window.dispatchEvent(new CustomEvent("requisitos:bl:" + kind, {detail:clone(detail)}));
      window.dispatchEvent(new CustomEvent("bl:" + kind, {detail:clone(detail)}));
    }catch(error){}
    try{
      if(window.parent && window.parent !== window){
        window.parent.postMessage({type:"requisitos:bl:" + kind, payload:detail}, "*");
      }
    }catch(error){}
    try{
      window.localStorage.setItem(SIGNAL_KEY, JSON.stringify({id:"signal-" + Date.now(), kind:kind, payload:detail, at:now()}));
    }catch(error){}
  }

  function saveStatus(payload){
    var status = Object.assign({checkedAt:now()}, payload || {});
    try{
      window.localStorage.setItem(STATUS_KEY, JSON.stringify(status));
    }catch(error){
      console.warn("[BaseLocalFirebase] No se pudo guardar estado", error);
    }
    return status;
  }

  function getSyncStatus(){
    try{
      var raw = window.localStorage.getItem(SYNC_STATUS_KEY);
      return raw ? JSON.parse(raw) : {ok:false, mode:"sin_estado", lastSyncDate:""};
    }catch(error){
      return {ok:false, mode:"sin_estado", lastSyncDate:""};
    }
  }

  function saveSyncStatus(payload){
    var previous = getSyncStatus();
    var status = Object.assign({}, previous, payload || {}, {updatedAt:now()});
    try{
      window.localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(status));
    }catch(error){
      console.warn("[BaseLocalFirebase] No se pudo guardar estado diario", error);
    }
    return status;
  }

  function getLastStatus(){
    try{
      var raw = window.localStorage.getItem(STATUS_KEY);
      return raw ? JSON.parse(raw) : {ok:false, mode:"sin_estado"};
    }catch(error){
      return {ok:false, mode:"sin_estado"};
    }
  }

  function getStorage(){
    if(!window.ExcelLocalStorage){
      throw new Error("ExcelLocalStorage no está disponible.");
    }
    return window.ExcelLocalStorage;
  }

  function getFirebaseConfigIfAvailable(){
    try{
      if(typeof firebaseConfig !== "undefined" && firebaseConfig){
        return firebaseConfig;
      }
    }catch(error){
      return null;
    }
    return null;
  }

  function ensureFirebaseInitialized(){
    if(!window.firebase || typeof window.firebase.firestore !== "function"){
      throw new Error("Firebase no está cargado. Revisa internet o los scripts de Firebase.");
    }
    try{
      if(!window.firebase.apps.length){
        var cfg = getFirebaseConfigIfAvailable();
        if(!cfg){
          throw new Error("No existe configuración Firebase para inicializar.");
        }
        window.firebase.initializeApp(cfg);
      }
    }catch(error){
      if(!window.firebase.apps || !window.firebase.apps.length){
        throw error;
      }
    }
  }

  function getDb(){
    ensureFirebaseInitialized();
    if(window.db && typeof window.db.collection === "function"){
      return window.db;
    }
    try{
      if(typeof db !== "undefined" && db && typeof db.collection === "function"){
        return db;
      }
    }catch(error){}
    return window.firebase.firestore();
  }

  function docToObject(doc, collectionName){
    var data = cleanObject(typeof doc.data === "function" ? doc.data() : {});
    var id = text(doc.id || data.id || data._docId || data.docId);
    return Object.assign({}, data, {_firebaseId:id, _firebaseCollection:collectionName});
  }

  async function readCollection(db, collectionName){
    var snap = await db.collection(collectionName).get();
    var rows = [];
    if(snap && typeof snap.forEach === "function"){
      snap.forEach(function(doc){
        rows.push(docToObject(doc, collectionName));
      });
      return rows;
    }
    if(snap && Array.isArray(snap.docs)){
      return snap.docs.map(function(doc){return docToObject(doc, collectionName);});
    }
    return rows;
  }

  async function readCollections(db, names){
    var all = [];
    var details = [];
    var firstError = null;
    var successfulReads = 0;
    for(var i = 0; i < names.length; i += 1){
      var name = names[i];
      if(!name){
        continue;
      }
      try{
        var rows = await readCollection(db, name);
        successfulReads += 1;
        if(rows.length){
          all = all.concat(rows);
        }
        details.push({collection:name, rows:rows.length});
      }catch(error){
        if(!firstError){
          firstError = error;
        }
        details.push({collection:name, rows:0, error:error && error.message ? error.message : String(error)});
      }
    }
    if(!successfulReads && firstError){
      throw firstError;
    }
    return {rows:all, details:details};
  }

  function pickValidPeriodText(row, allowDocId){
    row = row || {};
    var candidates = [
      row.periodoId,
      row.periodId,
      row.idPeriodo,
      row.periodo_id,
      row.periodoLabel,
      row.label,
      row.nombrePeriodo,
      row.periodo,
      row.Periodo,
      row.cohorte,
      row.Cohorte,
      row.periodoAcademico,
      row.periodo_academico
    ];
    if(allowDocId){
      candidates.push(row.id, row._firebaseId);
    }
    for(var i = 0; i < candidates.length; i += 1){
      if(isValidPeriodText(candidates[i])){
        return text(candidates[i]);
      }
    }
    return "";
  }

  function normalizePeriod(row){
    var src = cleanObject(row || {});
    var raw = pickValidPeriodText(src, true);
    if(!raw){
      return null;
    }
    var id = periodKey(raw) || "SIN_PERIODO";
    return Object.assign({}, src, {
      id:id,
      periodoId:id,
      label:prettyPeriodLabel(raw),
      periodoLabel:prettyPeriodLabel(raw),
      updatedAt:text(src.updatedAt || src.actualizadoEn || src.fechaActualizacion) || now()
    });
  }

  function inferPeriods(periodRows, studentRows){
    var map = {};
    var list = [];

    function add(period){
      if(!period){
        return;
      }
      var key = periodKey(period.label || period.id);
      if(!key || map[key]){
        return;
      }
      map[key] = true;
      list.push(period);
    }

    (periodRows || []).forEach(function(row){
      add(normalizePeriod(row));
    });

    (studentRows || []).forEach(function(row){
      var raw = pickValidPeriodText(row, false);
      if(!raw){
        return;
      }
      add({id:periodKey(raw), periodoId:periodKey(raw), label:prettyPeriodLabel(raw), periodoLabel:prettyPeriodLabel(raw), updatedAt:now(), inferredFrom:"Estudiantes"});
    });

    if(!list.length && (studentRows || []).length){
      list.push({id:"SIN_PERIODO", periodoId:"SIN_PERIODO", label:"Sin período", periodoLabel:"Sin período", updatedAt:now(), inferredFrom:"Estudiantes"});
    }
    return list;
  }

  function pickStudentId(row, index){
    return text(row._docId || row.docId || row._firebaseId || row.id || row.uid || row.cedula || row.Cedula || row.CEDULA || row.numeroIdentificacion || row.numeroidentificacion || row.NumeroIdentificacion || row.identificacion || row.Identificacion || ("firebase_" + (index + 1)));
  }

  function normalizeStudent(row, index, periods){
    var src = cleanObject(row || {});
    var rawPeriod = pickValidPeriodText(src, false);
    var fallbackPeriod = periods && periods.length ? periods[0] : {id:"SIN_PERIODO", label:"Sin período"};
    var periodId = rawPeriod ? periodKey(rawPeriod) : fallbackPeriod.id;
    var periodLabel = rawPeriod ? prettyPeriodLabel(rawPeriod) : fallbackPeriod.label;
    var docId = pickStudentId(src, index);
    var cedula = text(src.cedula || src.Cedula || src.CEDULA || src.numeroIdentificacion || src.numeroidentificacion || src.NumeroIdentificacion || src.identificacion || src.Identificacion || docId);
    var nombres = text(src.nombres || src.Nombres || src.nombre || src.Nombre || src.estudiante || src.Estudiante || src.apellidosNombres || src.apellidos_nombres);
    var carrera = text(src.nombrecarrera || src.nombreCarrera || src.NombreCarrera || src.carrera || src.Carrera || src.programa || src.Programa);

    return Object.assign({}, src, {
      _docId:docId,
      docId:docId,
      periodoId:periodId,
      periodoLabel:periodLabel,
      cedula:cedula,
      numeroIdentificacion:text(src.numeroIdentificacion || src.numeroidentificacion || cedula),
      nombres:nombres,
      nombrecarrera:carrera,
      updatedAt:text(src.updatedAt || src.actualizadoEn || src.fechaActualizacion) || now(),
      _source:src._source || "firebase"
    });
  }

  function normalizeStudents(studentRows, periods){
    var map = {};
    (studentRows || []).forEach(function(row, index){
      var student = normalizeStudent(row, index, periods);
      var key = student.periodoId + "::" + (student.cedula || student.docId || index);
      map[key] = student;
    });
    return Object.keys(map).map(function(key){return map[key];});
  }

  function findSnapshotFromRows(snapshotRows){
    var found = null;
    (snapshotRows || []).forEach(function(row){
      if(found){
        return;
      }
      if(row && Array.isArray(row.students) && Array.isArray(row.periods)){
        found = row;
      }else if(row && row.snapshot && Array.isArray(row.snapshot.students) && Array.isArray(row.snapshot.periods)){
        found = row.snapshot;
      }
    });
    return found;
  }

  function normalizeSnapshot(snapshot){
    var base = snapshot || {};
    var meta = Object.assign({app:"Requisitos", module:"ExcelLocal", updatedAt:now()}, base.meta || {});
    var rawStudents = Array.isArray(base.students) ? base.students : [];
    var rawPeriods = Array.isArray(base.periods) ? base.periods : [];
    var periods = inferPeriods(rawPeriods, rawStudents);
    var students = normalizeStudents(rawStudents, periods);
    meta.totalStudents = students.length;
    meta.totalPeriods = periods.length;
    return {
      meta:meta,
      periods:periods,
      students:students,
      history:Array.isArray(base.history) ? base.history : [],
      diagnostics:Array.isArray(base.diagnostics) ? base.diagnostics : []
    };
  }

  function buildSnapshot(studentRows, periodRows, remoteDetails){
    var pulledAt = now();
    var periods = inferPeriods(periodRows, studentRows);
    var students = normalizeStudents(studentRows, periods);
    return normalizeSnapshot({
      meta:{app:"Requisitos", module:"ExcelLocal", version:"1.0.1", source:"firebase", pulledAt:pulledAt, updatedAt:pulledAt},
      periods:periods,
      students:students,
      history:[{id:"firebase_pull_" + Date.now(), action:"pullFirebase", periodoId:"TODOS", periodoLabel:"Todos los períodos", fileName:"Firebase", totalRows:students.length, totalPeriods:periods.length, collections:remoteDetails || [], createdAt:pulledAt}],
      diagnostics:[{ok:true, source:"firebase", pulledAt:pulledAt, totalStudents:students.length, totalPeriods:periods.length, collections:remoteDetails || []}]
    });
  }

  function readLocalSnapshot(){
    return normalizeSnapshot(getStorage().readSnapshot());
  }

  function writeLocalSnapshot(snapshot, action){
    var storage = getStorage();
    var clean = normalizeSnapshot(snapshot);
    clean.meta = clean.meta || {};
    clean.meta.updatedAt = clean.meta.updatedAt || now();
    clean.history = Array.isArray(clean.history) ? clean.history : [];
    clean.history.unshift({
      id:"bl_" + (action || "sync") + "_" + Date.now(),
      action:action || "sync",
      periodoId:"TODOS",
      periodoLabel:"Todos los períodos",
      fileName:"BaseLocal",
      totalRows:Array.isArray(clean.students) ? clean.students.length : 0,
      totalPeriods:Array.isArray(clean.periods) ? clean.periods.length : 0,
      createdAt:now()
    });
    storage.writeSnapshot(clean);
    if(window.RequisitosBL && typeof window.RequisitosBL.mirrorSnapshotToCollections === "function"){
      window.RequisitosBL.mirrorSnapshotToCollections({force:true, silent:true});
    }
    emit("local-updated", {action:action || "sync"});
    return clean;
  }

  function backupCurrentLocal(reason){
    try{
      var current = readLocalSnapshot();
      var hasData = current && ((Array.isArray(current.students) && current.students.length) || (Array.isArray(current.periods) && current.periods.length) || (Array.isArray(current.history) && current.history.length));
      if(hasData){
        window.localStorage.setItem(BACKUP_KEY_PREFIX + Date.now(), JSON.stringify({reason:reason || "before_sync", createdAt:now(), snapshot:current}));
      }
    }catch(error){
      console.warn("[BaseLocalFirebase] No se pudo crear copia previa", error);
    }
  }

  function snapshotHasData(snapshot){
    return !!(snapshot && ((Array.isArray(snapshot.students) && snapshot.students.length) || (Array.isArray(snapshot.periods) && snapshot.periods.length)));
  }

  function snapshotUpdatedAt(snapshot){
    if(!snapshot){
      return 0;
    }
    var meta = snapshot.meta || {};
    var raw = meta.updatedAt || meta.pulledAt || meta.createdAt || snapshot.updatedAt || snapshot.actualizadoEn || "";
    var time = Date.parse(raw);
    return Number.isFinite(time) ? time : 0;
  }

  async function readRemoteSnapshot(db){
    var snapshotResult = await readCollections(db, COLLECTIONS.snapshots);
    var remoteSnapshot = findSnapshotFromRows(snapshotResult.rows);
    if(remoteSnapshot){
      return {snapshot:normalizeSnapshot(remoteSnapshot), details:snapshotResult.details, source:"snapshot"};
    }
    var periodResult = await readCollections(db, COLLECTIONS.periods);
    var studentResult = await readCollections(db, COLLECTIONS.students);
    var details = periodResult.details.concat(studentResult.details).concat(snapshotResult.details);
    return {snapshot:buildSnapshot(studentResult.rows, periodResult.rows, details), details:details, source:"collections"};
  }

  async function writeRemoteSnapshot(db, snapshot){
    var clean = normalizeSnapshot(snapshot);
    clean.meta = Object.assign({}, clean.meta || {}, {
      app:"Requisitos",
      module:"ExcelLocal",
      source:"local_to_firebase",
      updatedAt:clean.meta && clean.meta.updatedAt ? clean.meta.updatedAt : now(),
      pushedAt:now(),
      totalStudents:Array.isArray(clean.students) ? clean.students.length : 0,
      totalPeriods:Array.isArray(clean.periods) ? clean.periods.length : 0
    });

    await db.collection("requisitos_base_local").doc("snapshot_principal").set(clean, {merge:true});

    var batchLimit = 400;
    var students = Array.isArray(clean.students) ? clean.students : [];
    var periods = Array.isArray(clean.periods) ? clean.periods : [];

    for(var p = 0; p < periods.length && p < batchLimit; p += 1){
      var period = periods[p] || {};
      var periodId = text(period.id || period.periodoId || periodKey(period.label) || ("periodo_" + p));
      if(periodId && !isCedulaLike(periodId)){
        await db.collection("requisitos_periodos").doc(periodId).set(cleanObject(period), {merge:true});
      }
    }

    for(var s = 0; s < students.length && s < batchLimit; s += 1){
      var student = students[s] || {};
      var docId = text(student.docId || student._docId || student.id || student.cedula || student.numeroIdentificacion || ("student_" + s));
      if(docId){
        await db.collection("requisitos_estudiantes").doc(docId).set(cleanObject(student), {merge:true});
      }
    }
    return clean;
  }

  async function pull(){
    try{
      var db = getDb();
      var remote = await readRemoteSnapshot(db);
      var snapshot = remote.snapshot;
      if(!snapshotHasData(snapshot)){
        throw new Error("Firebase no devolvió estudiantes ni períodos para BL.");
      }
      backupCurrentLocal("before_pull");
      var written = writeLocalSnapshot(snapshot, "pullFirebase");
      var summary = saveStatus({
        ok:true,
        mode:"pull",
        source:"firebase",
        pulledAt:written.meta.pulledAt || now(),
        totalStudents:written.students.length,
        totalPeriods:written.periods.length,
        collections:remote.details,
        message:"Datos bajados correctamente desde Firebase. Períodos depurados: " + written.periods.length + "."
      });
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
      if(!snapshotHasData(local)){
        throw new Error("La Base Local no tiene datos para subir a Firebase.");
      }
      var pushed = await writeRemoteSnapshot(db, local);
      var summary = saveStatus({
        ok:true,
        mode:"push",
        source:"local",
        pushedAt:now(),
        totalStudents:pushed.students.length,
        totalPeriods:pushed.periods.length,
        message:"Datos locales depurados y actualizados en Firebase."
      });
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
      var remoteResult = await readRemoteSnapshot(db);
      var remote = remoteResult.snapshot;
      var localHas = snapshotHasData(local);
      var remoteHas = snapshotHasData(remote);
      var action = "none";
      var finalSnapshot = local;

      if(localHas && !remoteHas){
        finalSnapshot = await writeRemoteSnapshot(db, local);
        action = "restore_firebase_from_local";
      }else if(!localHas && remoteHas){
        finalSnapshot = writeLocalSnapshot(remote, "restoreLocalFromFirebase");
        action = "restore_local_from_firebase";
      }else if(localHas && remoteHas){
        if(snapshotUpdatedAt(local) >= snapshotUpdatedAt(remote)){
          finalSnapshot = await writeRemoteSnapshot(db, local);
          action = "local_newer_to_firebase";
        }else{
          finalSnapshot = writeLocalSnapshot(remote, "firebaseNewerToLocal");
          action = "firebase_newer_to_local";
        }
      }else{
        action = "empty_both";
      }

      var summary = saveStatus({
        ok:true,
        mode:"sync",
        syncMode:mode,
        action:action,
        source:"local_firebase_compare",
        syncedAt:now(),
        totalStudents:Array.isArray(finalSnapshot.students) ? finalSnapshot.students.length : 0,
        totalPeriods:Array.isArray(finalSnapshot.periods) ? finalSnapshot.periods.length : 0,
        localUpdatedAt:(local.meta || {}).updatedAt || "",
        remoteUpdatedAt:(remote.meta || {}).updatedAt || "",
        collections:remoteResult.details || [],
        message:"Sincronización BL finalizada. Períodos corregidos. Acción: " + action
      });
      saveSyncStatus({ok:true, mode:mode, lastSyncDate:today(), lastSyncAt:now(), action:action, message:summary.message});
      emit("sync-complete", summary);
      return summary;
    }catch(error){
      var failed = saveStatus({ok:false, mode:"sync", syncMode:mode, errorMessage:error && error.message ? error.message : String(error), message:error && error.message ? error.message : String(error)});
      saveSyncStatus({ok:false, mode:"sync_error", lastError:failed.message, message:failed.message});
      emit("sync-error", failed);
      return failed;
    }
  }

  async function runDailyIfNeeded(){
    var status = getSyncStatus();
    if(status.lastSyncDate === today() && status.ok){
      return {ok:true, skipped:true, mode:"daily", message:"La sincronización diaria ya se ejecutó hoy.", status:status};
    }
    return sync({mode:"daily_first_open"});
  }

  async function compare(){
    var local = readLocalSnapshot();
    return {
      ok:true,
      localStudents:Array.isArray(local.students) ? local.students.length : 0,
      localPeriods:Array.isArray(local.periods) ? local.periods.length : 0,
      localUpdatedAt:(local.meta || {}).updatedAt || "",
      firebaseStatus:getLastStatus(),
      syncStatus:getSyncStatus()
    };
  }

  window.BaseLocalFirebase = {
    push:push,
    pull:pull,
    sync:sync,
    syncNow:sync,
    runDailyIfNeeded:runDailyIfNeeded,
    compare:compare,
    getLastStatus:getLastStatus,
    getSyncStatus:getSyncStatus
  };
})(window);
