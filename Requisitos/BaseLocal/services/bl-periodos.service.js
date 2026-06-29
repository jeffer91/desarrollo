/* =========================================================
Nombre completo: bl-periodos.service.js
Ruta o ubicación: /Requisitos/BaseLocal/services/bl-periodos.service.js
Función:
- Leer la colección periodos desde Firestore.
- Normalizar y deduplicar períodos.
- Reconstruir períodos desde estudiantes cuando Firestore periodos viene vacío.
========================================================= */
(function(window){
  "use strict";

  var COLLECTION = "periodos";

  function normalizador(){if(!window.BLNormalizador){throw new Error("BLNormalizador no disponible.");}return window.BLNormalizador;}
  function text(value){return window.BLCampos ? window.BLCampos.text(value) : String(value == null ? "" : value).trim();}

  function safeDate(value){
    try{
      if(value && typeof value.toDate === "function"){return value.toDate().toISOString();}
      if(value instanceof Date){return value.toISOString();}
    }catch(error){return text(value);}
    return value;
  }

  function cleanValue(value){
    var dated = safeDate(value);
    if(dated !== value){return dated;}
    if(Array.isArray(value)){return value.map(cleanValue);}
    if(value && typeof value === "object"){
      var out = {};
      Object.keys(value).forEach(function(key){out[key] = cleanValue(value[key]);});
      return out;
    }
    return value;
  }

  function normalizePeriod(period){
    if(window.BLPeriodosCanon && typeof window.BLPeriodosCanon.normalizePeriod === "function"){return window.BLPeriodosCanon.normalizePeriod(period);}
    return normalizador().normalizePeriod(period);
  }

  function docToPeriod(doc){
    var data = cleanValue(typeof doc.data === "function" ? doc.data() : {});
    var raw = Object.assign({}, data || {}, {_firebaseId:text(doc.id || data.id), _firebaseCollection:COLLECTION});
    if(!raw.id){raw.id = text(doc.id || raw.periodoId || raw.value || raw.label);}
    if(!raw.label){raw.label = text(raw.periodoLabel || raw.id);}
    return normalizePeriod(raw);
  }

  async function read(db){
    if(!db || typeof db.collection !== "function"){throw new Error("Firestore no disponible para leer periodos.");}
    var snap = await db.collection(COLLECTION).get();
    var rows = [];
    if(snap && typeof snap.forEach === "function"){snap.forEach(function(doc){rows.push(docToPeriod(doc));});}
    else if(snap && Array.isArray(snap.docs)){rows = snap.docs.map(docToPeriod);}
    return dedupe(rows);
  }

  function dedupe(periods){
    if(window.BLPeriodosCanon && typeof window.BLPeriodosCanon.dedupe === "function"){return window.BLPeriodosCanon.dedupe(periods || []);}
    var map = {};
    var result = [];
    (periods || []).forEach(function(period){
      var normalized = normalizePeriod(period);
      var id = text(normalized.id || normalized.periodoId || normalized.label);
      if(!id || map[id]){return;}
      map[id] = true;
      result.push(normalized);
    });
    return result;
  }

  function studentPeriodValue(student){
    student = student || {};
    return text(student.periodoId || student.periodoLabel || student.periodo || student.Periodo || student.ultimoPeriodoId || student._bl2PeriodoId || student._bl2Periodo);
  }

  function inferFromStudents(students){
    var map = {};
    var periods = [];
    (Array.isArray(students) ? students : []).forEach(function(student){
      var raw = studentPeriodValue(student);
      if(!raw){return;}
      var label = text(student.periodoLabel || student.periodo || student.Periodo || student._bl2Periodo || raw);
      var normalized = normalizePeriod({id:raw, periodoId:raw, label:label, periodoLabel:label, source:"students_fallback"});
      var key = text(normalized.id || normalized.label);
      if(!key || map[key]){return;}
      map[key] = true;
      periods.push(normalized);
    });
    return dedupe(periods);
  }

  function canonicalizeSnapshot(snapshot){
    if(window.BLPeriodosCanon && typeof window.BLPeriodosCanon.canonicalizeSnapshot === "function"){
      snapshot = window.BLPeriodosCanon.canonicalizeSnapshot(snapshot);
    }
    var snap = snapshot || {};
    snap.periods = dedupe(snap.periods || []);
    snap.students = Array.isArray(snap.students) ? snap.students : [];
    if(!snap.periods.length && snap.students.length){
      snap.periods = inferFromStudents(snap.students);
      snap.meta = Object.assign({}, snap.meta || {}, {periodsInferredFromStudents:true,totalPeriods:snap.periods.length});
    }
    return snap;
  }

  window.BLPeriodosService = {collection:COLLECTION,read:read,dedupe:dedupe,normalizePeriod:normalizePeriod,inferFromStudents:inferFromStudents,canonicalizeSnapshot:canonicalizeSnapshot};
})(window);
