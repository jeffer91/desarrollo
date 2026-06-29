/* =========================================================
Nombre completo: bl2-stats.repo.js
Ruta o ubicación: /Requisitos/BaseLocal2/repositories/bl2-stats.repo.js
Función o funciones:
- Calcular estadísticas reutilizables para Stats, Coordi y Reportes desde BL2.
- Usar caché de resumen para no recalcular vistas repetidas.
- Mantener formato compatible con stats.core.js.
- Leer requisitos con alias flexibles desde StatsRules/BLCampos.
Con qué se conecta:
- bl2-estudiantes.repo.js
- bl2-cache-resumen.service.js
- Stats/stats.core.js
========================================================= */
(function(window){
  "use strict";

  function label(key,fallback){try{if(window.BLCampos&&typeof window.BLCampos.requirementLabel==="function")return window.BLCampos.requirementLabel(key,fallback);}catch(error){}return fallback||key;}
  var REQS=[
    {key:"academico",label:label("academico","Académico")},
    {key:"documentacion",label:label("documentacion","Documentación")},
    {key:"financiero",label:label("financiero","Financiero")},
    {key:"titulacion",label:label("titulacion","Titulación")},
    {key:"practicasvinculacion",label:label("practicasvinculacion","Prácticas")},
    {key:"vinculacion",label:label("vinculacion","Vinculación")},
    {key:"seguimientograduados",label:label("seguimientograduados","Seguimiento graduados")},
    {key:"ingles",label:label("ingles","Inglés")},
    {key:"actualizaciondatos",label:label("actualizaciondatos","Actualización de datos")},
    {key:"aprobaciontitulacion",label:label("aprobaciontitulacion","Aprobación titulación")},
    {key:"aprobacioncomplexivoproyecto",label:label("aprobacioncomplexivoproyecto","Aprobación complexivo/proyecto")}
  ];

  var ALIAS={
    academico:["Academico","Académico"],documentacion:["Documentacion","Documentación"],financiero:["Financiero"],titulacion:["Titulacion","Titulación"],
    practicasvinculacion:["PrácticasVinculacion","PracticasVinculacion","Prácticas Vinculación","Practicas Vinculacion","Practicas"],
    vinculacion:["Vinculacion","Vinculación"],seguimientograduados:["SeguimientoGraduados","Seguimiento graduados"],ingles:["Ingles","Inglés"],
    actualizaciondatos:["ActualizaciónDatos","ActualizacionDatos","Actualización de datos","Actualizacion de datos"],
    aprobaciontitulacion:["AprobacionTitulacion","AprobaciónTitulacion","Aprobacion Titulacion"],
    aprobacioncomplexivoproyecto:["AprobacionComplexivoProyecto","AprobaciónComplexivoProyecto","Aprobacion Complexivo Proyecto","Aprobacion Complexivo/Proyecto"]
  };

  function studentsRepo(){return window.BL2EstudiantesRepo || null;}
  function cache(){return window.BL2CacheResumen || null;}
  function text(v){return String(v==null?"":v).trim();}
  function norm(v){return text(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
  function compact(v){return norm(v).replace(/[^a-z0-9]/g,"");}
  function pct(n,d){return d?Math.round((n*10000)/d)/100:0;}
  function estadoMatricula(v){return norm(v||"ACTIVO")==="retirado"?"RETIRADO":"ACTIVO";}

  function ownValue(row,key){
    row=row||{};
    var keys=Object.keys(row), wanted=compact(key), aliases=(ALIAS[wanted]||[key]).map(compact);
    for(var i=0;i<keys.length;i++){if(keys[i]===key||compact(keys[i])===wanted||aliases.indexOf(compact(keys[i]))>=0){var value=row[keys[i]];if(value!==undefined&&value!==null&&text(value)!=="")return value;}}
    return "";
  }

  function valueOf(row,key){
    row=row||{};
    try{if(window.StatsRules&&typeof window.StatsRules.valueOf==="function"){var v=window.StatsRules.valueOf(row,key);if(text(v)!=="")return v;}}catch(error){}
    try{if(window.BLCampos&&typeof window.BLCampos.getValue==="function"){var b=window.BLCampos.getValue(row,key,"");if(text(b)!=="")return b;}}catch(error){}
    return ownValue(row,key);
  }

  function estadoCelda(v){
    if(window.StatsRules&&typeof window.StatsRules.cellStatus==="function")return window.StatsRules.cellStatus(v);
    var k=norm(v);return ["si","sí","s","ok","cumple","aprobado","aprobada","1","true","x","validado","validada","completo","completa"].indexOf(k)>=0?"cumple":"no_cumple";
  }

  function estadoGeneral(row){
    if(window.StatsRules&&typeof window.StatsRules.studentApproval==="function"){
      var approval=window.StatsRules.studentApproval(row||{});
      return {id:approval.approved?"cumple":"no_cumple",label:approval.approved?"Aprobado":"No cumple",ok:approval.applicableRequirements.length-approval.missingRequirements.length,no:approval.missingRequirements.length,pend:0};
    }
    var ok=0,no=0;REQS.forEach(function(req){if(estadoCelda(valueOf(row,req.key))==="cumple")ok++;else no++;});return {id:no?"no_cumple":"cumple",label:no?"No cumple":"Cumple todo",ok:ok,no:no,pend:0};
  }

  function samePeriod(a,b){if(!text(b))return true;if(window.BLPeriodosCanon&&typeof window.BLPeriodosCanon.samePeriod==="function")return window.BLPeriodosCanon.samePeriod(a,b);return text(a)===text(b)||norm(a)===norm(b);}
  function divisionOf(row){if(row&&row._bl2Division)return row._bl2Division;var list=Array.isArray(row&&row.divisiones)?row.divisiones:[];return list[0]||row.division||"Sin división";}

  function hydrate(row){REQS.forEach(function(req){var value=valueOf(row,req.key);if(text(value)!==""&&!text(row[req.key]))row[req.key]=value;});return row;}
  function decorate(row){var r=hydrate(Object.assign({},row||{}));r._estado=estadoGeneral(r);r._estadoMatricula=estadoMatricula(r._bl2EstadoMatricula||r.estadoMatricula);r._cedula=text(r._bl2Id||r.cedula||r.numeroIdentificacion||r.numeroidentificacion);r._nombres=text(r._bl2Nombre||r.nombres||r.Nombres||r.nombre||r.estudiante);r._carrera=text(r._bl2Carrera||r.nombrecarrera||r.nombreCarrera||r.NombreCarrera||r.carrera)||"SIN CARRERA";r._division=divisionOf(r);r._periodo=text(r._bl2Periodo||r.periodoLabel||r.periodoId)||"SIN PERÍODO";r._periodoId=text(r.periodoId||r._bl2Periodo);r._correo=text(r.correopersonal||r.CorreoPersonal||r.correoPersonal||r.correoinstitucional||r.CorreoInstitucional||r.correoInstitucional);r._celular=text(r.celular||r.Celular||r.telefono||r.whatsapp);return r;}

  function rows(opts){
    opts=opts||{};if(!studentsRepo()||typeof studentsRepo().buscar!=="function")return [];
    var result=studentsRepo().buscar({periodId:opts.periodId||"",division:opts.division||"",matricula:opts.matricula==null?"ACTIVO":opts.matricula,search:"",limit:0,force:opts.force===true});
    var list=(result.rows||[]).map(decorate);var career=text(opts.career),status=text(opts.status);
    return list.filter(function(s){if(opts.periodId&&!samePeriod(s._periodoId||s._periodo,opts.periodId))return false;if(career&&s._carrera!==career)return false;if(status&&s._estado.id!==status)return false;return true;});
  }

  function byKey(list,getKey){var out={};list.forEach(function(row){var k=getKey(row)||"Sin dato";if(!out[k])out[k]={key:k,total:0,cumple:0,pendiente:0,no_cumple:0,avance:0};out[k].total++;out[k][row._estado.id]++;});Object.keys(out).forEach(function(k){out[k].avance=pct(out[k].cumple,out[k].total);});return Object.keys(out).map(function(k){return out[k];}).sort(function(a,b){return b.total-a.total||a.key.localeCompare(b.key,"es");});}
  function requisitos(list){return REQS.map(function(req){var item={key:req.key,label:req.label,total:list.length,cumple:0,pendiente:0,no_cumple:0,avance:0,atencion:0};list.forEach(function(row){item[estadoCelda(valueOf(row,req.key))]++;});item.avance=pct(item.cumple,item.total);item.atencion=item.no_cumple*3+item.pendiente;return item;});}
  function listOptions(base){var map={};base.forEach(function(x){map[x]=true;});return Object.keys(map).sort(function(a,b){return a.localeCompare(b,"es");});}

  function resumen(opts){opts=Object.assign({matricula:"ACTIVO"},opts||{});if(cache())return cache().getOrSet("stats",opts,function(){return buildResumen(opts);},{ttl:3000});return buildResumen(opts);}
  function buildResumen(opts){
    var list=rows(opts),total=list.length,estados={cumple:0,pendiente:0,no_cumple:0},matriculas={ACTIVO:0,RETIRADO:0},reqs=requisitos(list);
    list.forEach(function(s){estados[s._estado.id]++;matriculas[s._estadoMatricula]=(matriculas[s._estadoMatricula]||0)+1;});
    var totalReq=total*REQS.length,okReq=reqs.reduce(function(a,r){return a+r.cumple;},0),baseForDivision=rows({periodId:opts.periodId||"",matricula:opts.matricula||"",division:"",career:"",status:""}),baseForCareer=rows({periodId:opts.periodId||"",matricula:opts.matricula||"",division:opts.division||"",career:"",status:""}),periods=studentsRepo()&&studentsRepo().listPeriods?studentsRepo().listPeriods():[];
    return {total:total,estados:estados,matriculas:matriculas,avanceGeneral:pct(okReq,totalReq),requisitos:reqs,carreras:byKey(list,function(s){return s._carrera;}),periodos:byKey(list,function(s){return s._periodo;}),divisiones:byKey(list,function(s){return s._division;}),periodList:periods,divisionList:listOptions(baseForDivision.map(function(s){return s._division||"Sin división";})),careerList:listOptions(baseForCareer.map(function(s){return s._carrera||"SIN CARRERA";})),rows:list,diagnostics:{generatedAt:new Date().toISOString(),source:"BL2StatsRepo",totalStudents:total,totalRequirements:totalReq,fulfilledRequirements:okReq,filters:opts||{}}};
  }

  window.BL2StatsRepo={version:"2.0.0-alpha.2",REQS:REQS,rows:rows,resumen:resumen,estadoCelda:estadoCelda,estadoGeneral:estadoGeneral,estadoMatricula:estadoMatricula,divisionOf:divisionOf,valueOf:valueOf,source:function(){return "BL2StatsRepo";}};
})(window);
