/* =========================================================
Nombre completo: ficha.core.js
Ruta o ubicación: /Requisitos/Ficha/ficha.core.js
Función o funciones:
- Leer estudiantes desde BaseLocal/ExcelLocalRepo.
- Normalizar datos de la ficha individual.
- Calcular estado general y requisitos.
Con qué se conecta:
- excel-local.repo.js
- ficha.app.js
========================================================= */
(function(window){
  "use strict";
  var REQS=[
    {key:"academico",label:"Académico"},{key:"documentacion",label:"Documentación"},{key:"financiero",label:"Financiero"},{key:"titulacion",label:"Titulación"},{key:"practicasvinculacion",label:"Prácticas/Vinculación"},{key:"vinculacion",label:"Vinculación"},{key:"seguimientograduados",label:"Seguimiento graduados"},{key:"ingles",label:"Inglés"},{key:"actualizaciondatos",label:"Actualización de datos"},{key:"aprobaciontitulacion",label:"Aprobación titulación"},{key:"aprobacioncomplexivoproyecto",label:"Aprobación complexivo/proyecto"}
  ];
  function text(v){return String(v==null?"":v).trim();}
  function norm(v){return text(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
  function estadoCelda(v){var k=norm(v);if(!k)return "pendiente";if(["si","s","ok","cumple","aprobado","aprobada","1","true","x","validado","completo"].indexOf(k)>=0)return "cumple";if(["no","n","no cumple","reprobado","reprobada","0","false","falta","incompleto"].indexOf(k)>=0)return "no_cumple";return "pendiente";}
  function repo(){if(!window.ExcelLocalRepo)throw new Error("ExcelLocalRepo no disponible. Primero carga un Excel en Requisito.");return window.ExcelLocalRepo;}
  function periods(){return repo().listPeriods?repo().listPeriods():repo().getSnapshot().periods||[];}
  function rawStudents(){return repo().listAllStudents?repo().listAllStudents():repo().getSnapshot().students||[];}
  function normalizeStudent(row){var r=Object.assign({},row||{});r._id=text(r._docId||r.docId||r.cedula||r.numeroIdentificacion||r.numeroidentificacion);r._cedula=text(r.cedula||r.numeroIdentificacion||r.numeroidentificacion);r._nombres=text(r.nombres||r.nombre||r.estudiante);r._carrera=text(r.nombrecarrera||r.nombreCarrera||r.carrera);r._sede=text(r.sede||r.Sede);r._horario=text(r.horariocomplexivo||r.horarioComplexivo||r.horario);r._celular=text(r.celular||r.telefono||r.whatsapp);r._correo=text(r.correopersonal||r.correoPersonal||r.correoinstitucional||r.correoInstitucional);r._periodo=text(r.periodoLabel||r.periodoId);r._estado=estadoGeneral(r);return r;}
  function estadoGeneral(row){var ok=0,no=0,pend=0;REQS.forEach(function(req){var e=estadoCelda(row[req.key]);if(e==="cumple")ok++;else if(e==="no_cumple")no++;else pend++;});if(no>0)return {id:"no_cumple",label:"No cumple",ok:ok,no:no,pend:pend};if(pend>0)return {id:"pendiente",label:"Con pendientes",ok:ok,no:no,pend:pend};return {id:"cumple",label:"Cumple todo",ok:ok,no:no,pend:pend};}
  function students(){return rawStudents().map(normalizeStudent);}
  function filter(opts){opts=opts||{};var q=norm(opts.search);var periodId=text(opts.periodId);return students().filter(function(s){if(periodId&&s.periodoId!==periodId)return false;if(q){var hay=norm([s._cedula,s._nombres,s._carrera,s._correo,s._celular,s._periodo].join(" "));if(hay.indexOf(q)<0)return false;}return true;});}
  function getById(id){var wanted=text(id);return students().find(function(s){return text(s._id)===wanted;})||null;}
  function requisitos(row){return REQS.map(function(req){var raw=text(row&&row[req.key]);var estado=estadoCelda(raw);return {key:req.key,label:req.label,value:raw||"Pendiente",estado:estado};});}
  function whatsappUrl(row){var phone=text(row&&row._celular).replace(/[^0-9]/g,"");if(!phone)return "";if(phone.length===10&&phone.charAt(0)==="0")phone="593"+phone.slice(1);var msg="Estimado/a "+(row._nombres||"estudiante")+", le escribimos sobre sus requisitos de titulación.";return "https://wa.me/"+phone+"?text="+encodeURIComponent(msg);}
  function toText(row){if(!row)return "";return ["FICHA DEL ESTUDIANTE","Nombre: "+row._nombres,"Cédula: "+row._cedula,"Carrera: "+row._carrera,"Período: "+row._periodo,"Estado: "+(row._estado&&row._estado.label),"Correo: "+row._correo,"Celular: "+row._celular].join("\n");}
  window.FichaCore={periods:periods,students:students,filter:filter,getById:getById,requisitos:requisitos,whatsappUrl:whatsappUrl,toText:toText,estadoCelda:estadoCelda};
})(window);
