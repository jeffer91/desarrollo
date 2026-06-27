/* =========================================================
Nombre completo: bl2-stats.repo.js
Ruta o ubicación: /Requisitos/BaseLocal2/repositories/bl2-stats.repo.js
Función o funciones:
- Calcular estadísticas reutilizables para Stats, Coordi y Reportes desde BL2.
- Usar caché de resumen para no recalcular vistas repetidas.
- Mantener formato compatible con stats.core.js.
Con qué se conecta:
- bl2-estudiantes.repo.js
- bl2-cache-resumen.service.js
- Stats/stats.core.js
========================================================= */
(function(window){
  "use strict";

  function label(key,fallback){try{if(window.BLCampos&&typeof window.BLCampos.requirementLabel==="function")return window.BLCampos.requirementLabel(key,fallback);}catch(error){}return fallback||key;}
  var REQS=[
    {key:"academico",label:label("academico","Académico")},{key:"documentacion",label:label("documentacion","Documentación")},{key:"financiero",label:label("financiero","Financiero")},{key:"titulacion",label:label("titulacion","Titulación")},{key:"practicasvinculacion",label:label("practicasvinculacion","Prácticas")},{key:"vinculacion",label:label("vinculacion","Vinculación")},{key:"seguimientograduados",label:label("seguimientograduados","Seguimiento graduados")},{key:"ingles",label:label("ingles","Inglés")},{key:"actualizaciondatos",label:label("actualizaciondatos","Actualización de datos")},{key:"aprobaciontitulacion",label:label("aprobaciontitulacion","Aprobación titulación")},{key:"aprobacioncomplexivoproyecto",label:label("aprobacioncomplexivoproyecto","Aprobación complexivo/proyecto")}
  ];

  function studentsRepo(){return window.BL2EstudiantesRepo || null;}
  function cache(){return window.BL2CacheResumen || null;}
  function text(v){return String(v==null?"":v).trim();}
  function norm(v){return text(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
  function pct(n,d){return d?Math.round((n*10000)/d)/100:0;}
  function estadoMatricula(v){return norm(v||"ACTIVO")==="retirado"?"RETIRADO":"ACTIVO";}
  function estadoCelda(v){var k=norm(v);if(!k)return "pendiente";if(["si","sí","s","ok","cumple","aprobado","aprobada","1","true","x","validado","completo"].indexOf(k)>=0)return "cumple";if(["no","n","no cumple","reprobado","reprobada","0","false","falta","incompleto"].indexOf(k)>=0)return "no_cumple";return "pendiente";}
  function estadoGeneral(row){var ok=0,no=0,pend=0;REQS.forEach(function(req){var e=estadoCelda(row[req.key]);if(e==="cumple")ok++;else if(e==="no_cumple")no++;else pend++;});if(no>0)return {id:"no_cumple",label:"No cumple",ok:ok,no:no,pend:pend};if(pend>0)return {id:"pendiente",label:"Con pendientes",ok:ok,no:no,pend:pend};return {id:"cumple",label:"Cumple todo",ok:ok,no:no,pend:pend};}
  function samePeriod(a,b){if(!text(b))return true;if(window.BLPeriodosCanon&&typeof window.BLPeriodosCanon.samePeriod==="function")return window.BLPeriodosCanon.samePeriod(a,b);return text(a)===text(b)||norm(a)===norm(b);}
  function divisionOf(row){if(row&&row._bl2Division)return row._bl2Division;var list=Array.isArray(row&&row.divisiones)?row.divisiones:[];return list[0]||row.division||"Sin división";}
  function decorate(row){var r=Object.assign({},row||{});r._estado=estadoGeneral(r);r._estadoMatricula=estadoMatricula(r._bl2EstadoMatricula||r.estadoMatricula);r._cedula=text(r._bl2Id||r.cedula||r.numeroIdentificacion||r.numeroidentificacion);r._nombres=text(r._bl2Nombre||r.nombres||r.Nombres||r.nombre||r.estudiante);r._carrera=text(r._bl2Carrera||r.nombrecarrera||r.nombreCarrera||r.NombreCarrera||r.carrera)||"SIN CARRERA";r._division=divisionOf(r);r._periodo=text(r._bl2Periodo||r.periodoLabel||r.periodoId)||"SIN PERÍODO";r._periodoId=text(r.periodoId||r._bl2Periodo);r._correo=text(r.correopersonal||r.CorreoPersonal||r.correoPersonal||r.correoinstitucional||r.CorreoInstitucional||r.correoInstitucional);r._celular=text(r.celular||r.Celular||r.telefono||r.whatsapp);return r;}

  function rows(opts){
    opts=opts||{};
    if(!studentsRepo()||typeof studentsRepo().buscar!=="function"){return [];} 
    var result=studentsRepo().buscar({periodId:opts.periodId||"",division:opts.division||"",matricula:opts.matricula==null?"ACTIVO":opts.matricula,search:"",limit:0});
    var list=(result.rows||[]).map(decorate);
    var career=text(opts.career);var status=text(opts.status);
    return list.filter(function(s){if(opts.periodId&&!samePeriod(s._periodoId||s._periodo,opts.periodId))return false;if(career&&s._carrera!==career)return false;if(status&&s._estado.id!==status)return false;return true;});
  }

  function byKey(list,getKey){var out={};list.forEach(function(row){var k=getKey(row)||"Sin dato";if(!out[k])out[k]={key:k,total:0,cumple:0,pendiente:0,no_cumple:0,avance:0};out[k].total++;out[k][row._estado.id]++;});Object.keys(out).forEach(function(k){out[k].avance=pct(out[k].cumple,out[k].total);});return Object.keys(out).map(function(k){return out[k];}).sort(function(a,b){return b.total-a.total||a.key.localeCompare(b.key,"es");});}
  function requisitos(list){return REQS.map(function(req){var item={key:req.key,label:req.label,total:list.length,cumple:0,pendiente:0,no_cumple:0,avance:0,atencion:0};list.forEach(function(row){item[estadoCelda(row[req.key])]++;});item.avance=pct(item.cumple,item.total);item.atencion=item.no_cumple*3+item.pendiente;return item;});}
  function listOptions(base){var map={};base.forEach(function(x){map[x]=true;});return Object.keys(map).sort(function(a,b){return a.localeCompare(b,"es");});}

  function resumen(opts){
    opts=Object.assign({matricula:"ACTIVO"},opts||{});
    var scope="stats";
    if(cache()){return cache().getOrSet(scope,opts,function(){return buildResumen(opts);},{ttl:3000});}
    return buildResumen(opts);
  }

  function buildResumen(opts){
    var list=rows(opts);var total=list.length;var estados={cumple:0,pendiente:0,no_cumple:0};var matriculas={ACTIVO:0,RETIRADO:0};var reqs=requisitos(list);
    list.forEach(function(s){estados[s._estado.id]++;matriculas[s._estadoMatricula]=(matriculas[s._estadoMatricula]||0)+1;});
    var totalReq=total*REQS.length;var okReq=reqs.reduce(function(a,r){return a+r.cumple;},0);
    var baseForDivision=rows({periodId:opts.periodId||"",matricula:opts.matricula||"",division:"",career:"",status:""});
    var baseForCareer=rows({periodId:opts.periodId||"",matricula:opts.matricula||"",division:opts.division||"",career:"",status:""});
    var periods=studentsRepo()&&studentsRepo().listPeriods?studentsRepo().listPeriods():[];
    return {total:total,estados:estados,matriculas:matriculas,avanceGeneral:pct(okReq,totalReq),requisitos:reqs,carreras:byKey(list,function(s){return s._carrera;}),periodos:byKey(list,function(s){return s._periodo;}),divisiones:byKey(list,function(s){return s._division;}),periodList:periods,divisionList:listOptions(baseForDivision.map(function(s){return s._division||"Sin división";})),careerList:listOptions(baseForCareer.map(function(s){return s._carrera||"SIN CARRERA";})),rows:list,diagnostics:{generatedAt:new Date().toISOString(),source:"BL2StatsRepo",totalStudents:total,totalRequirements:totalReq,fulfilledRequirements:okReq,filters:opts||{}}};
  }

  window.BL2StatsRepo={version:"2.0.0-alpha.1",REQS:REQS,rows:rows,resumen:resumen,estadoCelda:estadoCelda,estadoGeneral:estadoGeneral,estadoMatricula:estadoMatricula,divisionOf:divisionOf,source:function(){return "BL2StatsRepo";}};
})(window);
