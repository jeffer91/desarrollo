/* =========================================================
Nombre completo: excel-local.storage.js
Ruta o ubicación: /Requisitos/Gestion/Excel/excel-local/excel-local.storage.js
Función o funciones:
- Persistir snapshot local en localStorage de forma rápida.
- Reutilizar la sesión rápida de Requisitos cuando exista.
- Evitar leer y normalizar toda la Base Local en cada pantalla.
- Mantener estructura estable para Base Local, Tabla, Ficha, Stats y Reportes.
- Migrar datos antiguos sin borrar campos nuevos de Firebase.
- Asegurar soporte para estadoMatricula, historialEstadoMatricula y divisiones.
- Proteger el guardado cuando localStorage supera la cuota.
- Mantener la Base Local operativa en memoria si el navegador ya no permite guardar más datos.
- Conservar los requisitos cuando se usa snapshot reducido por cuota.
Con qué se conecta:
- maq-baselocal-session.js
- excel-local.bridge.js
- excel-local.repo.js
- bl-periodos-canon.service.js
- bl-divisiones.service.js
========================================================= */
(function(window){
  "use strict";

  var VERSION = "1.4.4";
  var STATUS_KEY = "REQ_EXCEL_LOCAL_V1:storageStatus";
  var memory = {loaded:false,raw:"",snapshot:null,source:"none"};

  var REQUIREMENT_ALIASES = {
    Academico:["Academico","Académico","academico","académico"],
    Documentacion:["Documentacion","Documentación","documentacion","documentación"],
    Financiero:["Financiero","financiero"],
    Titulacion:["Titulacion","Titulación","titulacion","titulación"],
    "PrácticasVinculacion":["PrácticasVinculacion","PracticasVinculacion","practicasVinculacion","prácticasVinculacion","Prácticas Vinculación","Practicas Vinculacion","Prácticas/Vinculación","Practicas/Vinculacion","practicasvinculacion"],
    Vinculacion:["Vinculacion","Vinculación","vinculacion","vinculación"],
    SeguimientoGraduados:["SeguimientoGraduados","seguimientoGraduados","seguimientograduados","Seguimiento graduados"],
    Ingles:["Ingles","Inglés","ingles","inglés"],
    "ActualizaciónDatos":["ActualizaciónDatos","ActualizacionDatos","actualizacionDatos","actualizaciónDatos","actualizaciondatos","Actualización de datos","Actualizacion de datos"],
    AprobacionTitulacion:["AprobacionTitulacion","AprobaciónTitulacion","Aprobacion Titulacion","aprobacionTitulacion","aprobaciontitulacion"],
    AprobacionComplexivoProyecto:["AprobacionComplexivoProyecto","AprobaciónComplexivoProyecto","Aprobacion Complexivo Proyecto","Aprobacion Complexivo/Proyecto","aprobacionComplexivoProyecto","aprobacioncomplexivoproyecto"]
  };

  function clone(value){try{return JSON.parse(JSON.stringify(value==null?null:value));}catch(e){return value;}}
  function now(){return new Date().toISOString();}
  function text(value){return String(value==null?"":value).trim();}
  function norm(value){return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim().toLowerCase();}
  function keyNorm(value){return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]/g,"").toLowerCase();}

  function emptySnapshot(){return {meta:{app:"Requisitos",module:"ExcelLocal",version:VERSION,schemaVersion:4,createdAt:now(),updatedAt:now()},periods:[],students:[],history:[],diagnostics:[]};}
  function key(){return (window.ExcelLocalConfig&&window.ExcelLocalConfig.keys&&window.ExcelLocalConfig.keys.snapshot)||"REQ_EXCEL_LOCAL_V1:snapshot";}

  function isQuotaError(error){
    var msg = text(error && (error.message || error.name || error));
    return !!(error && (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED" || error.code === 22 || error.code === 1014 || /quota|exceeded/i.test(msg)));
  }

  function saveStorageStatus(status){
    try{localStorage.setItem(STATUS_KEY, JSON.stringify(Object.assign({updatedAt:now(),version:VERSION}, status || {})));}catch(error){}
  }

  function purgeHeavyLocalCopies(){
    var removed = 0;
    var freedChars = 0;
    var prefixes = ["REQ_BL_DB_V1::", "REQ_EXCEL_LOCAL_V1:beforeFirebaseSync:"];
    try{
      for(var i = localStorage.length - 1; i >= 0; i--){
        var k = localStorage.key(i) || "";
        if(k === key() || k === STATUS_KEY){continue;}
        var shouldRemove = prefixes.some(function(prefix){return k.indexOf(prefix) === 0;});
        if(!shouldRemove){continue;}
        try{freedChars += (localStorage.getItem(k) || "").length;}catch(error){}
        try{localStorage.removeItem(k);removed += 1;}catch(error){}
      }
    }catch(error){}
    try{sessionStorage.removeItem("REQ_BL_MIRROR_SIGNATURE_V1");}catch(error){}
    return {removed:removed,freedChars:freedChars};
  }

  function isHeavyField(keyName, value){
    var k = norm(keyName);
    if(k.indexOf("base64") >= 0 || k.indexOf("buffer") >= 0 || k.indexOf("blob") >= 0){return true;}
    if(k === "raw" || k === "_raw" || k === "archivo" || k === "archivooriginal" || k === "exceloriginal" || k === "contenidooriginal"){return true;}
    if(typeof value === "string" && value.length > 12000){return true;}
    return false;
  }

  function compactRecord(record){
    var source = record && typeof record === "object" ? record : {};
    var out = Array.isArray(source) ? [] : {};
    Object.keys(source).forEach(function(k){
      var value = source[k];
      if(isHeavyField(k, value)){return;}
      if(typeof value === "string" && value.length > 8000){out[k] = value.slice(0,8000) + "… [recortado por Base Local]";return;}
      out[k] = value;
    });
    return out;
  }

  function getOwnKey(row, wanted){
    row = row || {};
    var keys = Object.keys(row);
    var wantedNorm = keyNorm(wanted);
    for(var i = 0; i < keys.length; i += 1){
      if(keys[i] === wanted || keyNorm(keys[i]) === wantedNorm){return keys[i];}
    }
    return "";
  }

  function valueFromAliases(row, aliases){
    aliases = aliases || [];
    for(var i = 0; i < aliases.length; i += 1){
      var key = getOwnKey(row, aliases[i]);
      if(key && row[key] != null && text(row[key]) !== ""){return row[key];}
    }
    return "";
  }

  function copyRequirementFields(source, target){
    source = source || {};
    target = target || {};
    Object.keys(REQUIREMENT_ALIASES).forEach(function(canonical){
      var aliases = REQUIREMENT_ALIASES[canonical];
      var value = "";
      try{
        if(window.BLCampos && typeof window.BLCampos.getValue === "function"){
          var canonicalForCampos = canonical.charAt(0).toLowerCase() + canonical.slice(1);
          value = window.BLCampos.getValue(source, canonicalForCampos, "");
        }
      }catch(error){}
      if(text(value) === ""){value = valueFromAliases(source, aliases);}
      if(text(value) !== ""){
        target[canonical] = value;
        var lowerKey = keyNorm(canonical);
        if(!target[lowerKey]){target[lowerKey] = value;}
      }
    });
    return target;
  }

  function minimalStudent(student){
    student = student && typeof student === "object" ? student : {};
    var out = {
      cedula:text(student.cedula || student.Cedula || student.CEDULA || student.numeroIdentificacion || student.numeroidentificacion || student.identificacion || student.docId || student._docId || student.id),
      numeroIdentificacion:text(student.numeroIdentificacion || student.numeroidentificacion || student.cedula || student.Cedula || student.docId || student._docId || student.id),
      docId:text(student.docId || student._docId || student.cedula || student.numeroIdentificacion || student.id),
      nombres:text(student.nombres || student.Nombres || student.nombresCompletos || student.nombre || student.Nombre),
      Nombres:text(student.Nombres || student.nombres || student.nombresCompletos || student.nombre || student.Nombre),
      apellidos:text(student.apellidos || student.Apellidos || ""),
      nombrecarrera:text(student.nombrecarrera || student.nombreCarrera || student.NombreCarrera || student.carrera || student.Carrera || student.programa || student.Programa),
      NombreCarrera:text(student.NombreCarrera || student.nombreCarrera || student.nombrecarrera || student.carrera || student.Carrera || student.programa || student.Programa),
      CodigoCarrera:text(student.CodigoCarrera || student.codigoCarrera || student.codigocarrera || ""),
      Sede:text(student.Sede || student.sede || ""),
      sede:text(student.sede || student.Sede || ""),
      HorarioComplexivo:text(student.HorarioComplexivo || student.horarioComplexivo || student.horariocomplexivo || student.horario || ""),
      modalidad:text(student.modalidad || student.Modalidad || ""),
      jornada:text(student.jornada || student.Jornada || ""),
      periodoId:text(student.periodoId || student.periodoLabel || student.periodo || student.ultimoPeriodoId || ""),
      periodoLabel:text(student.periodoLabel || student.periodo || student.periodoId || ""),
      ultimoPeriodoId:text(student.ultimoPeriodoId || student.periodoId || student.periodoLabel || ""),
      estadoMatricula:text(student.estadoMatricula || "ACTIVO").toUpperCase() === "RETIRADO" ? "RETIRADO" : "ACTIVO",
      CorreoPersonal:text(student.CorreoPersonal || student.correoPersonal || student.correopersonal || ""),
      CorreoInstitucional:text(student.CorreoInstitucional || student.correoInstitucional || student.correoinstitucional || ""),
      Celular:text(student.Celular || student.celular || student.telefono || student.Telefono || ""),
      division:text(student.division || ""),
      divisiones:Array.isArray(student.divisiones) ? student.divisiones.slice(0,3) : normalizeDivisiones(student.division || student.Division || student.División),
      updatedAt:text(student.updatedAt || student.actualizadoEn || student.createdAt || student.creadoEn || now())
    };
    return copyRequirementFields(student, out);
  }

  function compactSnapshotForStorage(snapshot){
    var snap = normalizeSnapshot(snapshot || emptySnapshot());
    snap.meta = Object.assign({}, snap.meta || {}, {compactedForStorage:true,compactedAt:now(),version:VERSION,schemaVersion:4});
    snap.history = Array.isArray(snap.history) ? snap.history.slice(0,80) : [];
    snap.diagnostics = Array.isArray(snap.diagnostics) ? snap.diagnostics.slice(0,30) : [];
    snap.students = Array.isArray(snap.students) ? snap.students.map(compactRecord) : [];
    snap.periods = Array.isArray(snap.periods) ? snap.periods.map(compactRecord) : [];
    return snap;
  }

  function emergencySnapshotForStorage(snapshot){
    var snap = normalizeSnapshot(snapshot || emptySnapshot());
    var totalStudents = Array.isArray(snap.students) ? snap.students.length : 0;
    var totalPeriods = Array.isArray(snap.periods) ? snap.periods.length : 0;
    return {
      meta:Object.assign({}, snap.meta || {}, {app:"Requisitos",module:"ExcelLocal",version:VERSION,schemaVersion:4,updatedAt:now(),totalStudents:totalStudents,totalPeriods:totalPeriods,emergencyStored:true,storageMode:"minimal_localStorage_with_requirements",message:"Snapshot reducido porque localStorage estaba lleno. Se conservaron identidad y requisitos para Ficha/Stats."}),
      periods:Array.isArray(snap.periods) ? snap.periods.map(compactRecord) : [],
      students:Array.isArray(snap.students) ? snap.students.map(minimalStudent) : [],
      history:Array.isArray(snap.history) ? snap.history.slice(0,20) : [],
      diagnostics:[]
    };
  }

  function markerSnapshotForStorage(snapshot){
    var snap = normalizeSnapshot(snapshot || emptySnapshot());
    return {
      meta:Object.assign({}, snap.meta || {}, {app:"Requisitos",module:"ExcelLocal",version:VERSION,schemaVersion:4,updatedAt:now(),totalStudents:Array.isArray(snap.students)?snap.students.length:0,totalPeriods:Array.isArray(snap.periods)?snap.periods.length:0,memoryOnly:true,storageMode:"memory_only",message:"La Base Local completa quedó en memoria porque localStorage está lleno. Al recargar, baja Firebase nuevamente."}),
      periods:Array.isArray(snap.periods) ? snap.periods.slice(0,10).map(compactRecord) : [],
      students:[],
      history:[],
      diagnostics:[]
    };
  }

  function normalizeDivisiones(value){
    if(window.BLDivisionesService&&typeof window.BLDivisionesService.normalizeDivisiones==="function")return window.BLDivisionesService.normalizeDivisiones(value);
    if(Array.isArray(value)){
      var seen={};var out=[];
      value.forEach(function(item){var name=text(typeof item==="object"&&item?(item.nombre||item.name||item.label||item.id):item);var k=norm(name);if(!name||k==="sin division"||seen[k])return;seen[k]=true;out.push(name);});
      return out;
    }
    var single=text(value);return single&&norm(single)!=="sin division"?[single]:[];
  }

  function normalizeStudent(student){
    var s = student && typeof student === "object" ? Object.assign({}, student) : {};
    var cedula = text(s.cedula || s.Cedula || s.CEDULA || s.numeroIdentificacion || s.numeroidentificacion || s.NumeroIdentificacion || s.identificacion || s.Identificacion || s.docId || s._docId);
    if(cedula){s.cedula = text(s.cedula || cedula);s.numeroIdentificacion = text(s.numeroIdentificacion || s.numeroidentificacion || cedula);s._docId = text(s._docId || s.docId || cedula);s.docId = text(s.docId || s._docId || cedula);}
    s.estadoMatricula = text(s.estadoMatricula || "ACTIVO").toUpperCase() === "RETIRADO" ? "RETIRADO" : "ACTIVO";
    s.historialEstadoMatricula = Array.isArray(s.historialEstadoMatricula) ? s.historialEstadoMatricula : [];
    s.divisiones = normalizeDivisiones(s.divisiones || s.division || s.Division || s.División);
    if(s.divisiones.length){s.division=s.divisiones[0];}else{delete s.division;}
    s.updatedAt = text(s.updatedAt) || now();
    return s;
  }

  function normalizePeriod(period){
    if(window.BLPeriodosCanon&&typeof window.BLPeriodosCanon.normalizePeriod==="function")return window.BLPeriodosCanon.normalizePeriod(period);
    var p = period && typeof period === "object" ? Object.assign({}, period) : {};
    var id = text(p.id || p.periodoId || p.value || p.label);
    p.id = id;
    p.periodoId = text(p.periodoId || id);
    p.label = text(p.label || p.periodoLabel || id);
    p.periodoLabel = text(p.periodoLabel || p.label || id);
    p.updatedAt = text(p.updatedAt || p.creadoEn) || now();
    return p;
  }

  function dedupePeriods(periods){
    if(window.BLPeriodosCanon&&typeof window.BLPeriodosCanon.dedupe==="function")return window.BLPeriodosCanon.dedupe(periods||[]);
    var map={};var out=[];
    (periods||[]).forEach(function(period){var p=normalizePeriod(period);var k=norm(p.label||p.id);if(!k||map[k])return;map[k]=true;out.push(p);});
    return out;
  }

  function normalizeSnapshot(data){
    if(window.BLPeriodosCanon&&typeof window.BLPeriodosCanon.canonicalizeSnapshot==="function")data=window.BLPeriodosCanon.canonicalizeSnapshot(data);
    var base = data && typeof data === "object" ? data : emptySnapshot();
    var snap = Object.assign({}, base);
    snap.meta = snap.meta && typeof snap.meta === "object" ? Object.assign({}, snap.meta) : {};
    snap.periods = dedupePeriods(Array.isArray(snap.periods) ? snap.periods : []);
    snap.students = Array.isArray(snap.students) ? snap.students.map(normalizeStudent) : [];
    snap.history = Array.isArray(snap.history) ? snap.history : [];
    snap.diagnostics = Array.isArray(snap.diagnostics) ? snap.diagnostics : [];
    snap.meta.app = snap.meta.app || "Requisitos";
    snap.meta.module = snap.meta.module || "ExcelLocal";
    snap.meta.version = VERSION;
    snap.meta.schemaVersion = 4;
    snap.meta.updatedAt = snap.meta.updatedAt || now();
    snap.meta.totalStudents = snap.students.length;
    snap.meta.totalPeriods = snap.periods.length;
    return snap;
  }

  function looksLikeSnapshot(value){
    return !!(value&&typeof value==="object"&&value.meta&&Array.isArray(value.periods)&&Array.isArray(value.students));
  }

  function readFromSession(){
    var api=sessionApi();
    if(!api||typeof api.getSnapshot!=="function")return null;
    try{
      var snap=api.getSnapshot({clone:false});
      if(looksLikeSnapshot(snap)){memory.loaded=true;memory.snapshot=snap;memory.source="maq-session";return clone(snap);}
    }catch(error){console.warn("[ExcelLocalStorage] sesión rápida no disponible",error);}
    return null;
  }

  function sessionApi(){
    try{if(window.parent&&window.parent!==window&&window.parent.MAQ_BASELOCAL_SESSION){return window.parent.MAQ_BASELOCAL_SESSION;}}catch(error){}
    try{if(window.top&&window.top!==window&&window.top.MAQ_BASELOCAL_SESSION){return window.top.MAQ_BASELOCAL_SESSION;}}catch(error){}
    try{if(window.MAQ_BASELOCAL_SESSION){return window.MAQ_BASELOCAL_SESSION;}}catch(error){}
    return null;
  }

  function readSnapshot(){
    var fromSession=readFromSession();
    if(fromSession){return fromSession;}
    try{
      var raw=localStorage.getItem(key())||"";
      if(memory.loaded&&memory.raw===raw&&memory.snapshot){return clone(memory.snapshot);}
      var snap=raw?normalizeSnapshot(JSON.parse(raw)):emptySnapshot();
      memory.loaded=true;memory.raw=raw;memory.snapshot=snap;memory.source="localStorage";
      return clone(snap);
    }catch(e){console.warn("[ExcelLocalStorage] lectura fallida",e);var fallback=emptySnapshot();memory.loaded=true;memory.raw="";memory.snapshot=fallback;memory.source="fallback";return fallback;}
  }

  function persistRaw(raw){localStorage.setItem(key(), raw);}

  function tryPersistSnapshot(candidate){
    var raw = JSON.stringify(candidate);
    persistRaw(raw);
    return raw;
  }

  function activateMemorySnapshot(snapshot, raw, source){
    memory.loaded=true;memory.raw=raw||"";memory.snapshot=snapshot;memory.source=source||"writeSnapshot";
    try{
      var api=sessionApi();
      if(api&&typeof api.setSnapshot==="function"){api.setSnapshot(snapshot,{source:"ExcelLocalStorage."+(source||"writeSnapshot"),alreadyStored:true,clone:false});}
    }catch(error){}
  }

  function writeSnapshot(snapshot){
    var snap=normalizeSnapshot(snapshot);
    snap.meta.updatedAt=now();
    snap.meta.version=VERSION;
    snap.meta.schemaVersion=4;
    var savedSnap=snap;
    var raw="";
    var purged={removed:0,freedChars:0};
    var compacted=false;
    var emergency=false;
    var memoryOnly=false;

    try{
      raw=tryPersistSnapshot(savedSnap);
    }catch(error){
      if(!isQuotaError(error)){throw error;}
      purged=purgeHeavyLocalCopies();
      try{
        raw=tryPersistSnapshot(savedSnap);
      }catch(secondError){
        if(!isQuotaError(secondError)){throw secondError;}
        savedSnap=compactSnapshotForStorage(snap);
        compacted=true;
        try{
          raw=tryPersistSnapshot(savedSnap);
        }catch(thirdError){
          if(!isQuotaError(thirdError)){throw thirdError;}
          savedSnap=emergencySnapshotForStorage(snap);
          emergency=true;
          purgeHeavyLocalCopies();
          try{
            raw=tryPersistSnapshot(savedSnap);
          }catch(fourthError){
            if(!isQuotaError(fourthError)){throw fourthError;}
            memoryOnly=true;
            savedSnap=snap;
            var marker=markerSnapshotForStorage(snap);
            try{raw=JSON.stringify(marker);persistRaw(raw);}catch(markerError){raw="";try{localStorage.removeItem(key());}catch(removeError){}}
          }
        }
      }
    }

    activateMemorySnapshot(savedSnap, raw, memoryOnly?"memory_only":(emergency?"writeSnapshot_emergency":(compacted?"writeSnapshot_compacted":"writeSnapshot")));
    saveStorageStatus({ok:true,mode:memoryOnly?"memory_only":(emergency?"saved_emergency":(compacted?"saved_compacted":"saved")),bytes:raw.length,purged:purged,compacted:compacted,emergency:emergency,memoryOnly:memoryOnly,totalStudents:snap.students.length,totalPeriods:snap.periods.length,message:memoryOnly?"Base Local activa en memoria. Si recargas, usa Solo bajar Firebase nuevamente.":"Base Local guardada."});
    return clone(savedSnap);
  }

  function clear(){var snap=emptySnapshot();writeSnapshot(snap);return snap;}
  function invalidate(){memory.loaded=false;memory.raw="";memory.snapshot=null;memory.source="invalidate";}

  window.ExcelLocalStorage={emptySnapshot:emptySnapshot,normalizeSnapshot:normalizeSnapshot,readSnapshot:readSnapshot,writeSnapshot:writeSnapshot,clear:clear,clone:clone,invalidate:invalidate,purgeHeavyLocalCopies:purgeHeavyLocalCopies};
})(window);
