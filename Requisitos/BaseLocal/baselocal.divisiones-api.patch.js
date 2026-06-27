/* =========================================================
Nombre completo: baselocal.divisiones-api.patch.js
Ruta o ubicación: /Requisitos/BaseLocal/baselocal.divisiones-api.patch.js
Función o funciones:
- Reforzar la API pública de divisiones sin tocar otras pantallas.
- Corregir edición/creación para que una división nueva no marque como actualizados a estudiantes no seleccionados.
- Mantener escritura en Base Local con historial.
Con qué se conecta:
- baselocal.core.js
- services/bl-divisiones.service.js
- baselocal.divisiones.js
========================================================= */
(function(window){
  "use strict";

  function text(value){return String(value == null ? "" : value).trim();}
  function norm(value){return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim().toLowerCase();}
  function clone(value){try{return JSON.parse(JSON.stringify(value == null ? null : value));}catch(error){return value;}}
  function now(){return new Date().toISOString();}
  function api(){if(!window.BaseLocalAPI){throw new Error("BaseLocalAPI no disponible.");}return window.BaseLocalAPI;}
  function svc(){if(!window.BLDivisionesService){throw new Error("BLDivisionesService no disponible.");}return window.BLDivisionesService;}
  function samePeriod(a,b){if(!text(b)){return true;}try{if(window.BLPeriodosCanon && typeof window.BLPeriodosCanon.samePeriod === "function"){return window.BLPeriodosCanon.samePeriod(a,b);}}catch(error){}return text(a) === text(b);}
  function rowPeriod(row){return text(row && (row.periodoId || row.ultimoPeriodoId || row.periodId || row.PeriodoId || row.periodo || row.Periodo || row.periodoLabel));}
  function careerOf(row){return text(row && (row.nombrecarrera || row.nombreCarrera || row.NombreCarrera || row.carrera || row.Carrera || row.programa || row.Programa)) || "SIN CARRERA";}
  function periodLabel(periodId){var p=(api().getPeriods()||[]).find(function(x){return samePeriod(x.id||x.periodoId, periodId);});return p ? text(p.label || p.periodoLabel || p.id) : periodId;}

  function assignedDivisionByCareer(students, periodId){
    var out = {};
    (students || []).forEach(function(student){
      var row = svc().normalizeStudent(student);
      if(periodId && !samePeriod(rowPeriod(row), periodId)){return;}
      var division = svc().studentDivision(row);
      if(norm(division) === norm(svc().sinDivision)){return;}
      out[norm(careerOf(row))] = division;
    });
    return out;
  }

  function uniqueCareers(careers){
    var seen = {}, out = [];
    (careers || []).forEach(function(career){
      var clean = text(career);
      var key = norm(clean);
      if(!clean || seen[key]){return;}
      seen[key] = true;
      out.push(clean);
    });
    return out;
  }

  function replaceDivisionToCareers(periodId, oldDivisionName, newDivisionName, careers){
    periodId = text(periodId);
    oldDivisionName = text(oldDivisionName);
    newDivisionName = text(newDivisionName);
    var validCareers = uniqueCareers(careers);

    if(!periodId){throw new Error("Selecciona un período antes de editar la división.");}
    if(!newDivisionName){throw new Error("Escribe el nombre de la división.");}
    if(!validCareers.length){throw new Error("La división debe tener al menos una carrera.");}

    var snapshot = clone(api().getSnapshot({force:true})) || {meta:{}, periods:[], students:[], history:[], diagnostics:[]};
    snapshot.students = Array.isArray(snapshot.students) ? snapshot.students : [];
    snapshot.history = Array.isArray(snapshot.history) ? snapshot.history : [];

    var assigned = assignedDivisionByCareer(snapshot.students, periodId);
    validCareers.forEach(function(career){
      var current = assigned[norm(career)];
      if(current && norm(current) !== norm(oldDivisionName) && norm(current) !== norm(newDivisionName)){
        throw new Error("La carrera ya pertenece a otra división: " + career + " → " + current);
      }
    });

    var selected = {};
    validCareers.forEach(function(career){selected[norm(career)] = true;});

    var updated = 0;
    snapshot.students = snapshot.students.map(function(student){
      var row = svc().normalizeStudent(student);
      if(periodId && !samePeriod(rowPeriod(row), periodId)){return row;}

      var currentDivision = svc().studentDivision(row);
      var currentKey = norm(currentDivision);
      var careerKey = norm(careerOf(row));
      var shouldBelong = !!selected[careerKey];
      var belongedToOld = oldDivisionName ? currentKey === norm(oldDivisionName) : false;

      if(shouldBelong){
        if(currentKey !== norm(newDivisionName)){
          row.divisiones = [newDivisionName];
          row.division = newDivisionName;
          row.divisionActualizadaEn = now();
          row.updatedAt = now();
          row.ultimaSincronizacion = now();
          updated += 1;
        }
        return row;
      }

      if(belongedToOld){
        row.divisiones = [];
        delete row.division;
        row.divisionActualizadaEn = now();
        row.updatedAt = now();
        row.ultimaSincronizacion = now();
        updated += 1;
      }

      return row;
    });

    snapshot.history.unshift({
      id:"division_edit_patch_" + Date.now(),
      action:oldDivisionName ? "editarDivision" : "crearDivision",
      periodoId:periodId,
      periodoLabel:periodLabel(periodId),
      fileName:"Base Local",
      division:newDivisionName,
      divisionAnterior:oldDivisionName,
      carreras:validCareers,
      totalRows:updated,
      createdAt:now()
    });

    var saved = api().writeSnapshot(snapshot, {source:"division-edit-patch"});
    return {ok:true, action:oldDivisionName ? "editarDivision" : "crearDivision", periodId:periodId, division:newDivisionName, oldDivision:oldDivisionName, careers:validCareers, updated:updated, snapshot:saved};
  }

  if(window.BaseLocalAPI){
    window.BaseLocalAPI.replaceDivisionToCareers = replaceDivisionToCareers;
  }
})(window);
