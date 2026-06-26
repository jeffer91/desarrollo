/* =========================================================
Nombre completo: bl-estudiantes.service.js
Ruta o ubicación: /Requisitos/BaseLocal/services/bl-estudiantes.service.js
Función o funciones:
- Leer la colección Estudiantes desde Firestore.
- Normalizar estudiantes con cédula como clave principal.
- Conservar todos los campos originales de Firestore.
- Evitar duplicados por periodoId + cedula.
Con qué se conecta:
- bl-campos.js
- bl-normalizador.js
- baselocal.firebase.js
========================================================= */
(function(window){
  "use strict";

  var COLLECTION = "Estudiantes";

  function campos(){
    if(!window.BLCampos){
      throw new Error("BLCampos no disponible.");
    }
    return window.BLCampos;
  }

  function normalizador(){
    if(!window.BLNormalizador){
      throw new Error("BLNormalizador no disponible.");
    }
    return window.BLNormalizador;
  }

  function text(value){
    return campos().text(value);
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

  function docToStudent(doc, index){
    var data = cleanValue(typeof doc.data === "function" ? doc.data() : {});
    var raw = Object.assign({}, data || {}, {
      _firebaseId:text(doc.id || data.id),
      _firebaseCollection:COLLECTION
    });
    return normalizador().normalizeStudent(raw, index || 0, {source:"firebase"});
  }

  async function read(db){
    if(!db || typeof db.collection !== "function"){
      throw new Error("Firestore no disponible para leer Estudiantes.");
    }
    var snap = await db.collection(COLLECTION).get();
    var rows = [];
    if(snap && typeof snap.forEach === "function"){
      var index = 0;
      snap.forEach(function(doc){
        rows.push(docToStudent(doc, index));
        index += 1;
      });
    }else if(snap && Array.isArray(snap.docs)){
      rows = snap.docs.map(function(doc, index){return docToStudent(doc, index);});
    }
    return dedupeByCedula(rows);
  }

  function updatedTime(row){
    var raw = text(campos().getValue(row || {}, "updatedAt", ""));
    var time = Date.parse(raw);
    return Number.isFinite(time) ? time : 0;
  }

  function dedupeByCedula(students){
    var map = {};
    (students || []).forEach(function(student){
      var normalized = normalizador().normalizeStudent(student, 0, {source:student && student._source || "firebase"});
      var key = text(normalized.cedula || normalized.numeroIdentificacion);
      if(!key){
        return;
      }
      if(!map[key] || updatedTime(normalized) >= updatedTime(map[key])){
        map[key] = normalized;
      }
    });
    return Object.keys(map).map(function(key){return map[key];});
  }

  function normalizeLocalList(students){
    return dedupeByCedula(students || []);
  }

  window.BLEstudiantesService = {
    collection:COLLECTION,
    read:read,
    dedupeByCedula:dedupeByCedula,
    normalizeLocalList:normalizeLocalList,
    normalizeStudent:function(row, index, options){return normalizador().normalizeStudent(row, index, options || {});}
  };
})(window);
