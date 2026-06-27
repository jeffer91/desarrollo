/* =========================================================
Nombre completo: stats.core.js
Ruta o ubicación: /Requisitos/Stats/stats.core.js
Función o funciones:
- Leer estudiantes desde BL2/cache cuando esté disponible y usar ExcelLocalRepo como respaldo.
- Calcular KPIs, matrícula, estados, carreras, divisiones, períodos, requisitos y aprobación final.
- Aplicar reglas PVC/Regular desde stats.rules.js cuando esté cargado.
- Filtrar por período, división, matrícula, carrera, estado y requisito seleccionado.
- Mantener ACTIVO por defecto.
Con qué se conecta:
- stats.rules.js
- ../BaseLocal2/repositories/bl2-stats.repo.js
- excel-local.repo.js
- bl-periodos-canon.service.js
- bl-divisiones.service.js
- bl-campos.js
- stats.app.js
- stats.charts.js
- stats.students.js
========================================================= */
(function(window){
  "use strict";

  function text(value){return String(value==null?"":value).trim();}
  function norm(value){return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
  function compact(value){return norm(value).replace(/[^a-z0-9]/g,"");}
  function pct(n,d){return d?Math.round((n*10000)/d)/100:0;}
  function label(key,fallback){try{if(window.BLCampos&&typeof window.BLCampos.requirementLabel==="function")return window.BLCampos.requirementLabel(key,fallback);}catch(error){}return fallback||key;}
  function req(key,fallback,group){return {key:key,label:label(key,fallback),group:group||"requisito"};}

  var FALLBACK_RULES=(function(){
    var BASE=[req("academico","Académico"),req("documentacion","Documentación"),req("financiero","Financiero"),req("practicasvinculacion","Prácticas"),req("vinculacion","Vinculación"),req("seguimientograduados","Seguimiento graduados"),req("ingles","Inglés"),req("actualizaciondatos","Actualización de datos")];
    var EXTRA=[req("titulacion","Titulación")];
    var FINAL=[req("aprobaciontitulacion","Aprobación titulación","final"),req("aprobacioncomplexivoproyecto","Aprobación complexivo/proyecto","final")];
    var MONTHS={enero:1,ene:1,febrero:2,feb:2,marzo:3,mar:3,abril:4,abr:4,mayo:5,may:5,junio:6,jun:6,julio:7,jul:7,agosto:8,ago:8,septiembre:9,setiembre:9,sept:9,sep:9,set:9,octubre:10,oct:10,noviembre:11,nov:11,diciembre:12,dic:12};
    var CUMPLE=["si","s","ok","cumple","aprobado","aprobada","1","true","x","validado","validada","completo","completa"];
    var ALIASES={academico:["academico","académico","Academico","Académico"],documentacion:["documentacion","documentación","Documentacion","Documentación"],financiero:["financiero","Financiero"],titulacion:["titulacion","titulación","Titulacion","Titulación"],practicasvinculacion:["practicasvinculacion","practicas","prácticas","PracticasVinculacion","Prácticas Vinculación","Practicas Vinculacion","Practicas"],vinculacion:["vinculacion","vinculación","Vinculacion","Vinculación"],seguimientograduados:["seguimientograduados","seguimiento graduados","SeguimientoGraduados","Seguimiento graduados"],ingles:["ingles","inglés","Ingles","Inglés"],actualizaciondatos:["actualizaciondatos","actualización datos","actualizacion datos","ActualizacionDatos","ActualizaciónDatos","Actualización de datos"],aprobaciontitulacion:["aprobaciontitulacion","aprobación titulación","aprobacion titulacion","AprobacionTitulacion","AprobaciónTitulación","Aprobación titulación"],aprobacioncomplexivoproyecto:["aprobacioncomplexivoproyecto","aprobación complexivo proyecto","aprobacion complexivo proyecto","aprobacion complexivo/proyecto","AprobacionComplexivoProyecto","AprobaciónComplexivoProyecto","Aprobación complexivo/proyecto"]};
    function clone(item){return {key:item.key,label:label(item.key,item.label),group:item.group||"requisito"};}
    function clones(list){return (list||[]).map(clone);}
    function monthsFromText(value){var source=norm(value),out=[],seen={};Object.keys(MONTHS).forEach(function(name){var month=MONTHS[name];var pattern=new RegExp("(^|[^a-z])"+name+"([^a-z]|$)","i");if(pattern.test(source)&&!seen[month]){seen[month]=true;out.push(month);}});return out;}
    function monthsFromNumbers(value){var source=text(value),out=[],seen={},m;var yearMonth=/(?:19|20)\d{2}\D{0,5}(0?[1-9]|1[0-2])/g;var monthYear=/(0?[1-9]|1[0-2])\D{0,5}(?:19|20)\d{2}/g;function add(month){month=Number(month);if(month>=1&&month<=12&&!seen[month]){seen[month]=true;out.push(month);}}while((m=yearMonth.exec(source))!==null)add(m[1]);while((m=monthYear.exec(source))!==null)add(m[1]);return out;}
    function extractMonths(value){var map={};return monthsFromText(value).concat(monthsFromNumbers(value)).filter(function(month){if(map[month])return false;map[month]=true;return true;});}
    function hasPair(months,a,b){return months.indexOf(a)>=0&&months.indexOf(b)>=0;}
    function classifyPeriod(value){var raw=text(value);var months=extractMonths(raw);var regular=hasPair(months,10,3)||hasPair(months,4,9);var pattern=hasPair(months,10,3)?"OCTUBRE_MARZO":(hasPair(months,4,9)?"ABRIL_SEPTIEMBRE":"PVC");return {id:regular?"REGULAR":"PVC",label:regular?"Regular":"PVC",isRegular:regular,isPVC:!regular,pattern:pattern,months:months,raw:raw};}
    function periodText(row){row=row||{};return text(row.periodoLabel||row.periodo||row.Periodo||row.periodoId||row.idPeriodo||row.periodId||row._periodo||row._bl2Periodo||"");}
    function classifyStudent(row){return classifyPeriod(periodText(row));}
    function isFinalRequirement(key){var k=compact(key);return FINAL.some(function(item){return compact(item.key)===k;});}
    function isTitulacionRequirement(key){return compact(key)==="titulacion";}
    function requirementsForPeriod(periodValue){var info=typeof periodValue==="object"&&periodValue&&periodValue.id?periodValue:classifyPeriod(periodValue);var list=clones(BASE);if(info.id==="REGULAR")list=list.concat(clones(EXTRA));return list;}
    function requirementsForStudent(row){return requirementsForPeriod(classifyStudent(row));}
    function appliesRequirement(key,periodValue){var k=compact(key);if(isFinalRequirement(k))return true;if(isTitulacionRequirement(k))return classifyPeriod(periodValue).id==="REGULAR";return BASE.some(function(item){return compact(item.key)===k;});}
    function getRequirementByKey(key){var k=compact(key);return clones(BASE.concat(EXTRA).concat(FINAL)).filter(function(item){return compact(item.key)===k;})[0]||req(key,key);}
    function valueOf(row,key){row=row||{};var target=compact(key);var aliases=(ALIASES[target]||[key]).map(compact);var direct=[key].concat(ALIASES[target]||[]);var i,keys;for(i=0;i<direct.length;i++){if(Object.prototype.hasOwnProperty.call(row,direct[i]))return row[direct[i]];}keys=Object.keys(row);for(i=0;i<keys.length;i++){if(aliases.indexOf(compact(keys[i]))>=0)return row[keys[i]];}for(i=0;i<keys.length;i++){if(compact(keys[i])===target)return row[keys[i]];}return "";}
    function cellStatus(value){return CUMPLE.indexOf(norm(value))>=0?"cumple":"no_cumple";}
    function isCumple(value){return cellStatus(value)==="cumple";}
    function studentApproval(row){var period=classifyStudent(row);var applicable=requirementsForPeriod(period);var missing=applicable.filter(function(item){return !isCumple(valueOf(row,item.key));});return {approved:missing.length===0,label:missing.length===0?"Aprobado":"No cumple",periodType:period,applicableRequirements:applicable,missingRequirements:missing,notApplicableRequirements:period.id==="PVC"?clones(EXTRA):[]};}
    function finalApproval(row){return clones(FINAL).map(function(item){var status=cellStatus(valueOf(row,item.key));return {key:item.key,label:item.label,status:status,cumple:status==="cumple"};});}
    return {BASE_REQUIREMENTS:clones(BASE),REGULAR_EXTRA_REQUIREMENTS:clones(EXTRA),FINAL_REQUIREMENTS:clones(FINAL),FILTER_REQUIREMENTS:clones(BASE.concat(EXTRA).concat(FINAL)),text:text,norm:norm,compact:compact,valueOf:valueOf,cellStatus:cellStatus,isCumple:isCumple,extractMonths:extractMonths,classifyPeriod:classifyPeriod,classifyStudent:classifyStudent,requirementsForPeriod:requirementsForPeriod,requirementsForStudent:requirementsForStudent,appliesRequirement:appliesRequirement,isFinalRequirement:isFinalRequirement,isTitulacionRequirement:isTitulacionRequirement,getRequirementByKey:getRequirementByKey,studentApproval:studentApproval,finalApproval:finalApproval};
  })();

  function rules(){return window.StatsRules||FALLBACK_RULES;}
  function bl2(){return window.BL2StatsRepo||null;}
  function useBL2Rows(){return !!(bl2()&&typeof bl2().rows==="function");}
  function repo(){if(!window.ExcelLocalRepo)throw new Error("ExcelLocalRepo no disponible. Primero carga un Excel en Carga.");return window.ExcelLocalRepo;}

  function requirementLists(){
    var r=rules();
    return {
      base:(r.BASE_REQUIREMENTS||[]).slice(),
      regularExtra:(r.REGULAR_EXTRA_REQUIREMENTS||[]).slice(),
      finals:(r.FINAL_REQUIREMENTS||[]).slice(),
      filter:(r.FILTER_REQUIREMENTS||[]).slice(),
      normal:(r.BASE_REQUIREMENTS||[]).concat(r.REGULAR_EXTRA_REQUIREMENTS||[])
    };
  }

  var REQS=requirementLists().filter;

  function estadoMatricula(value){return norm(value||"ACTIVO")==="retirado"?"RETIRADO":"ACTIVO";}
  function estadoCelda(value){return rules().cellStatus(value);}

  function valueOf(row,key){return rules().valueOf(row,key);}

  function periodValue(row){
    row=row||{};
    return text(row._periodo||row._bl2Periodo||row.periodoLabel||row.periodo||row.Periodo||row.periodoId||row.idPeriodo||row.periodId||"");
  }

  function classifyPeriodOf(row){return rules().classifyPeriod(periodValue(row));}

  function estadoGeneral(row){
    var approval=rules().studentApproval(row||{});
    var ok=approval.applicableRequirements.length-approval.missingRequirements.length;
    var no=approval.missingRequirements.length;
    return {
      id:approval.approved?"cumple":"no_cumple",
      label:approval.approved?"Aprobado":"No cumple",
      ok:ok,
      no:no,
      pend:0,
      approved:approval.approved,
      periodType:approval.periodType,
      applicableRequirements:approval.applicableRequirements,
      missingRequirements:approval.missingRequirements,
      notApplicableRequirements:approval.notApplicableRequirements||[]
    };
  }

  function periods(){
    if(window.BL2EstudiantesRepo&&typeof window.BL2EstudiantesRepo.listPeriods==="function")return window.BL2EstudiantesRepo.listPeriods();
    if(bl2()&&typeof bl2().resumen==="function"){
      try{return (bl2().resumen({matricula:"ACTIVO"}).periodList||[]);}catch(error){}
    }
    return repo().listPeriods?repo().listPeriods():(repo().getSnapshot().periods||[]);
  }

  function rawStudents(matricula){
    if(repo().listStudentsByStatus&&matricula!==undefined)return repo().listStudentsByStatus(matricula||"");
    return repo().listAllStudents?repo().listAllStudents():(repo().getSnapshot().students||[]);
  }

  function samePeriod(a,b){
    if(!text(b))return true;
    if(window.BLPeriodosCanon&&typeof window.BLPeriodosCanon.samePeriod==="function")return window.BLPeriodosCanon.samePeriod(a,b);
    return text(a)===text(b)||norm(a)===norm(b);
  }

  function divisionOf(row){
    if(row&&row._bl2Division)return row._bl2Division;
    if(window.BLDivisionesService&&typeof window.BLDivisionesService.studentDivision==="function")return window.BLDivisionesService.studentDivision(row);
    var list=Array.isArray(row&&row.divisiones)?row.divisiones:[];
    return list[0]||row.division||row.Division||"Sin división";
  }

  function hasDivision(row,division){
    if(!text(division))return true;
    if(window.BLDivisionesService&&typeof window.BLDivisionesService.hasDivision==="function")return window.BLDivisionesService.hasDivision(row,division);
    return norm(divisionOf(row))===norm(division);
  }

  function decorate(row){
    var r=Object.assign({},row||{});
    r._estadoMatricula=estadoMatricula(r._bl2EstadoMatricula||r.estadoMatricula||r.EstadoMatricula);
    r._cedula=text(r._bl2Id||r.cedula||r.Cedula||r.cédula||r.numeroIdentificacion||r.numeroidentificacion||r.NumeroIdentificacion||r.identificacion||r.Identificacion);
    r._nombres=text(r._bl2Nombre||r.nombres||r.Nombres||r.nombre||r.Nombre||r.estudiante||r.Estudiante||r.apellidosNombres||r.ApellidosNombres);
    r._carrera=text(r._bl2Carrera||r.nombrecarrera||r.nombreCarrera||r.NombreCarrera||r.carrera||r.Carrera)||"SIN CARRERA";
    r._division=divisionOf(r);
    r._periodo=text(r._bl2Periodo||r.periodoLabel||r.periodo||r.Periodo||r.periodoId)||"SIN PERÍODO";
    r._periodoId=text(r.periodoId||r.idPeriodo||r.periodId||r._bl2Periodo||r._periodo);
    r.periodoLabel=r._periodo;
    r.periodoId=r._periodoId;
    r._periodType=classifyPeriodOf(r);
    r._approval=rules().studentApproval(r);
    r._estado=estadoGeneral(r);
    r._finalApproval=rules().finalApproval(r);
    return r;
  }

  function rowsFromBL2(opts){
    opts=opts||{};
    var query={
      periodId:opts.periodId||"",
      division:opts.division||"",
      matricula:opts.matricula==null?"ACTIVO":opts.matricula,
      career:opts.career||"",
      status:""
    };
    return (bl2().rows(query)||[]).map(decorate);
  }

  function rowsFromExcel(opts){
    opts=opts||{};
    var matricula=opts.matricula==null?"ACTIVO":text(opts.matricula);
    return rawStudents(matricula).map(decorate);
  }

  function baseRows(opts){return useBL2Rows()?rowsFromBL2(opts):rowsFromExcel(opts);}

  function requirementStatus(row,key){
    var period=classifyPeriodOf(row);
    var req=rules().getRequirementByKey(key);
    var isFinal=rules().isFinalRequirement(req.key);
    var applies=isFinal||rules().appliesRequirement(req.key,period.raw||row._periodo||row._periodoId);
    if(!applies){return {key:req.key,label:req.label,status:"no_aplica",labelStatus:"No aplica para PVC",cumple:false,applies:false};}
    var status=estadoCelda(valueOf(row,req.key));
    return {key:req.key,label:req.label,status:status,labelStatus:status==="cumple"?"Cumple":"No cumple",cumple:status==="cumple",applies:true};
  }

  function normalizeStatusFilter(status){
    status=text(status);
    if(status==="pendiente")return "no_cumple";
    return status;
  }

  function filtered(opts){
    opts=opts||{};
    var periodId=text(opts.periodId);
    var division=text(opts.division);
    var career=text(opts.career);
    var status=normalizeStatusFilter(opts.status);
    var matricula=opts.matricula==null?"ACTIVO":text(opts.matricula);
    var list=baseRows({periodId:periodId,division:division,matricula:matricula,career:career});

    return list.filter(function(row){
      if(matricula&&row._estadoMatricula!==matricula)return false;
      if(periodId&&!samePeriod(row._periodoId||row._periodo,periodId))return false;
      if(division&&!hasDivision(row,division))return false;
      if(career&&row._carrera!==career)return false;
      if(status&&row._estado.id!==status)return false;
      return true;
    });
  }

  function listOptions(values){
    var map={};
    (values||[]).forEach(function(value){value=text(value);if(value)map[value]=true;});
    return Object.keys(map).sort(function(a,b){return a.localeCompare(b,"es");});
  }

  function careers(list){
    var rows=list||filtered({matricula:"ACTIVO",status:""});
    return listOptions(rows.map(function(row){return row._carrera||"SIN CARRERA";}));
  }

  function divisions(list){
    var rows=list||filtered({matricula:"ACTIVO",status:""});
    if(window.BLDivisionesService&&typeof window.BLDivisionesService.listDivisionsWithEmpty==="function")return window.BLDivisionesService.listDivisionsWithEmpty(rows,"");
    return listOptions(rows.map(function(row){return row._division||"Sin división";}));
  }

  function byKey(list,getKey){
    var out={};
    (list||[]).forEach(function(row){
      var key=getKey(row)||"Sin dato";
      if(!out[key])out[key]={key:key,total:0,cumple:0,pendiente:0,no_cumple:0,avance:0};
      out[key].total++;
      out[key][row._estado.id]++;
    });
    Object.keys(out).forEach(function(key){out[key].avance=pct(out[key].cumple,out[key].total);});
    return Object.keys(out).map(function(key){return out[key];}).sort(function(a,b){return b.total-a.total||a.key.localeCompare(b.key,"es");});
  }

  function requirementSummary(list,requirements){
    list=list||[];
    return (requirements||[]).map(function(reqItem){
      var item={key:reqItem.key,label:reqItem.label,group:reqItem.group||"requisito",total:list.length,aplica:0,no_aplica:0,cumple:0,pendiente:0,no_cumple:0,avance:0};
      list.forEach(function(row){
        var status=requirementStatus(row,reqItem.key);
        if(!status.applies){item.no_aplica++;return;}
        item.aplica++;
        if(status.cumple)item.cumple++;else item.no_cumple++;
      });
      item.avance=pct(item.cumple,item.aplica);
      return item;
    });
  }

  function requisitos(list){return requirementSummary(list,requirementLists().normal);}
  function requisitosFinales(list){return requirementSummary(list,requirementLists().finals);}
  function requisitosFiltro(){
    var lists=requirementLists();
    return {
      requisitos:lists.normal.map(function(item){return {key:item.key,label:item.label,group:"requisito"};}),
      finales:lists.finals.map(function(item){return {key:item.key,label:item.label,group:"final"};}),
      all:lists.filter.map(function(item){return {key:item.key,label:item.label,group:item.group||"requisito"};})
    };
  }

  function selectedRequirementSummary(list,key){
    key=text(key);
    if(!key)return null;
    var reqItem=rules().getRequirementByKey(key);
    var stats=requirementSummary(list,[reqItem])[0];
    var rows=(list||[]).map(function(row){
      var status=requirementStatus(row,reqItem.key);
      return Object.assign({},row,{_selectedRequirementStatus:status});
    });
    return {key:reqItem.key,label:reqItem.label,group:reqItem.group||"requisito",stats:stats,rows:rows};
  }

  function periodApproval(list,opts){
    opts=opts||{};
    if(!text(opts.periodId))return null;
    var reference=(list&&list[0])?periodValue(list[0]):text(opts.periodLabel||opts.periodId);
    var period=rules().classifyPeriod(reference||opts.periodId);
    var approved=0;
    (list||[]).forEach(function(row){if(row._estado.id==="cumple")approved++;});
    return {
      visible:true,
      type:period.id,
      label:period.label,
      pattern:period.pattern,
      total:(list||[]).length,
      approved:approved,
      rejected:(list||[]).length-approved,
      avance:pct(approved,(list||[]).length)
    };
  }

  function requirementTotals(list){
    var totalReq=0;
    var okReq=0;
    (list||[]).forEach(function(row){
      var approval=row._approval||rules().studentApproval(row);
      totalReq+=approval.applicableRequirements.length;
      okReq+=approval.applicableRequirements.length-approval.missingRequirements.length;
    });
    return {total:totalReq,ok:okReq,avance:pct(okReq,totalReq)};
  }

  function resumen(opts){
    opts=Object.assign({matricula:"ACTIVO"},opts||{});
    var list=filtered(opts);
    var total=list.length;
    var estados={cumple:0,pendiente:0,no_cumple:0};
    var matriculas={ACTIVO:0,RETIRADO:0};
    list.forEach(function(row){
      estados[row._estado.id]++;
      matriculas[row._estadoMatricula]=(matriculas[row._estadoMatricula]||0)+1;
    });

    var reqTotals=requirementTotals(list);
    var baseForDivision=filtered({periodId:opts.periodId||"",matricula:opts.matricula||"",division:"",career:"",status:""});
    var baseForCareer=filtered({periodId:opts.periodId||"",matricula:opts.matricula||"",division:opts.division||"",career:"",status:""});
    var selected=selectedRequirementSummary(list,opts.requirementKey||opts.requisito||"");

    return {
      total:total,
      estados:estados,
      matriculas:matriculas,
      avanceGeneral:reqTotals.avance,
      requisitos:requisitos(list),
      requisitosFinales:requisitosFinales(list),
      requisitosFiltro:requisitosFiltro(),
      selectedRequirement:selected,
      periodApproval:periodApproval(list,opts),
      carreras:byKey(list,function(row){return row._carrera;}),
      periodos:byKey(list,function(row){return row._periodo;}),
      divisiones:byKey(list,function(row){return row._division;}),
      periodList:periods(),
      divisionList:divisions(baseForDivision),
      careerList:careers(baseForCareer),
      rows:list,
      estudiantes:list,
      diagnostics:{generatedAt:new Date().toISOString(),source:source(),totalStudents:total,totalRequirements:reqTotals.total,fulfilledRequirements:reqTotals.ok,filters:opts||{},divisionList:divisions(baseForDivision)}
    };
  }

  function source(){return useBL2Rows()?"BL2/cache":"ExcelLocalRepo";}

  window.StatsCore={
    REQS:REQS,
    BASE_REQUIREMENTS:requirementLists().base,
    REGULAR_EXTRA_REQUIREMENTS:requirementLists().regularExtra,
    FINAL_REQUIREMENTS:requirementLists().finals,
    FILTER_REQUIREMENTS:requirementLists().filter,
    periods:periods,
    careers:careers,
    divisions:divisions,
    filtered:filtered,
    resumen:resumen,
    estadoCelda:estadoCelda,
    estadoGeneral:estadoGeneral,
    estadoMatricula:estadoMatricula,
    divisionOf:divisionOf,
    valueOf:valueOf,
    requirementStatus:requirementStatus,
    source:source
  };
})(window);
