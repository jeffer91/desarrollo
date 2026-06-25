/* =========================================================
Nombre completo: baselocal.firebase.js
Ruta o ubicación: /Requisitos/BaseLocal/baselocal.firebase.js
Función o funciones:
- Bajar información desde Firebase hacia la base local de BL.
- Leer estudiantes y períodos desde Firestore.
- Guardar la información bajada en ExcelLocalStorage.
- Mantener una copia local anterior antes de reemplazar la base local.
Con qué se conecta:
- baselocal.app.js
- excel-local.storage.js
- firebase-config.js
========================================================= */
(function(window){
  "use strict";

  var STATUS_KEY = "REQ_EXCEL_LOCAL_V1:firebasePullStatus";
  var BACKUP_KEY_PREFIX = "REQ_EXCEL_LOCAL_V1:beforeFirebasePull:";

  var COLLECTIONS = {
    students: ["Estudiantes", "estudiantes", "requisitos_estudiantes"],
    periods: ["periodos", "Periodos", "requisitos_periodos"],
    snapshots: ["requisitos_base_local", "base_local", "BaseLocal"]
  };

  function text(value){
    return String(value == null ? "" : value).trim();
  }

  function now(){
    return new Date().toISOString();
  }

  function clone(value){
    try{
      return JSON.parse(JSON.stringify(value == null ? null : value));
    }catch(error){
      return value;
    }
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

  function saveStatus(payload){
    var status = Object.assign({checkedAt: now()}, payload || {});
    try{
      window.localStorage.setItem(STATUS_KEY, JSON.stringify(status));
    }catch(error){
      console.warn("[BaseLocalFirebase] No se pudo guardar estado", error);
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
    }catch(error){
      // Continúa con firebase.firestore().
    }

    return window.firebase.firestore();
  }

  function docToObject(doc, collectionName){
    var data = cleanObject(typeof doc.data === "function" ? doc.data() : {});
    var id = text(doc.id || data.id || data._docId || data.docId);
    return Object.assign({}, data, {
      _firebaseId: id,
      _firebaseCollection: collectionName
    });
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
      return snap.docs.map(function(doc){
        return docToObject(doc, collectionName);
      });
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
        details.push({
          collection:name,
          rows:0,
          error:error && error.message ? error.message : String(error)
        });
      }
    }

    if(!successfulReads && firstError){
      throw firstError;
    }

    return {rows:all, details:details};
  }

  function pickPeriodId(row){
    return text(
      row.periodoId || row.periodId || row.idPeriodo || row.periodo_id ||
      row.periodo || row.Periodo || row.periodoLabel || row.cohorte ||
      row.Cohorte || row.periodoAcademico || row.periodo_academico ||
      row._firebaseId
    );
  }

  function pickPeriodLabel(row, fallbackId){
    return text(
      row.label || row.periodoLabel || row.nombre || row.nombrePeriodo ||
      row.periodo || row.Periodo || row.cohorte || row.Cohorte ||
      row.periodoAcademico || fallbackId
    );
  }

  function normalizePeriod(row){
    var src = cleanObject(row || {});
    var id = pickPeriodId(src);
    if(!id){
      return null;
    }
    return Object.assign({}, src, {
      id:id,
      label:pickPeriodLabel(src, id) || id,
      updatedAt:text(src.updatedAt || src.actualizadoEn || src.fechaActualizacion) || now()
    });
  }

  function inferPeriods(periodRows, studentRows){
    var map = {};
    var list = [];

    (periodRows || []).forEach(function(row){
      var period = normalizePeriod(row);
      if(period && !map[period.id]){
        map[period.id] = period;
        list.push(period);
      }
    });

    (studentRows || []).forEach(function(row){
      var id = pickPeriodId(row);
      if(!id || map[id]){
        return;
      }
      var label = pickPeriodLabel(row, id) || id;
      map[id] = {id:id, label:label, updatedAt:now(), inferredFrom:"Estudiantes"};
      list.push(map[id]);
    });

    if(!list.length && (studentRows || []).length){
      list.push({id:"SIN_PERIODO", label:"Sin período", updatedAt:now(), inferredFrom:"Estudiantes"});
    }

    return list;
  }

  function pickStudentId(row, index){
    return text(
      row._docId || row.docId || row._firebaseId || row.id || row.uid ||
      row.cedula || row.Cedula || row.CEDULA || row.numeroIdentificacion ||
      row.numeroidentificacion || row.NumeroIdentificacion || row.identificacion ||
      row.Identificacion || ("firebase_" + (index + 1))
    );
  }

  function normalizeStudent(row, index, periodFallback){
    var src = cleanObject(row || {});
    var periodId = pickPeriodId(src) || (periodFallback && periodFallback.id) || "SIN_PERIODO";
    var periodLabel = pickPeriodLabel(src, periodId) || (periodFallback && periodFallback.label) || periodId;
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
      _source:"firebase"
    });
  }

  function normalizeStudents(studentRows, periods){
    var defaultPeriod = periods && periods.length ? periods[0] : {id:"SIN_PERIODO", label:"Sin período"};
    var map = {};
    var rows = [];

    (studentRows || []).forEach(function(row, index){
      var student = normalizeStudent(row, index, defaultPeriod);
      var key = student.periodoId + "::" + (student.cedula || student.docId || index);
      map[key] = student;
    });

    Object.keys(map).forEach(function(key){
      rows.push(map[key]);
    });

    return rows;
  }

  function findSnapshotFromRows(snapshotRows){
    var found = null;
    (snapshotRows || []).forEach(function(row){
      if(found){
        return;
      }
      if(row && Array.isArray(row.students) && Array.isArray(row.periods)){
        found = row;
      }
      if(row && row.snapshot && Array.isArray(row.snapshot.students) && Array.isArray(row.snapshot.periods)){
        found = row.snapshot;
      }
    });
    return found;
  }

  function buildSnapshot(studentRows, periodRows, remoteDetails){
    var pulledAt = now();
    var periods = inferPeriods(periodRows, studentRows);
    var students = normalizeStudents(studentRows, periods);
    var storage = getStorage();
    var snapshot = {
      meta:{
        app:"Requisitos",
        module:"ExcelLocal",
        version:"1.0.0",
        source:"firebase",
        pulledAt:pulledAt,
        updatedAt:pulledAt,
        totalStudents:students.length,
        totalPeriods:periods.length
      },
      periods:periods,
      students:students,
      history:[{
        id:"firebase_pull_" + Date.now(),
        action:"pullFirebase",
        periodoId:"TODOS",
        periodoLabel:"Todos los períodos",
        fileName:"Firebase",
        totalRows:students.length,
        totalPeriods:periods.length,
        collections:remoteDetails || [],
        createdAt:pulledAt
      }],
      diagnostics:[{
        ok:true,
        source:"firebase",
        pulledAt:pulledAt,
        totalStudents:students.length,
        totalPeriods:periods.length,
        collections:remoteDetails || []
      }]
    };

    return storage.normalizeSnapshot(snapshot);
  }

  function backupCurrentLocal(){
    try{
      var storage = getStorage();
      var current = storage.readSnapshot();
      var hasData = current && (
        (Array.isArray(current.students) && current.students.length) ||
        (Array.isArray(current.periods) && current.periods.length) ||
        (Array.isArray(current.history) && current.history.length)
      );
      if(hasData){
        window.localStorage.setItem(BACKUP_KEY_PREFIX + Date.now(), JSON.stringify(current));
      }
    }catch(error){
      console.warn("[BaseLocalFirebase] No se pudo crear copia previa", error);
    }
  }

  async function pull(){
    try{
      var db = getDb();
      var storage = getStorage();
      var periodResult = await readCollections(db, COLLECTIONS.periods);
      var studentResult = await readCollections(db, COLLECTIONS.students);
      var snapshotResult = {rows:[], details:[]};

      if(!studentResult.rows.length && !periodResult.rows.length){
        snapshotResult = await readCollections(db, COLLECTIONS.snapshots);
      }

      var remoteSnapshot = findSnapshotFromRows(snapshotResult.rows);
      var snapshot;
      var details = periodResult.details.concat(studentResult.details).concat(snapshotResult.details);

      if(remoteSnapshot){
        snapshot = storage.normalizeSnapshot(remoteSnapshot);
        snapshot.meta = snapshot.meta || {};
        snapshot.meta.source = "firebase";
        snapshot.meta.pulledAt = now();
        snapshot.meta.updatedAt = now();
        snapshot.meta.totalStudents = Array.isArray(snapshot.students) ? snapshot.students.length : 0;
        snapshot.meta.totalPeriods = Array.isArray(snapshot.periods) ? snapshot.periods.length : 0;
      }else{
        snapshot = buildSnapshot(studentResult.rows, periodResult.rows, details);
      }

      if(!snapshot.students.length && !snapshot.periods.length){
        throw new Error("Firebase no devolvió estudiantes ni períodos para BL.");
      }

      backupCurrentLocal();
      storage.writeSnapshot(snapshot);

      var summary = saveStatus({
        ok:true,
        mode:"pull",
        source:"firebase",
        pulledAt:snapshot.meta.pulledAt || now(),
        totalStudents:snapshot.students.length,
        totalPeriods:snapshot.periods.length,
        collections:details,
        message:"Datos bajados correctamente desde Firebase."
      });

      try{
        window.dispatchEvent(new CustomEvent("baselocal:firebase-pull-finished", {detail:clone(summary)}));
      }catch(error){
        console.warn("[BaseLocalFirebase] No se pudo emitir evento de pull", error);
      }

      return summary;
    }catch(error){
      var failed = saveStatus({
        ok:false,
        mode:"pull",
        source:"firebase",
        errorMessage:error && error.message ? error.message : String(error),
        message:error && error.message ? error.message : String(error)
      });
      throw new Error(failed.message || "No se pudo bajar la información desde Firebase.");
    }
  }

  async function pending(){
    return {
      ok:false,
      skipped:true,
      message:"Esta acción todavía no está habilitada en BL. Usa Bajar desde Firebase."
    };
  }

  async function compare(){
    var local = getStorage().readSnapshot();
    var status = getLastStatus();
    return {
      ok:true,
      localStudents:Array.isArray(local.students) ? local.students.length : 0,
      localPeriods:Array.isArray(local.periods) ? local.periods.length : 0,
      firebaseStatus:status
    };
  }

  window.BaseLocalFirebase = {
    push:pending,
    pull:pull,
    compare:compare,
    getLastStatus:getLastStatus
  };
})(window);