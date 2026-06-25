/* =========================================================
Nombre completo: repo.core.js
Ruta o ubicación: /Requisitos/Reportes/repo.core.js
Función o funciones:
- Leer datos desde BaseLocal/ExcelLocalRepo.
- Generar reportes generales, por carrera, por requisito y pendientes críticos.
Con qué se conecta:
- excel-local.repo.js
- repo.app.js
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
  function estadoGeneral(row){var ok=0,no=0,pend=0;REQS.forEach(function(req){var e=estadoCelda(row[req.key]);if(e==="cumple")ok++;else if(e==="no_cumple")no++;else pend++;});if(no>0)return {id:"no_cumple",label:"No cumple",ok:ok,no:no,pend:pend};if(pend>0)return {id:"pendiente",label:"Con pendientes",ok:ok,no:no,pend:pend};return {id:"cumple",label:"Cumple todo",ok:ok,no:no,pend:pend};}
  function decorate(row){var r=Object.assign({},row||{});r._cedula=text(r.cedula||r.numeroIdentificacion||r.numeroidentificacion);r._nombres=text(r.nombres||r.nombre||r.estudiante);r._carrera=text(r.nombrecarrera||r.nombreCarrera||r.carrera)||"SIN CARRERA";r._periodo=text(r.periodoLabel||r.periodoId)||"SIN PERÍODO";r._periodoId=text(r.periodoId);r._estado=estadoGeneral(r);return r;}
  function filtered(opts){opts=opts||{};var periodId=text(opts.periodId);var career=text(opts.career);return rawStudents().map(decorate).filter(function(s){if(periodId&&s._periodoId!==periodId)return false;if(career&&s._carrera!==career)return false;return true;});}
  function careers(list){var map={};(list||rawStudents().map(decorate)).forEach(function(s){map[s._carrera]=true;});return Object.keys(map).sort(function(a,b){return a.localeCompare(b,"es");});}
  function byCareer(list){var map={};list.forEach(function(s){var k=s._carrera;if(!map[k])map[k]={key:k,total:0,cumple:0,pendiente:0,no_cumple:0,avance:0};map[k].total++;map[k][s._estado.id]++;});Object.keys(map).forEach(function(k){map[k].avance=pct(map[k].cumple,map[k].total);});return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return b.no_cumple-a.no_cumple||b.pendiente-a.pendiente||a.key.localeCompare(b.key,"es");});}
  function byRequirement(list){return REQS.map(function(req){var r={key:req.key,label:req.label,total:list.length,cumple:0,pendiente:0,no_cumple:0,avance:0,atencion:0};list.forEach(function(row){r[estadoCelda(row[req.key])]++;});r.avance=pct(r.cumple,r.total);r.atencion=r.no_cumple*3+r.pendiente;return r;}).sort(function(a,b){return b.atencion-a.atencion;});}
  function pendingStudents(list){return list.filter(function(s){return s._estado.id!=="cumple";}).sort(function(a,b){return (b._estado.no*3+b._estado.pend)-(a._estado.no*3+a._estado.pend)||a._nombres.localeCompare(b._nombres,"es");});}
  function build(opts){opts=opts||{};var list=filtered(opts);var kpis={total:list.length,cumple:0,pendiente:0,no_cumple:0,avance:0};list.forEach(function(s){kpis[s._estado.id]++;});kpis.avance=pct(kpis.cumple,kpis.total);var data={tipo:text(opts.tipo)||"general",generatedAt:new Date().toISOString(),kpis:kpis,carreras:byCareer(list),requisitos:byRequirement(list),pendientes:pendingStudents(list),periodList:periods(),careerList:careers(rawStudents().map(decorate)),rows:list,filters:opts};data.text=makeText(data);data.html=makeHtml(data);return data;}
  function makeText(data){var k=data.kpis;var lines=["REPORTE DE REQUISITOS","Fecha: "+new Date(data.generatedAt).toLocaleString(),"Tipo: "+data.tipo,"","RESUMEN GENERAL","Total estudiantes: "+k.total,"Cumplen todo: "+k.cumple,"Con pendientes: "+k.pendiente,"No cumplen: "+k.no_cumple,"Avance general: "+k.avance+"%",""];if(data.carreras[0])lines.push("Carrera con mayor atención: "+data.carreras[0].key+" (No cumple: "+data.carreras[0].no_cumple+", pendientes: "+data.carreras[0].pendiente+")");if(data.requisitos[0])lines.push("Requisito crítico: "+data.requisitos[0].label+" (No cumple: "+data.requisitos[0].no_cumple+", pendientes: "+data.requisitos[0].pendiente+")");lines.push("","RECOMENDACIÓN","Priorizar estudiantes no cumplen y luego los que tienen pendientes acumulados.");return lines.join("\n");}
  function makeHtml(data){return "<h1>Reporte de Requisitos</h1><pre>"+makeText(data).replace(/&/g,"&amp;").replace(/</g,"&lt;")+"</pre>";}
  window.RepoCore={REQS:REQS,periods:periods,careers:careers,build:build,estadoCelda:estadoCelda,estadoGeneral:estadoGeneral};
})(window);
