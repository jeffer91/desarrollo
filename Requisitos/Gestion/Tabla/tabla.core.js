/* =========================================================
Nombre completo: tabla.core.js
Ruta o ubicación: /Requisitos/Gestion/Tabla/tabla.core.js
Función o funciones:
- Leer estudiantes desde Base Local/ExcelLocalRepo.
- Calcular estado general del estudiante.
- Aplicar filtros de período, división, matrícula, carrera, estado y búsqueda.
- Mostrar ACTIVO por defecto.
Con qué se conecta:
- excel-local.repo.js
- bl-periodos-canon.service.js
- bl-divisiones.service.js
- tabla.app.js
========================================================= */
(function(window){
  "use strict";
  var REQS=["academico","documentacion","financiero","titulacion","practicasvinculacion","vinculacion","seguimientograduados","ingles","actualizaciondatos","aprobaciontitulacion","aprobacioncomplexivoproyecto"];
  function text(v){return String(v==null?"":v).trim();}
  function norm(v){return text(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
  function estadoMatricula(v){return norm(v||"ACTIVO")==="retirado"?"RETIRADO":"ACTIVO";}
  function estadoCelda(v){var k=norm(v);if(!k)return "pendiente";if(["si","sí","s","ok","cumple","aprobado","aprobada","1","true","x","validado","completo"].indexOf(k)>=0)return "cumple";if(["no","n","no cumple","reprobado","reprobada","0","false","falta","incompleto"].indexOf(k)>=0)return "no_cumple";return "pendiente";}
  function estadoEstudiante(row){var no=0,pend=0,ok=0;REQS.forEach(function(req){var e=estadoCelda(row[req]);if(e==="cumple")ok++;else if(e==="no_cumple")no++;else pend++;});if(no>0)return {id:"no_cumple",label:"No cumple",ok:ok,no:no,pend:pend};if(pend>0)return {id:"pendiente",label:"Con pendientes",ok:ok,no:no,pend:pend};return {id:"cumple",label:"Cumple todo",ok:ok,no:no,pend:pend};}
  function repo(){if(!window.ExcelLocalRepo)throw new Error("ExcelLocalRepo no disponible. Primero carga Base Local.");return window.ExcelLocalRepo;}
  function snapshot(){return repo().getSnapshot();}
  function periods(){return repo().listPeriods?repo().listPeriods():snapshot().periods||[];}
  function students(matricula){if(repo().listStudentsByStatus&&matricula!==undefined)return repo().listStudentsByStatus(matricula||"");return repo().listAllStudents?repo().listAllStudents():snapshot().students||[];}
  function samePeriod(a,b){if(!text(b))return true;if(window.BLPeriodosCanon&&typeof window.BLPeriodosCanon.samePeriod==="function")return window.BLPeriodosCanon.samePeriod(a,b);return text(a)===text(b);}
  function divisionOf(row){if(window.BLDivisionesService&&typeof window.BLDivisionesService.studentDivision==="function")return window.BLDivisionesService.studentDivision(row);var list=Array.isArray(row&&row.divisiones)?row.divisiones:[];return list[0]||row.division||"Sin división";}
  function hasDivision(row,division){if(!text(division))return true;if(window.BLDivisionesService&&typeof window.BLDivisionesService.hasDivision==="function")return window.BLDivisionesService.hasDivision(row,division);return norm(divisionOf(row))===norm(division);}
  function decorate(row){var r=Object.assign({},row||{});r._estadoGeneral=estadoEstudiante(r);r._estadoMatricula=estadoMatricula(r.estadoMatricula);r._cedula=text(r.cedula||r.numeroIdentificacion||r.numeroidentificacion);r._nombres=text(r.nombres||r.Nombres||r.nombre||r.estudiante);r._carrera=text(r.nombrecarrera||r.nombreCarrera||r.NombreCarrera||r.carrera);r._division=divisionOf(r);r._celular=text(r.celular||r.Celular||r.telefono||r.whatsapp);r._correo=text(r.correopersonal||r.CorreoPersonal||r.correoPersonal||r.correoinstitucional||r.CorreoInstitucional||r.correoInstitucional);return r;}
  function careers(list){var map={};(list||students("ACTIVO").map(decorate)).forEach(function(s){var c=text(s._carrera||s.nombrecarrera||s.nombreCarrera||s.carrera)||"SIN CARRERA";map[c]=true;});return Object.keys(map).sort(function(a,b){return a.localeCompare(b,"es");});}
  function divisions(list){var rows=(list||students("ACTIVO").map(decorate));if(window.BLDivisionesService&&typeof window.BLDivisionesService.listDivisionsWithEmpty==="function")return window.BLDivisionesService.listDivisionsWithEmpty(rows,"");var map={};rows.forEach(function(s){map[divisionOf(s)]=true;});return Object.keys(map).sort(function(a,b){return a.localeCompare(b,"es");});}
  function filter(opts){opts=opts||{};var q=norm(opts.search);var periodId=text(opts.periodId);var division=text(opts.division);var career=text(opts.career);var status=text(opts.status);var matricula=opts.matricula==null?"ACTIVO":text(opts.matricula);var list=students(matricula).map(decorate).filter(function(s){if(matricula&&s._estadoMatricula!==matricula)return false;if(periodId&&!samePeriod(s.periodoId,periodId))return false;if(division&&!hasDivision(s,division))return false;if(career&&s._carrera!==career)return false;if(status&&s._estadoGeneral.id!==status)return false;if(q){var hay=norm([s._cedula,s._nombres,s._carrera,s._division,s._correo,s._celular,s.periodoLabel,s._estadoMatricula].join(" "));if(hay.indexOf(q)<0)return false;}return true;});return list;}
  function summary(list){var careerMap={};var c={total:list.length,cumple:0,pendiente:0,no_cumple:0,carreras:0};list.forEach(function(s){c[s._estadoGeneral.id]=(c[s._estadoGeneral.id]||0)+1;careerMap[text(s._carrera)||"SIN CARRERA"]=true;});c.carreras=Object.keys(careerMap).length;return c;}
  function whatsappUrl(row){var phone=text(row._celular).replace(/[^0-9]/g,"");if(!phone)return "";if(phone.length===10&&phone.charAt(0)==="0")phone="593"+phone.slice(1);var msg="Estimado/a "+(row._nombres||"estudiante")+", le escribimos sobre sus requisitos de titulación.";return "https://wa.me/"+phone+"?text="+encodeURIComponent(msg);}
  window.TablaCore={REQS:REQS,estadoEstudiante:estadoEstudiante,estadoMatricula:estadoMatricula,periods:periods,students:students,careers:careers,divisions:divisions,filter:filter,summary:summary,whatsappUrl:whatsappUrl,decorate:decorate,divisionOf:divisionOf};
})(window);
