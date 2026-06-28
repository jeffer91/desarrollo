/* =========================================================
Nombre completo: infor.regular.js
Ruta o ubicación: /Requisitos/Infor/core/infor.regular.js
Función o funciones:
- Analizar el Excel regular de Infor con tres hojas: NÚCLEOS, notas_complexivo y defensa/trabajo.
- Usar NÚCLEOS solo como información del informe, no como validación de aprobación.
- Filtrar estudiantes del Excel contra las cédulas reales del período seleccionado.
- Eliminar duplicados por cédula cuando correspondan al mismo estudiante.
- Calcular nota final de Examen Complexivo con fórmula institucional: práctica 60% y teórico 40%.
Con qué se conecta:
- infor.excel.js
- infor.match.js
- infor.report.js
- ../../BaseLocal2/repositories/bl2-estudiantes.repo.js
- ../../Gestion/Excel/excel-local.repo.js
- ../frontend/titulacion.app.js
========================================================= */
(function(window){
  "use strict";

  function text(value){return String(value == null ? "" : value).trim();}
  function norm(value){return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();}
  function compact(value){return norm(value).replace(/[^a-z0-9]/g, "");}
  function onlyDigits(value){return text(value).replace(/[^0-9]/g, "");}
  function num(value){var n = Number(text(value).replace(",", "."));return Number.isFinite(n) ? n : null;}
  function round2(value){return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;}
  function safeList(value){return Array.isArray(value) ? value : [];}

  var CEDULA_ALIASES = ["cedula","cédula","identificacion","identificación","numeroidentificacion","numero identificacion","documento","dni"];
  var NAME_ALIASES = ["nombres","nombre","estudiante","apellidosynombres","apellidos nombres","alumno","participante"];
  var CAREER_ALIASES = ["carrera","nombrecarrera","nombre carrera","programa","especialidad"];
  var TITLE_ALIASES = ["titulo","título","tema","articulo","artículo","trabajo","nombretrabajo","propuesta"];
  var TUTOR_ALIASES = ["tutor","docente tutor","director","asesor"];
  var PRACTICO_ALIASES = ["notaPractico","nota práctico","nota practico","practico","práctico","nota práctica","nota practica","evaluacionPractica","evaluación práctica"];
  var TEORICO_ALIASES = ["notaTeorico","nota teórico","nota teorico","teorico","teórico","evaluacionTeorica","evaluación teórica"];
  var SUPLETORIO_ALIASES = ["notaSupletorio","nota supletorio","supletorio"];
  var NART_ALIASES = ["notart","nart","notaart","nota articulo","nota artículo","articulo","artículo"];
  var NDEF_ALIASES = ["notdef","ndef","notadef","nota defensa","defensa"];
  var NFIN_ALIASES = ["notafinal","nota final","nfin","final"];

  function findValue(row, aliases){
    row = row || {};
    var keys = Object.keys(row);
    for(var i = 0; i < aliases.length; i += 1){
      var wanted = compact(aliases[i]);
      for(var j = 0; j < keys.length; j += 1){
        var key = compact(keys[j]);
        if(key === wanted || key.indexOf(wanted) >= 0 || wanted.indexOf(key) >= 0){
          var value = row[keys[j]];
          if(text(value)){return value;}
        }
      }
    }
    return "";
  }

  function cedulaOf(row){return text(row && (row.cedula || row.Cedula || row.CEDULA || row._bl2Id || row._cedula || findValue(row, CEDULA_ALIASES)));}
  function nameOf(row){return text(row && (row.nombres || row.Nombres || row.nombre || row.estudiante || row._bl2Nombre || findValue(row, NAME_ALIASES)));}
  function careerOf(row){return text(row && (row.carrera || row.Carrera || row.nombreCarrera || row._bl2Carrera || findValue(row, CAREER_ALIASES)));}
  function titleOf(row){return text(row && (row.titulo || row.Titulo || row.título || findValue(row, TITLE_ALIASES)));}
  function tutorOf(row){return text(row && (row.tutor || row.Tutor || findValue(row, TUTOR_ALIASES)));}

  function cedulaVariants(value){
    var d = onlyDigits(value);
    if(!d){return [];}
    var out = [d];
    if(d.charAt(0) === "0"){out.push(d.slice(1));}
    else if(d.length === 9){out.push("0" + d);}
    return out.filter(function(x, index, arr){return x && arr.indexOf(x) === index;});
  }

  function sheetName(row){return text(row && row._inforSheet);}
  function sheetKey(row){return compact(sheetName(row));}
  function isNucleos(row){var s = sheetKey(row);return s.indexOf("nucleo") >= 0 || s.indexOf("nucleos") >= 0;}
  function isComplexivo(row){var s = sheetKey(row);return s.indexOf("complexivo") >= 0;}
  function isTrabajo(row){return !isNucleos(row) && !isComplexivo(row);}

  function rowScore(row){
    row = row || {};
    var keys = Object.keys(row);
    var nonEmpty = keys.filter(function(k){return text(row[k]);}).length;
    var score = nonEmpty;
    if(num(findValue(row, PRACTICO_ALIASES)) != null){score += 5;}
    if(num(findValue(row, TEORICO_ALIASES)) != null){score += 5;}
    if(num(findValue(row, NFIN_ALIASES)) != null){score += 5;}
    if(num(findValue(row, NART_ALIASES)) != null){score += 3;}
    if(num(findValue(row, NDEF_ALIASES)) != null){score += 3;}
    return score;
  }

  function periodSource(periodId){
    periodId = text(periodId);
    try{
      if(window.BL2EstudiantesRepo && typeof window.BL2EstudiantesRepo.buscar === "function"){
        var result = window.BL2EstudiantesRepo.buscar({periodId:periodId, matricula:"ACTIVO", search:"", limit:12000});
        if(result && Array.isArray(result.rows)){return {source:"BL2", rows:result.rows};}
      }
    }catch(error){console.warn("[InforRegular BL2]", error);}

    try{
      if(window.ExcelLocalRepo){
        var rows = [];
        if(typeof window.ExcelLocalRepo.listStudentsByPeriod === "function"){rows = window.ExcelLocalRepo.listStudentsByPeriod(periodId, {estadoMatricula:"ACTIVO"}) || [];}
        else if(typeof window.ExcelLocalRepo.listAllStudents === "function"){rows = window.ExcelLocalRepo.listAllStudents() || [];}
        return {source:"ExcelLocalRepo", rows:rows};
      }
    }catch(error2){console.warn("[InforRegular ExcelLocalRepo]", error2);}

    return {source:"Sin BaseLocal", rows:[]};
  }

  function buildPeriodIndex(rows){
    var byCedula = Object.create(null);
    safeList(rows).forEach(function(row){
      cedulaVariants(cedulaOf(row)).forEach(function(key){if(key && !byCedula[key]){byCedula[key] = row;}});
    });
    return byCedula;
  }

  function existsInPeriod(cedula, index){
    return cedulaVariants(cedula).some(function(key){return !!index[key];});
  }

  function filterByPeriod(rows, index, enabled, sourceName){
    var valid = [];
    var excluded = [];
    safeList(rows).forEach(function(row){
      var cedula = cedulaOf(row);
      if(!cedula){
        excluded.push({source:sourceName, reason:"sin_cedula", cedula:"", estudiante:nameOf(row), sheet:sheetName(row), rowNumber:row._inforRowNumber || ""});
        return;
      }
      if(enabled && !existsInPeriod(cedula, index)){
        excluded.push({source:sourceName, reason:"fuera_del_periodo", cedula:cedula, estudiante:nameOf(row), sheet:sheetName(row), rowNumber:row._inforRowNumber || ""});
        return;
      }
      valid.push(row);
    });
    return {valid:valid, excluded:excluded};
  }

  function dedupeByCedula(rows, sourceName){
    var map = Object.create(null);
    var duplicates = [];
    safeList(rows).forEach(function(row){
      var variants = cedulaVariants(cedulaOf(row));
      var key = variants[0] || ("sin_cedula_" + (row._inforRowNumber || Math.random()));
      if(!map[key]){map[key] = row;return;}
      var current = map[key];
      if(rowScore(row) > rowScore(current)){
        duplicates.push({source:sourceName, reason:"duplicado_reemplazado", cedula:cedulaOf(current), estudiante:nameOf(current), sheet:sheetName(current), rowNumber:current._inforRowNumber || ""});
        map[key] = row;
      }else{
        duplicates.push({source:sourceName, reason:"duplicado_omitido", cedula:cedulaOf(row), estudiante:nameOf(row), sheet:sheetName(row), rowNumber:row._inforRowNumber || ""});
      }
    });
    return {rows:Object.keys(map).map(function(key){return map[key];}), duplicates:duplicates};
  }

  function complexivoNote(row){
    var practico = num(findValue(row, PRACTICO_ALIASES));
    var teorico = num(findValue(row, TEORICO_ALIASES));
    var supletorio = num(findValue(row, SUPLETORIO_ALIASES));
    var final = practico != null && teorico != null ? round2((practico * 0.60) + (teorico * 0.40)) : null;
    return {notaPractico:practico, notaTeorico:teorico, notaSupletorio:supletorio, notaFinal:final, formula:"notaPractico*0.60 + notaTeorico*0.40"};
  }

  function trabajoNote(row){
    var nart = num(findValue(row, NART_ALIASES));
    var ndef = num(findValue(row, NDEF_ALIASES));
    var nfin = num(findValue(row, NFIN_ALIASES));
    if(nfin == null && nart != null && ndef != null && nart >= 7){nfin = round2((nart * 0.70) + (ndef * 0.30));}
    return {nart:nart, ndef:ndef, nfin:nfin};
  }

  function basePrepared(row, modalidad, label){
    return Object.assign({}, row, {
      cedula:cedulaOf(row),
      nombres:nameOf(row),
      carrera:careerOf(row),
      titulo:titleOf(row),
      tutor:tutorOf(row),
      modalidadTitulacion:modalidad,
      modalidadLabel:label,
      _inforRegularPrepared:true
    });
  }

  function prepareComplexivo(row){
    var note = complexivoNote(row);
    return Object.assign(basePrepared(row, "EXAMEN_COMPLEXIVO", "Examen Complexivo"), {
      notaPractico:note.notaPractico,
      notaTeorico:note.notaTeorico,
      notaSupletorio:note.notaSupletorio,
      notaFinal:note.notaFinal,
      notafinal:note.notaFinal,
      nfin:note.notaFinal,
      _inforNotaFormula:note.formula
    });
  }

  function prepareTrabajo(row){
    var note = trabajoNote(row);
    return Object.assign(basePrepared(row, "TRABAJO_TITULACION", "Trabajo de Titulación"), {
      nart:note.nart,
      ndef:note.ndef,
      nfin:note.nfin,
      notaFinal:note.nfin,
      notafinal:note.nfin
    });
  }

  function summarizeRows(rows){
    var cedulas = Object.create(null);
    safeList(rows).forEach(function(row){cedulaVariants(cedulaOf(row)).forEach(function(c){cedulas[c] = true;});});
    return {rows:safeList(rows).length, cedulas:Object.keys(cedulas).length};
  }

  function analyze(snapshot){
    snapshot = snapshot || {};
    var periodId = text(snapshot.periodId || snapshot.periodLabel);
    var periodType = snapshot.periodType || {};
    var rows = snapshot.excelData && Array.isArray(snapshot.excelData.rows) ? snapshot.excelData.rows : [];
    var source = periodSource(periodId);
    var index = buildPeriodIndex(source.rows);
    var validationEnabled = source.rows.length > 0;

    var nucleosAll = rows.filter(isNucleos);
    var complexivoAll = rows.filter(isComplexivo);
    var trabajoAll = rows.filter(isTrabajo);

    var nucleosFiltered = filterByPeriod(nucleosAll, index, validationEnabled, "NÚCLEOS");
    var complexivoFiltered = filterByPeriod(complexivoAll, index, validationEnabled, "notas_complexivo");
    var trabajoFiltered = filterByPeriod(trabajoAll, index, validationEnabled, "trabajo_titulacion");

    var complexivoDedup = dedupeByCedula(complexivoFiltered.valid, "notas_complexivo");
    var trabajoDedup = dedupeByCedula(trabajoFiltered.valid, "trabajo_titulacion");

    var preparedComplexivo = complexivoDedup.rows.map(prepareComplexivo);
    var preparedTrabajo = trabajoDedup.rows.map(prepareTrabajo);
    var preparedRows = preparedComplexivo.concat(preparedTrabajo);
    var excluded = [].concat(nucleosFiltered.excluded, complexivoFiltered.excluded, trabajoFiltered.excluded);
    var duplicates = [].concat(complexivoDedup.duplicates, trabajoDedup.duplicates);

    return {
      ok:rows.length > 0,
      periodId:periodId,
      periodType:periodType,
      validation:{enabled:validationEnabled, source:source.source, periodCedulas:Object.keys(index).length, excluded:excluded.length},
      sheets:{nucleos:summarizeRows(nucleosAll), complexivo:summarizeRows(complexivoAll), trabajoTitulacion:summarizeRows(trabajoAll)},
      nucleos:{rows:nucleosFiltered.valid, infoOnly:true, total:nucleosFiltered.valid.length},
      complexivo:{rows:preparedComplexivo, totalOriginal:complexivoAll.length, totalValid:complexivoFiltered.valid.length, totalFinal:preparedComplexivo.length, formula:"notaPractico*0.60 + notaTeorico*0.40"},
      trabajoTitulacion:{rows:preparedTrabajo, totalOriginal:trabajoAll.length, totalValid:trabajoFiltered.valid.length, totalFinal:preparedTrabajo.length},
      excluded:excluded,
      duplicates:duplicates,
      rows:preparedRows,
      summary:{totalExcel:rows.length, validForReport:preparedRows.length, excludedByPeriod:excluded.filter(function(x){return x.reason === "fuera_del_periodo";}).length, excludedNoCedula:excluded.filter(function(x){return x.reason === "sin_cedula";}).length, duplicates:duplicates.length},
      generatedAt:new Date().toISOString()
    };
  }

  function prepareRows(snapshot){
    var result = analyze(snapshot);
    return result.rows || [];
  }

  window.InforRegular = {
    analyze:analyze,
    prepareRows:prepareRows,
    complexivoNote:complexivoNote,
    trabajoNote:trabajoNote,
    cedulaOf:cedulaOf,
    cedulaVariants:cedulaVariants,
    isNucleos:isNucleos,
    isComplexivo:isComplexivo,
    isTrabajo:isTrabajo
  };
})(window);
