/* =========================================================
Nombre completo: tabla.core.js
Ruta o ubicación: /Requisitos/Gestion/Tabla/tabla.core.js
Función o funciones:
- Leer estudiantes desde BaseLocal/ExcelLocalRepo.
- Calcular estado general del estudiante.
- Aplicar filtros de período, carrera, estado y búsqueda.
Con qué se conecta:
- excel-local.repo.js
- tabla.app.js
========================================================= */
(function(window){
  "use strict";
  var REQS=["academico","documentacion","financiero","titulacion","practicasvinculacion","vinculacion","seguimientograduados","ingles","actualizaciondatos","aprobaciontitulacion","aprobacioncomplexivoproyecto"];
  function text(v){return String(v==null?"":v).trim();}
  function norm(v){return text(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
  function estadoCelda(v){var k=norm(v);if(!k)return "pendiente";if(["si","sí","s","ok","cumple","aprobado","aprobada","1","true","x","validado","completo"].indexOf(k)>=0)return "cumple";if(["no","n","no cumple","reprobado","reprobada","0","false","falta","incompleto"].indexOf(k)>=0)return "no_cumple";return "pendiente";}
  function estadoEstudiante(row){var no=0,pend=0,ok=0;REQS.forEach(function(req){var e=estadoCelda(row[req]);if(e==="cumple")ok++;else if(e==="no_cumple")no++;else pend++;});if(no>0)return {id:"no_cumple",label:"No cumple",ok:ok,no:no,pend:pend};if(pend>0)return {id:"pendiente",label:"Con pendientes",ok:ok,no:no,pend:pend};return {id:"cumple",label:"Cumple todo",ok:ok,no:no,pend:pend};}
  function repo(){if(!window.ExcelLocalRepo)throw new Error("ExcelLocalRepo no disponible. Primero carga BaseLocal.");return window.ExcelLocalRepo;}
  function snapshot(){return repo().getSnapshot();}
  function periods(){return repo().listPeriods?repo().listPeriods():snapshot().periods||[];}
  function students(){return repo().listAllStudents?repo().listAllStudents():snapshot().students||[];}
  function careers(list){var map={};(list||students()).forEach(function(s){var c=text(s.nombrecarrera||s.nombreCarrera||s.carrera)||"SIN CARRERA";map[c]=true;});return Object.keys(map).sort(function(a,b){return a.localeCompare(b,"es");});}
  function decorate(row){var r=Object.assign({},row||{});r._estadoGeneral=estadoEstudiante(r);r._cedula=text(r.cedula||r.numeroIdentificacion||r.numeroidentificacion);r._nombres=text(r.nombres||r.nombre||r.estudiante);r._carrera=text(r.nombrecarrera||r.nombreCarrera||r.carrera);r._celular=text(r.celular||r.telefono||r.whatsapp);r._correo=text(r.correopersonal||r.correoPersonal||r.correoinstitucional||r.correoInstitucional);return r;}
  function filter(opts){opts=opts||{};var q=norm(opts.search);var periodId=text(opts.periodId);var career=text(opts.career);var status=text(opts.status);var list=students().map(decorate).filter(function(s){if(periodId&&s.periodoId!==periodId)return false;if(career&&s._carrera!==career)return false;if(status&&s._estadoGeneral.id!==status)return false;if(q){var hay=norm([s._cedula,s._nombres,s._carrera,s._correo,s._celular,s.periodoLabel].join(" "));if(hay.indexOf(q)<0)return false;}return true;});return list;}
  function summary(list){var c={total:list.length,cumple:0,pendiente:0,no_cumple:0,carreras:careers(list).length};list.forEach(function(s){c[s._estadoGeneral.id]=(c[s._estadoGeneral.id]||0)+1;});return c;}
  function whatsappUrl(row){var phone=text(row._celular).replace(/[^0-9]/g,"");if(!phone)return "";if(phone.length===10&&phone.charAt(0)==="0")phone="593"+phone.slice(1);var msg="Estimado/a "+(row._nombres||"estudiante")+", le escribimos sobre sus requisitos de titulación.";return "https://wa.me/"+phone+"?text="+encodeURIComponent(msg);}
  window.TablaCore={REQS:REQS,estadoEstudiante:estadoEstudiante,periods:periods,students:students,careers:careers,filter:filter,summary:summary,whatsappUrl:whatsappUrl,decorate:decorate};
})(window);
