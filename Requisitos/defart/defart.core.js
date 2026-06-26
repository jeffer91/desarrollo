/* =========================================================
Nombre completo: defart.core.js
Ruta o ubicación: /Requisitos/defart/defart.core.js
Función o funciones:
- Leer estudiantes activos desde BaseLocal/ExcelLocalRepo.
- Normalizar campos reales de Firebase para Defensas.
- Habilitar N-ART según requisitos cumplidos/aprobados.
- Habilitar N-DEF solo si N-ART es igual o mayor a 7.
- Calcular N-FIN = N-ART 70% + N-DEF 30%.
- Guardar Notart, Notdef y Notafinal en BaseLocal.
Con qué se conecta:
- excel-local.repo.js
- excel-local.storage.js
- defart.app.js
========================================================= */
(function(window){
  "use strict";

  var PASS_VALUES = ["cumple", "aprobado"];
  var STATES = ["Sin requisitos", "Pendiente Art", "Supletorio Art", "Pendiente Def", "Supletorio Def", "Completo"];
  var REQUIREMENTS = [
    {key:"academico", label:"Académico", fields:["Academico", "Académico", "academico"]},
    {key:"documentacion", label:"Documentación", fields:["Documentacion", "Documentación", "documentacion"]},
    {key:"financiero", label:"Financiero", fields:["Financiero", "financiero"]},
    {key:"titulacion", label:"Titulación", fields:["Titulacion", "Titulación", "titulacion"]},
    {key:"vinculacion", label:"Vinculación", fields:["Vinculacion", "Vinculación", "vinculacion"]},
    {key:"seguimiento", label:"Seguimiento graduados", fields:["SeguimientoGraduados", "Seguimiento graduados", "SeguimientoGraduado", "seguimientoGraduados"]},
    {key:"ingles", label:"Inglés", fields:["Ingles", "Inglés", "ingles"]},
    {key:"actualizacion", label:"Actualización datos", fields:["ActualizaciónDatos", "ActualizacionDatos", "Actualización datos", "actualizacionDatos", "actualizaciondatos"]}
  ];

  function text(value){
    return String(value == null ? "" : value).trim();
  }

  function norm(value){
    return text(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function now(){
    return new Date().toISOString();
  }

  function repo(){
    if(!window.ExcelLocalRepo){
      throw new Error("ExcelLocalRepo no disponible. Primero abre BL o Carga para inicializar BaseLocal.");
    }
    return window.ExcelLocalRepo;
  }

  function storage(){
    if(window.ExcelLocalStorage && typeof window.ExcelLocalStorage.readSnapshot === "function"){
      return window.ExcelLocalStorage;
    }
    return null;
  }

  function getSnapshot(){
    if(storage()){
      return storage().readSnapshot();
    }
    if(repo().getSnapshot){
      return repo().getSnapshot();
    }
    return {periods:[], students:[], history:[], meta:{}};
  }

  function writeSnapshot(snapshot){
    var saved;
    if(storage() && typeof storage().writeSnapshot === "function"){
      saved = storage().writeSnapshot(snapshot);
    }else{
      saved = snapshot;
    }

    try{
      if(window.RequisitosBL && typeof window.RequisitosBL.mirrorSnapshotToCollections === "function"){
        window.RequisitosBL.mirrorSnapshotToCollections({force:true, silent:true});
        window.RequisitosBL.notificar("snapshot-changed", {source:"defart.core", updatedAt:now()});
      }
    }catch(error){}

    return saved;
  }

  function rawStudents(){
    if(repo().listAllStudents){
      return repo().listAllStudents();
    }
    return getSnapshot().students || [];
  }

  function rawPeriods(){
    if(repo().listPeriods){
      return repo().listPeriods();
    }
    return getSnapshot().periods || [];
  }

  function pick(row, names){
    row = row || {};
    for(var i = 0; i < names.length; i += 1){
      if(text(row[names[i]]) !== ""){
        return row[names[i]];
      }
    }
    return "";
  }

  function numberValue(value){
    if(value === null || value === undefined || text(value) === ""){
      return null;
    }
    var clean = text(value).replace(",", ".");
    var num = Number(clean);
    return Number.isFinite(num) ? num : null;
  }

  function round2(value){
    if(!Number.isFinite(value)){
      return null;
    }
    return Math.round(value * 100) / 100;
  }

  function noteToText(value){
    var num = numberValue(value);
    if(num === null){
      return "";
    }
    return String(round2(num));
  }

  function isValidNote(value){
    var num = numberValue(value);
    return num !== null && num >= 0 && num <= 10;
  }

  function requirementValue(row, req){
    return text(pick(row, req.fields));
  }

  function requirementOk(value){
    var clean = norm(value);
    return PASS_VALUES.indexOf(clean) >= 0;
  }

  function requirementSummary(row){
    var missing = [];
    var values = {};
    REQUIREMENTS.forEach(function(req){
      var value = requirementValue(row, req);
      values[req.key] = value;
      if(!requirementOk(value)){
        missing.push(req.label);
      }
    });
    return {ok:missing.length === 0, missing:missing, values:values};
  }

  function isActive(row){
    var value = norm(pick(row, ["estadoMatricula", "EstadoMatricula", "estado", "Estado"]));
    if(!value){
      return true;
    }
    return value === "activo";
  }

  function studentId(row, index){
    return text(pick(row, ["_docId", "docId", "cedula", "Cedula", "CEDULA", "numeroIdentificacion", "numeroidentificacion", "NumeroIdentificacion", "identificacion", "Identificacion"])) || ("fila_" + index);
  }

  function periodId(row){
    return text(pick(row, ["periodoId", "ultimoPeriodoId", "periodId", "PeriodoId", "periodo", "Periodo"]));
  }

  function periodLabel(row){
    return text(pick(row, ["periodoLabel", "PeriodoLabel", "periodo", "Periodo"])) || periodId(row) || "Sin período";
  }

  function decorate(row, index){
    var source = Object.assign({}, row || {});
    var req = requirementSummary(source);
    var nart = numberValue(pick(source, ["Notart", "Nart", "N_ART", "N-ART", "notart", "notaArticulo", "nota_articulo"]));
    var ndef = numberValue(pick(source, ["Notdef", "Ndef", "N_DEF", "N-DEF", "notdef", "notaDefensa", "nota_defensa"]));
    var nfin = nart !== null && ndef !== null ? round2((nart * 0.70) + (ndef * 0.30)) : null;
    var canArt = req.ok;
    var canDef = canArt && nart !== null && nart >= 7;
    var estado = "Pendiente Art";

    if(!canArt){
      estado = "Sin requisitos";
    }else if(nart === null){
      estado = "Pendiente Art";
    }else if(nart < 7){
      estado = "Supletorio Art";
    }else if(ndef === null){
      estado = "Pendiente Def";
    }else if(ndef < 7){
      estado = "Supletorio Def";
    }else{
      estado = "Completo";
    }

    source._defId = studentId(source, index);
    source._cedula = text(pick(source, ["cedula", "Cedula", "CEDULA", "numeroIdentificacion", "numeroidentificacion", "NumeroIdentificacion", "identificacion", "Identificacion"]));
    source._nombre = text(pick(source, ["Nombres", "nombres", "Nombre", "nombre", "estudiante", "Estudiante", "apellidosNombres", "apellidos_nombres"]));
    source._carrera = text(pick(source, ["NombreCarrera", "nombrecarrera", "nombreCarrera", "Carrera", "carrera", "programa", "Programa"])) || "SIN CARRERA";
    source._sede = text(pick(source, ["Sede", "sede", "campus"])) || "SIN SEDE";
    source._periodoId = periodId(source);
    source._periodoLabel = periodLabel(source);
    source._estadoMatricula = text(pick(source, ["estadoMatricula", "EstadoMatricula", "estado", "Estado"])) || "ACTIVO";
    source._nart = nart;
    source._ndef = ndef;
    source._nfin = nfin;
    source._canArt = canArt;
    source._canDef = canDef;
    source._estadoDefensa = estado;
    source._missingRequirements = req.missing;
    source._requirementValues = req.values;
    return source;
  }

  function unique(list, getter){
    var map = {};
    (list || []).forEach(function(item){
      var value = text(getter(item));
      if(value){
        map[value] = true;
      }
    });
    return Object.keys(map).sort(function(a, b){return a.localeCompare(b, "es");});
  }

  function periodOptions(rows){
    var map = {};
    rawPeriods().forEach(function(period){
      var id = text(period.id || period.periodoId || period.value);
      if(id){
        map[id] = {id:id, label:text(period.label || period.periodoLabel || id)};
      }
    });
    rows.forEach(function(row){
      if(row._periodoId && !map[row._periodoId]){
        map[row._periodoId] = {id:row._periodoId, label:row._periodoLabel || row._periodoId};
      }
    });
    return Object.keys(map).map(function(key){return map[key];}).sort(function(a, b){return String(a.label || a.id).localeCompare(String(b.label || b.id), "es");});
  }

  function compareValues(a, b, key){
    var av = a[key];
    var bv = b[key];
    if(key === "_nart" || key === "_ndef" || key === "_nfin"){
      av = av === null ? -1 : av;
      bv = bv === null ? -1 : bv;
      return av - bv;
    }
    return String(av == null ? "" : av).localeCompare(String(bv == null ? "" : bv), "es", {numeric:true, sensitivity:"base"});
  }

  function filterRows(options){
    options = options || {};
    var q = norm(options.search || "");
    var rows = rawStudents().filter(isActive).map(decorate).filter(function(row){
      if(options.periodId && row._periodoId !== options.periodId){
        return false;
      }
      if(options.career && row._carrera !== options.career){
        return false;
      }
      if(options.status && row._estadoDefensa !== options.status){
        return false;
      }
      if(options.sede && row._sede !== options.sede){
        return false;
      }
      if(q){
        var hay = norm([row._cedula, row._nombre, row._carrera, row._sede, row._periodoLabel, row._estadoDefensa].join(" "));
        if(hay.indexOf(q) < 0){
          return false;
        }
      }
      return true;
    });

    if(options.sortKey){
      rows.sort(function(a, b){
        var result = compareValues(a, b, options.sortKey);
        return options.sortDir === "desc" ? -result : result;
      });
    }else{
      rows.sort(function(a, b){
        return a._nombre.localeCompare(b._nombre, "es");
      });
    }
    return rows;
  }

  function kpis(rows){
    var result = {total:rows.length};
    STATES.forEach(function(state){result[state] = 0;});
    rows.forEach(function(row){
      if(Object.prototype.hasOwnProperty.call(result, row._estadoDefensa)){
        result[row._estadoDefensa] += 1;
      }
    });
    return result;
  }

  function summary(options){
    var allActive = rawStudents().filter(isActive).map(decorate);
    var rows = filterRows(options);
    return {
      rows:rows,
      kpis:kpis(rows),
      periodList:periodOptions(allActive),
      careerList:unique(allActive, function(row){return row._carrera;}),
      sedeList:unique(allActive, function(row){return row._sede;}),
      states:STATES.slice(),
      diagnostics:{
        generatedAt:now(),
        totalActive:allActive.length,
        visible:rows.length,
        filters:options || {},
        source:"BaseLocal"
      }
    };
  }

  function findStudentIndex(students, id){
    id = text(id);
    for(var i = 0; i < students.length; i += 1){
      var candidate = studentId(students[i], i);
      if(candidate === id){
        return i;
      }
    }
    return -1;
  }

  function normalizePatch(patch){
    var out = {};
    if(Object.prototype.hasOwnProperty.call(patch, "nart")){
      out.Notart = numberValue(patch.nart);
    }
    if(Object.prototype.hasOwnProperty.call(patch, "ndef")){
      out.Notdef = numberValue(patch.ndef);
    }
    return out;
  }

  function saveNotes(changes){
    changes = Array.isArray(changes) ? changes : [];
    if(!changes.length){
      return {ok:true, saved:0, total:0, message:"No hay cambios pendientes."};
    }

    var snapshot = getSnapshot();
    snapshot.students = Array.isArray(snapshot.students) ? snapshot.students : [];
    snapshot.history = Array.isArray(snapshot.history) ? snapshot.history : [];
    var saved = 0;
    var errors = [];

    changes.forEach(function(change){
      var index = findStudentIndex(snapshot.students, change.id);
      if(index < 0){
        errors.push("No encontrado: " + change.id);
        return;
      }

      var current = decorate(snapshot.students[index], index);
      var patch = normalizePatch(change);
      var nart = Object.prototype.hasOwnProperty.call(patch, "Notart") ? patch.Notart : current._nart;
      var ndef = Object.prototype.hasOwnProperty.call(patch, "Notdef") ? patch.Notdef : current._ndef;

      if(nart !== null && (nart < 0 || nart > 10)){
        errors.push("N-ART fuera de rango: " + current._nombre);
        return;
      }
      if(ndef !== null && (ndef < 0 || ndef > 10)){
        errors.push("N-DEF fuera de rango: " + current._nombre);
        return;
      }

      patch.Notafinal = nart !== null && ndef !== null ? round2((nart * 0.70) + (ndef * 0.30)) : null;
      patch.ultimaEdicionLocal = now();
      patch.updatedAt = now();
      snapshot.students[index] = Object.assign({}, snapshot.students[index], patch);
      saved += 1;
    });

    snapshot.meta = Object.assign({}, snapshot.meta || {}, {
      updatedAt:now(),
      lastDefensasUpdateAt:now(),
      lastDefensasSaved:saved
    });
    snapshot.history.unshift({id:"defensas_notas_" + Date.now(), action:"guardarNotasDefensas", periodoId:"VARIOS", periodoLabel:"Varios", fileName:"Defensas", totalRows:saved, createdAt:now()});
    writeSnapshot(snapshot);

    return {ok:errors.length === 0, saved:saved, total:changes.length, errors:errors, message:saved + " cambio(s) guardado(s) en BaseLocal."};
  }

  window.DefartCore = {
    summary:summary,
    saveNotes:saveNotes,
    decorate:decorate,
    noteToText:noteToText,
    isValidNote:isValidNote,
    requirements:REQUIREMENTS.slice(),
    states:STATES.slice()
  };
})(window);
