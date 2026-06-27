/* =========================================================
Nombre completo: stats.rules.js
Ruta o ubicación: /Requisitos/Stats/stats.rules.js
Función o funciones:
- Centralizar reglas de Stats para requisitos, aprobación final y clasificación de períodos.
- Identificar períodos Regulares y PVC de forma flexible.
- Separar requisitos aplicables para PVC, Regulares y requisitos finales.
- Evaluar cumplimiento binario: Cumple / No cumple.
Con qué se conecta:
- stats.core.js
- stats.app.js
- stats.charts.js
- stats.students.js
========================================================= */
(function(window){
  "use strict";

  function text(value){
    return String(value == null ? "" : value).trim();
  }

  function norm(value){
    return text(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function compact(value){
    return norm(value).replace(/[^a-z0-9]/g, "");
  }

  function label(key, fallback){
    try{
      if(window.BLCampos && typeof window.BLCampos.requirementLabel === "function"){
        return window.BLCampos.requirementLabel(key, fallback);
      }
    }catch(error){}
    return fallback || key;
  }

  function req(key, fallback, group){
    return {
      key: key,
      label: label(key, fallback),
      group: group || "requisito"
    };
  }

  var BASE_REQUIREMENTS = [
    req("academico", "Académico"),
    req("documentacion", "Documentación"),
    req("financiero", "Financiero"),
    req("practicasvinculacion", "Prácticas"),
    req("vinculacion", "Vinculación"),
    req("seguimientograduados", "Seguimiento graduados"),
    req("ingles", "Inglés"),
    req("actualizaciondatos", "Actualización de datos")
  ];

  var REGULAR_EXTRA_REQUIREMENTS = [
    req("titulacion", "Titulación")
  ];

  var FINAL_REQUIREMENTS = [
    req("aprobaciontitulacion", "Aprobación titulación", "final"),
    req("aprobacioncomplexivoproyecto", "Aprobación complexivo/proyecto", "final")
  ];

  var FILTER_REQUIREMENTS = BASE_REQUIREMENTS
    .concat(REGULAR_EXTRA_REQUIREMENTS)
    .concat(FINAL_REQUIREMENTS);

  var KEY_ALIASES = {
    academico: ["academico", "académico", "Academico", "Académico"],
    documentacion: ["documentacion", "documentación", "Documentacion", "Documentación"],
    financiero: ["financiero", "Financiero"],
    titulacion: ["titulacion", "titulación", "Titulacion", "Titulación"],
    practicasvinculacion: ["practicasvinculacion", "practicas", "prácticas", "PracticasVinculacion", "Prácticas Vinculación", "Practicas Vinculacion", "Practicas"],
    vinculacion: ["vinculacion", "vinculación", "Vinculacion", "Vinculación"],
    seguimientograduados: ["seguimientograduados", "seguimiento graduados", "SeguimientoGraduados", "Seguimiento graduados"],
    ingles: ["ingles", "inglés", "Ingles", "Inglés"],
    actualizaciondatos: ["actualizaciondatos", "actualización datos", "actualizacion datos", "ActualizacionDatos", "ActualizaciónDatos", "Actualización de datos"],
    aprobaciontitulacion: ["aprobaciontitulacion", "aprobación titulación", "aprobacion titulacion", "AprobacionTitulacion", "AprobaciónTitulación", "Aprobación titulación"],
    aprobacioncomplexivoproyecto: ["aprobacioncomplexivoproyecto", "aprobación complexivo proyecto", "aprobacion complexivo proyecto", "aprobacion complexivo/proyecto", "AprobacionComplexivoProyecto", "AprobaciónComplexivoProyecto", "Aprobación complexivo/proyecto"]
  };

  var MONTHS = {
    enero: 1, ene: 1,
    febrero: 2, feb: 2,
    marzo: 3, mar: 3,
    abril: 4, abr: 4,
    mayo: 5, may: 5,
    junio: 6, jun: 6,
    julio: 7, jul: 7,
    agosto: 8, ago: 8,
    septiembre: 9, setiembre: 9, sept: 9, sep: 9, set: 9,
    octubre: 10, oct: 10,
    noviembre: 11, nov: 11,
    diciembre: 12, dic: 12
  };

  var CUMPLE_VALUES = [
    "si", "s", "ok", "cumple", "aprobado", "aprobada", "1", "true", "x", "validado", "validada", "completo", "completa"
  ];

  function cloneRequirement(item){
    return {
      key: item.key,
      label: label(item.key, item.label),
      group: item.group || "requisito"
    };
  }

  function cloneRequirements(list){
    return (list || []).map(cloneRequirement);
  }

  function includesMonthPair(months, a, b){
    return months.indexOf(a) >= 0 && months.indexOf(b) >= 0;
  }

  function extractMonthsFromText(value){
    var source = norm(value);
    var months = [];
    var seen = {};

    Object.keys(MONTHS).forEach(function(name){
      var month = MONTHS[name];
      var pattern = new RegExp("(^|[^a-z])" + name + "([^a-z]|$)", "i");
      if(pattern.test(source) && !seen[month]){
        seen[month] = true;
        months.push(month);
      }
    });

    return months;
  }

  function extractMonthsFromNumericPeriod(value){
    var source = text(value);
    var months = [];
    var seen = {};
    var match;
    var yearMonth = /(?:19|20)\d{2}\D{0,5}(0?[1-9]|1[0-2])/g;
    var monthYear = /(0?[1-9]|1[0-2])\D{0,5}(?:19|20)\d{2}/g;

    while((match = yearMonth.exec(source)) !== null){
      addMonth(Number(match[1]));
    }

    while((match = monthYear.exec(source)) !== null){
      addMonth(Number(match[1]));
    }

    function addMonth(month){
      if(month >= 1 && month <= 12 && !seen[month]){
        seen[month] = true;
        months.push(month);
      }
    }

    return months;
  }

  function extractMonths(value){
    var map = {};
    return extractMonthsFromText(value)
      .concat(extractMonthsFromNumericPeriod(value))
      .filter(function(month){
        if(map[month]) return false;
        map[month] = true;
        return true;
      });
  }

  function isRegularPeriod(value){
    var months = extractMonths(value);
    return includesMonthPair(months, 10, 3) || includesMonthPair(months, 4, 9);
  }

  function classifyPeriod(value){
    var source = text(value);
    var months = extractMonths(source);
    var regular = isRegularPeriod(source);
    var pattern = "PVC";

    if(includesMonthPair(months, 10, 3)) pattern = "OCTUBRE_MARZO";
    else if(includesMonthPair(months, 4, 9)) pattern = "ABRIL_SEPTIEMBRE";

    return {
      id: regular ? "REGULAR" : "PVC",
      label: regular ? "Regular" : "PVC",
      isRegular: regular,
      isPVC: !regular,
      pattern: pattern,
      months: months,
      raw: source
    };
  }

  function periodTextFromRow(row){
    row = row || {};
    return text(row.periodoLabel || row.periodo || row.Periodo || row.periodoId || row.idPeriodo || row.periodId || "");
  }

  function classifyStudent(row){
    return classifyPeriod(periodTextFromRow(row));
  }

  function isFinalRequirement(key){
    var k = compact(key);
    return FINAL_REQUIREMENTS.some(function(item){ return compact(item.key) === k; });
  }

  function isTitulacionRequirement(key){
    return compact(key) === "titulacion";
  }

  function requirementsForPeriod(periodValue){
    var info = typeof periodValue === "object" && periodValue && periodValue.id ? periodValue : classifyPeriod(periodValue);
    var list = cloneRequirements(BASE_REQUIREMENTS);
    if(info.id === "REGULAR"){
      list = list.concat(cloneRequirements(REGULAR_EXTRA_REQUIREMENTS));
    }
    return list;
  }

  function requirementsForStudent(row){
    return requirementsForPeriod(classifyStudent(row));
  }

  function appliesRequirement(key, periodValue){
    var k = compact(key);
    if(isFinalRequirement(k)) return true;
    if(isTitulacionRequirement(k)){
      return classifyPeriod(periodValue).id === "REGULAR";
    }
    return BASE_REQUIREMENTS.some(function(item){ return compact(item.key) === k; });
  }

  function getRequirementByKey(key){
    var k = compact(key);
    return FILTER_REQUIREMENTS.map(cloneRequirement).filter(function(item){
      return compact(item.key) === k;
    })[0] || req(key, key);
  }

  function valueOf(row, key){
    row = row || {};
    var target = compact(key);
    var aliases = (KEY_ALIASES[target] || [key]).map(compact);
    var directKeys = [key].concat(KEY_ALIASES[target] || []);
    var i;

    for(i = 0; i < directKeys.length; i++){
      if(Object.prototype.hasOwnProperty.call(row, directKeys[i])) return row[directKeys[i]];
    }

    var keys = Object.keys(row);
    for(i = 0; i < keys.length; i++){
      if(aliases.indexOf(compact(keys[i])) >= 0) return row[keys[i]];
    }

    for(i = 0; i < keys.length; i++){
      if(compact(keys[i]) === target) return row[keys[i]];
    }

    return "";
  }

  function cellStatus(value){
    return CUMPLE_VALUES.indexOf(norm(value)) >= 0 ? "cumple" : "no_cumple";
  }

  function isCumple(value){
    return cellStatus(value) === "cumple";
  }

  function missingRequirements(row){
    var list = requirementsForStudent(row);
    return list.filter(function(item){
      return !isCumple(valueOf(row, item.key));
    });
  }

  function studentApproval(row){
    var period = classifyStudent(row);
    var applicable = requirementsForPeriod(period);
    var missing = applicable.filter(function(item){
      return !isCumple(valueOf(row, item.key));
    });

    return {
      approved: missing.length === 0,
      label: missing.length === 0 ? "Aprobado" : "No cumple",
      periodType: period,
      applicableRequirements: applicable,
      missingRequirements: missing,
      notApplicableRequirements: period.id === "PVC" ? cloneRequirements(REGULAR_EXTRA_REQUIREMENTS) : []
    };
  }

  function finalApproval(row){
    return cloneRequirements(FINAL_REQUIREMENTS).map(function(item){
      var status = cellStatus(valueOf(row, item.key));
      return {
        key: item.key,
        label: item.label,
        status: status,
        cumple: status === "cumple"
      };
    });
  }

  window.StatsRules = {
    BASE_REQUIREMENTS: cloneRequirements(BASE_REQUIREMENTS),
    REGULAR_EXTRA_REQUIREMENTS: cloneRequirements(REGULAR_EXTRA_REQUIREMENTS),
    FINAL_REQUIREMENTS: cloneRequirements(FINAL_REQUIREMENTS),
    FILTER_REQUIREMENTS: cloneRequirements(FILTER_REQUIREMENTS),
    text: text,
    norm: norm,
    compact: compact,
    valueOf: valueOf,
    cellStatus: cellStatus,
    isCumple: isCumple,
    extractMonths: extractMonths,
    classifyPeriod: classifyPeriod,
    classifyStudent: classifyStudent,
    isRegularPeriod: isRegularPeriod,
    requirementsForPeriod: requirementsForPeriod,
    requirementsForStudent: requirementsForStudent,
    appliesRequirement: appliesRequirement,
    isFinalRequirement: isFinalRequirement,
    isTitulacionRequirement: isTitulacionRequirement,
    getRequirementByKey: getRequirementByKey,
    missingRequirements: missingRequirements,
    studentApproval: studentApproval,
    finalApproval: finalApproval
  };
})(window);
