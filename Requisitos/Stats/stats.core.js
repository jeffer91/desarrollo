/* =========================================================
Nombre completo: stats.core.js
Ruta o ubicación: /Requisitos/Stats/stats.core.js
Función o funciones:
- Leer estudiantes desde Base Local/ExcelLocalRepo.
- Calcular KPIs, matrícula, estados, carreras, períodos y requisitos.
- Mostrar ACTIVO por defecto.
Con qué se conecta:
- excel-local.repo.js
- stats.app.js
========================================================= */
(function(window){
  "use strict";
  var REQS=[
    {key:"academico",label:"Académico"},{key:"documentacion",label:"Documentación"},{key:"financiero",label:"Financiero"},{key:"titulacion",label:"Titulación"},{key:"practicasvinculacion",label:"Prácticas/Vinculación"},{key:"vinculacion",label:"Vinculación"},{key:"seguimientograduados",label:"Seguimiento graduados"},{key:"ingles",label:"Inglés"},{key:"actualizaciondatos",label:"Actualización datos"},{key:"aprobaciontitulacion",label:"Aprobación titulación"},{key:"aprobacioncomplexivoproyecto",label:"Aprobación complexivo/proyecto"}
  ];
  function text(v){return String(v==null?"":v).trim();}
  function norm(v){return text(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
  function pct(n,d){return d?Math.round((n*10000)/d)/100:0;}
  function estadoMatricula(v){return norm(v||"ACTIVO")==="retirado"?"RETIRADO":"ACTIVO";}
  function estadoCelda(v){var k=norm(v);if(!k)return "pendiente";if(["si","s","ok","cumple","aprobado","aprobada","1","true","x","validado","completo"].indexOf(k)>=0)return "cumple";if(["no","n","no cumple","reprobado","reprobada","0","false","falta","incompleto"].indexOf(k)>=0)return "no_cumple";return "pendiente";}
  function estadoGeneral(row){var ok=0,no=0,pend=0;REQS.forEach(function(req){var e=estadoCelda(row[req.key]);if(e==="cumple")ok++;else if(e==="no_cumple")no++;else pend++;});if(no>0)return {id:"no_cumple",label:"No cumple",ok:ok,no:no,pend:pend};if(pend>0)return {id:"pendiente",label:"Con pendientes",ok:ok,no:no,pend:pend};return {id:"cumple",label:"Cumple todo",ok:ok,no:no,pend:pend};}
  function repo(){if(!window.ExcelLocalRepo)throw new Error("ExcelLocalRepo no disponible. Primero carga un Excel en Carga.");return window.ExcelLocalRepo;}
  function periods(){return repo().listPeriods?repo().listPeriods():repo().getSnapshot().periods||[];}
  function rawStudents(matricula){if(repo().listStudentsByStatus&&matricula!==undefined)return repo().listStudentsByStatus(matricula||"");return repo().listAllStudents?repo().listAllStudents():repo().getSnapshot().students||[];}
  function decorate(row){var r=Object.assign({},row||{});r._estado=estadoGeneral(r);r._estadoMatricula=estadoMatricula(r.estadoMatricula);r._carrera=text(r.nombrecarrera||r.nombreCarrera||r.NombreCarrera||r.carrera)||"SIN CARRERA";r._periodo=text(r.periodoLabel||r.periodoId)||"SIN PERÍODO";r._periodoId=text(r.periodoId);return r;}
  function filtered(opts){opts=opts||{};var periodId=text(opts.periodId);var career=text(opts.career);var status=text(opts.status);var matricula=opts.matricula==null?"ACTIVO":text(opts.matricula);return rawStudents(matricula).map(decorate).filter(function(s){if(matricula&&s._estadoMatricula!==matricula)return false;if(periodId&&s._periodoId!==periodId)return false;if(career&&s._carrera!==career)return false;if(status&&s._estado.id!==status)return false;return true;});}
  function careers(list){var map={};(list||rawStudents("ACTIVO").map(decorate)).forEach(function(s){map[s._carrera]=true;});return Object.keys(map).sort(function(a,b){return a.localeCompare(b,"es");});}
  function byKey(list,getKey){var out={};list.forEach(function(row){var k=getKey(row)||"Sin dato";if(!out[k])out[k]={key:k,total:0,cumple:0,pendiente:0,no_cumple:0,avance:0};out[k].total++;out[k][row._estado.id]++;});Object.keys(out).forEach(function(k){out[k].avance=pct(out[k].cumple,out[k].total);});return Object.keys(out).map(function(k){return out[k];}).sort(function(a,b){return b.total-a.total||a.key.localeCompare(b.key,"es");});}
  function requisitos(list){return REQS.map(function(req){var item={key:req.key,label:req.label,total:list.length,cumple:0,pendiente:0,no_cumple:0,avance:0};list.forEach(function(row){item[estadoCelda(row[req.key])]++;});item.avance=pct(item.cumple,item.total);return item;});}
  function resumen(opts){opts=opts||{};if(opts.matricula==null)opts.matricula="ACTIVO";var list=filtered(opts);var total=list.length;var estados={cumple:0,pendiente:0,no_cumple:0};var matriculas={ACTIVO:0,RETIRADO:0};var reqs=requisitos(list);list.forEach(function(s){estados[s._estado.id]++;matriculas[s._estadoMatricula]=(matriculas[s._estadoMatricula]||0)+1;});var totalReq=total*REQS.length;var okReq=reqs.reduce(function(a,r){return a+r.cumple;},0);return {total:total,estados:estados,matriculas:matriculas,avanceGeneral:pct(okReq,totalReq),requisitos:reqs,carreras:byKey(list,function(s){return s._carrera;}),periodos:byKey(list,function(s){return s._periodo;}),periodList:periods(),careerList:careers(filtered({periodId:opts.periodId||"",matricula:opts.matricula||"",status:""})),rows:list,diagnostics:{generatedAt:new Date().toISOString(),totalStudents:total,totalRequirements:totalReq,fulfilledRequirements:okReq,filters:opts||{}}};}
  window.StatsCore={REQS:REQS,periods:periods,careers:careers,filtered:filtered,resumen:resumen,estadoCelda:estadoCelda,estadoGeneral:estadoGeneral,estadoMatricula:estadoMatricula};
})(window);
