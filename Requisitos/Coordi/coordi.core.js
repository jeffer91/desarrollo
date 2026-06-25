/* =========================================================
Nombre completo: coordi.core.js
Ruta o ubicación: /Requisitos/Coordi/coordi.core.js
Función o funciones:
- Leer estudiantes desde BaseLocal/ExcelLocalRepo.
- Calcular prioridades de coordinación.
- Generar resúmenes por carrera, requisito y estudiante.
Con qué se conecta:
- excel-local.repo.js
- coordi.app.js
========================================================= */
(function(window){
  "use strict";
  var REQS=[
    {key:"academico",label:"Académico"},{key:"documentacion",label:"Documentación"},{key:"financiero",label:"Financiero"},{key:"titulacion",label:"Titulación"},{key:"practicasvinculacion",label:"Prácticas/Vinculación"},{key:"vinculacion",label:"Vinculación"},{key:"seguimientograduados",label:"Seguimiento graduados"},{key:"ingles",label:"Inglés"},{key:"actualizaciondatos",label:"Actualización datos"},{key:"aprobaciontitulacion",label:"Aprobación titulación"},{key:"aprobacioncomplexivoproyecto",label:"Aprobación complexivo/proyecto"}
  ];
  function text(v){return String(v==null?"":v).trim();}
  function norm(v){return text(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
  function pct(n,d){return d?Math.round((n*10000)/d)/100:0;}
  function estadoCelda(v){var k=norm(v);if(!k)return "pendiente";if(["si","s","ok","cumple","aprobado","aprobada","1","true","x","validado","completo"].indexOf(k)>=0)return "cumple";if(["no","n","no cumple","reprobado","reprobada","0","false","falta","incompleto"].indexOf(k)>=0)return "no_cumple";return "pendiente";}
  function repo(){if(!window.ExcelLocalRepo)throw new Error("ExcelLocalRepo no disponible. Primero carga un Excel en Requisito.");return window.ExcelLocalRepo;}
  function periods(){return repo().listPeriods?repo().listPeriods():repo().getSnapshot().periods||[];}
  function rawStudents(){return repo().listAllStudents?repo().listAllStudents():repo().getSnapshot().students||[];}
  function priority(row){var no=0,pend=0,ok=0;REQS.forEach(function(req){var e=estadoCelda(row[req.key]);if(e==="cumple")ok++;else if(e==="no_cumple")no++;else pend++;});var score=no*3+pend;var level=score>=8||no>=2?"alta":score>=3?"media":"baja";return {level:level,label:level==="alta"?"Alta":level==="media"?"Media":"Baja",score:score,ok:ok,no:no,pend:pend,total:REQS.length};}
  function decorate(row){var r=Object.assign({},row||{});r._cedula=text(r.cedula||r.numeroIdentificacion||r.numeroidentificacion);r._nombres=text(r.nombres||r.nombre||r.estudiante);r._carrera=text(r.nombrecarrera||r.nombreCarrera||r.carrera)||"SIN CARRERA";r._periodo=text(r.periodoLabel||r.periodoId)||"SIN PERÍODO";r._periodoId=text(r.periodoId);r._correo=text(r.correopersonal||r.correoPersonal||r.correoinstitucional||r.correoInstitucional);r._celular=text(r.celular||r.telefono||r.whatsapp);r._priority=priority(r);return r;}
  function filtered(opts){opts=opts||{};var periodId=text(opts.periodId);var career=text(opts.career);var priorityLevel=text(opts.priority);return rawStudents().map(decorate).filter(function(s){if(periodId&&s._periodoId!==periodId)return false;if(career&&s._carrera!==career)return false;if(priorityLevel&&s._priority.level!==priorityLevel)return false;return true;});}
  function careers(list){var map={};(list||rawStudents().map(decorate)).forEach(function(s){map[s._carrera]=true;});return Object.keys(map).sort(function(a,b){return a.localeCompare(b,"es");});}
  function byCareer(list){var map={};list.forEach(function(s){var k=s._carrera;if(!map[k])map[k]={key:k,total:0,alta:0,media:0,baja:0,pendientes:0,noCumple:0,avance:0};map[k].total++;map[k][s._priority.level]++;map[k].pendientes+=s._priority.pend;map[k].noCumple+=s._priority.no;});Object.keys(map).forEach(function(k){var x=map[k];x.avance=pct(x.baja,x.total);});return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return b.alta-a.alta||b.pendientes-a.pendientes||a.key.localeCompare(b.key,"es");});}
  function byRequirement(list){return REQS.map(function(req){var item={key:req.key,label:req.label,total:list.length,cumple:0,pendiente:0,no_cumple:0,atencion:0};list.forEach(function(row){var e=estadoCelda(row[req.key]);item[e]++;});item.atencion=item.no_cumple*3+item.pendiente;return item;}).sort(function(a,b){return b.atencion-a.atencion;});}
  function summary(opts){var list=filtered(opts);var k={total:list.length,alta:0,media:0,baja:0,carreras:0};list.forEach(function(s){k[s._priority.level]++;});var careerSummary=byCareer(list);k.carreras=careerSummary.length;return {kpis:k,rows:list.sort(function(a,b){return b._priority.score-a._priority.score||a._nombres.localeCompare(b._nombres,"es");}),carreras:careerSummary,requisitos:byRequirement(list),periodList:periods(),careerList:careers(rawStudents().map(decorate)),diagnostics:{generatedAt:new Date().toISOString(),filters:opts,total:list.length}};}
  function message(data,type){data=data||summary({});type=type||"general";var k=data.kpis||{};var topCareer=(data.carreras||[])[0];var topReq=(data.requisitos||[])[0];if(type==="carrera"&&topCareer){return "Resumen de coordinación por carrera:\n\nLa carrera con mayor atención es "+topCareer.key+".\nTotal estudiantes: "+topCareer.total+".\nPrioridad alta: "+topCareer.alta+".\nPendientes acumulados: "+topCareer.pendientes+".\n\nSe recomienda revisar primero los casos de prioridad alta y confirmar los requisitos pendientes.";}if(type==="pendientes"&&topReq){return "Seguimiento de requisitos críticos:\n\nEl requisito con mayor atención es: "+topReq.label+".\nPendientes: "+topReq.pendiente+".\nNo cumplen: "+topReq.no_cumple+".\n\nFavor revisar esta información y coordinar la actualización correspondiente.";}return "Resumen general de coordinación:\n\nTotal estudiantes revisados: "+(k.total||0)+".\nPrioridad alta: "+(k.alta||0)+".\nPrioridad media: "+(k.media||0)+".\nPrioridad baja: "+(k.baja||0)+".\nCarreras involucradas: "+(k.carreras||0)+".\n\nSe recomienda iniciar el seguimiento por los estudiantes con prioridad alta.";}
  window.CoordiCore={REQS:REQS,periods:periods,careers:careers,filtered:filtered,summary:summary,message:message,priority:priority};
})(window);
