/* =========================================================
Nombre completo: ficha.core.js
Ruta o ubicación: /Requisitos/Ficha/ficha.core.js
Función o funciones:
- Leer estudiantes desde Base Local/ExcelLocalRepo.
- Normalizar datos de la ficha individual.
- Calcular estado general, matrícula y requisitos.
- Filtrar por período, división y matrícula.
- Mostrar ACTIVO por defecto.
- Usar nombres visibles normalizados sin modificar la base de datos.
- Leer requisitos con alias inteligentes de Firestore/Base Local.
Con qué se conecta:
- excel-local.repo.js
- bl-campos.js
- bl-periodos-canon.service.js
- bl-divisiones.service.js
- ficha.app.js
========================================================= */
(function(window){
  "use strict";
  function label(key,fallback){try{if(window.BLCampos&&typeof window.BLCampos.requirementLabel==="function")return window.BLCampos.requirementLabel(key,fallback);}catch(error){}return fallback||key;}
  var REQS=[
    {key:"academico",field:"academico",label:label("academico","Académico")},
    {key:"documentacion",field:"documentacion",label:label("documentacion","Documentación")},
    {key:"financiero",field:"financiero",label:label("financiero","Financiero")},
    {key:"titulacion",field:"titulacion",label:label("titulacion","Titulación")},
    {key:"practicasvinculacion",field:"practicasVinculacion",label:label("practicasvinculacion","Prácticas")},
    {key:"vinculacion",field:"vinculacion",label:label("vinculacion","Vinculación")},
    {key:"seguimientograduados",field:"seguimientoGraduados",label:label("seguimientograduados","Seguimiento graduados")},
    {key:"ingles",field:"ingles",label:label("ingles","Inglés")},
    {key:"actualizaciondatos",field:"actualizacionDatos",label:label("actualizaciondatos","Actualización de datos")},
    {key:"aprobaciontitulacion",field:"aprobacionTitulacion",label:label("aprobaciontitulacion","Aprobación titulación")},
    {key:"aprobacioncomplexivoproyecto",field:"aprobacionComplexivoProyecto",label:label("aprobacioncomplexivoproyecto","Aprobación complexivo/proyecto")}
  ];
  function text(v){return String(v==null?"":v).trim();}
  function norm(v){return text(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
  function pick(row,aliases,fallback){var keys=Object.keys(row||{});for(var i=0;i<aliases.length;i+=1){for(var j=0;j<keys.length;j+=1){if(norm(keys[j])===norm(aliases[i])){var value=row[keys[j]];if(value!=null&&text(value)!=="")return value;}}}return fallback;}
  function fieldValue(row,field,fallback){if(!row)return fallback;try{if(window.BLCampos&&typeof window.BLCampos.getValue==="function")return window.BLCampos.getValue(row,field,fallback);}catch(error){}return pick(row,[field],fallback);}
  function reqValue(row,req){return fieldValue(row,req.field||req.key,pick(row,[req.key],""));}
  function estadoMatricula(v){return norm(v||"ACTIVO")==="retirado"?"RETIRADO":"ACTIVO";}
  function estadoCelda(v){var k=norm(v);if(!k)return "no_cumple";if(["cumple","si","s","ok","aprobado","aprobada","1","true","x","validado","completo"].indexOf(k)>=0)return "cumple";if(k.indexOf("no cumple")>=0||["no","n","reprobado","reprobada","0","false","falta","incompleto","pendiente","sin dato"].indexOf(k)>=0)return "no_cumple";return "no_cumple";}
  function repo(){if(!window.ExcelLocalRepo)throw new Error("ExcelLocalRepo no disponible. Primero carga un Excel en Carga.");return window.ExcelLocalRepo;}
  function periods(){return repo().listPeriods?repo().listPeriods():repo().getSnapshot().periods||[];}
  function rawStudents(matricula){if(repo().listStudentsByStatus&&matricula!==undefined)return repo().listStudentsByStatus(matricula||"");return repo().listAllStudents?repo().listAllStudents():repo().getSnapshot().students||[];}
  function samePeriod(a,b){if(!text(b))return true;if(window.BLPeriodosCanon&&typeof window.BLPeriodosCanon.samePeriod==="function")return window.BLPeriodosCanon.samePeriod(a,b);return text(a)===text(b);}
  function divisionOf(row){if(window.BLDivisionesService&&typeof window.BLDivisionesService.studentDivision==="function")return window.BLDivisionesService.studentDivision(row);var list=Array.isArray(row&&row.divisiones)?row.divisiones:[];return list[0]||row.division||"Sin división";}
  function hasDivision(row,division){if(!text(division))return true;if(window.BLDivisionesService&&typeof window.BLDivisionesService.hasDivision==="function")return window.BLDivisionesService.hasDivision(row,division);return norm(divisionOf(row))===norm(division);}
  function normalizeStudent(row){var r=Object.assign({},row||{});r._id=text(fieldValue(r,"cedula","")||fieldValue(r,"numeroIdentificacion","")||r._docId||r.docId);r._cedula=text(fieldValue(r,"cedula",fieldValue(r,"numeroIdentificacion","")));r._nombres=text(fieldValue(r,"nombres",r.nombre||r.estudiante||""));r._carrera=text(fieldValue(r,"nombreCarrera",r.carrera||""));r._division=divisionOf(r);r._sede=text(fieldValue(r,"sede",r.Sede||""));r._horario=text(pick(r,["horariocomplexivo","HorarioComplexivo","horarioComplexivo","horario"],""));r._celular=text(fieldValue(r,"celular",r.telefono||r.whatsapp||""));r._correo=text(fieldValue(r,"correoPersonal",fieldValue(r,"correoInstitucional","")));r._periodo=text(fieldValue(r,"periodoLabel",fieldValue(r,"periodoId","")));r._estadoMatricula=estadoMatricula(fieldValue(r,"estadoMatricula",r.estadoMatricula));r._estado=estadoGeneral(r);return r;}
  function estadoGeneral(row){var ok=0,no=0,pend=0;REQS.forEach(function(req){var e=estadoCelda(reqValue(row,req));if(e==="cumple")ok++;else if(e==="no_cumple")no++;else pend++;});if(no>0)return {id:"no_cumple",label:"No cumple",ok:ok,no:no,pend:pend};if(pend>0)return {id:"pendiente",label:"Con pendientes",ok:ok,no:no,pend:pend};return {id:"cumple",label:"Cumple todo",ok:ok,no:no,pend:pend};}
  function students(matricula){return rawStudents(matricula==null?"ACTIVO":matricula).map(normalizeStudent);}
  function divisions(list){var rows=list||students("ACTIVO");if(window.BLDivisionesService&&typeof window.BLDivisionesService.listDivisionsWithEmpty==="function")return window.BLDivisionesService.listDivisionsWithEmpty(rows,"");var map={};rows.forEach(function(s){map[divisionOf(s)]=true;});return Object.keys(map).sort(function(a,b){return a.localeCompare(b,"es");});}
  function filter(opts){opts=opts||{};var q=norm(opts.search);var periodId=text(opts.periodId);var division=text(opts.division);var matricula=opts.matricula==null?"ACTIVO":text(opts.matricula);return students(matricula).filter(function(s){if(matricula&&s._estadoMatricula!==matricula)return false;if(periodId&&!samePeriod(s.periodoId||s.ultimoPeriodoId,periodId))return false;if(division&&!hasDivision(s,division))return false;if(q){var hay=norm([s._cedula,s._nombres,s._carrera,s._division,s._correo,s._celular,s._periodo,s._estadoMatricula].join(" "));if(hay.indexOf(q)<0)return false;}return true;});}
  function getById(id,opts){var wanted=text(id);opts=opts||{};return filter({periodId:opts.periodId||"",division:opts.division||"",matricula:opts.matricula==null?"":opts.matricula,search:""}).find(function(s){return text(s._id)===wanted;})||null;}
  function requisitos(row){return REQS.map(function(req){var raw=text(reqValue(row,req));var estado=estadoCelda(raw);return {key:req.key,field:req.field,label:req.label,value:raw||"NO CUMPLE",estado:estado};});}
  function whatsappUrl(row){var phone=text(row&&row._celular).replace(/[^0-9]/g,"");if(!phone)return "";if(phone.length===10&&phone.charAt(0)==="0")phone="593"+phone.slice(1);var msg="Estimado/a "+(row._nombres||"estudiante")+", le escribimos sobre sus requisitos de titulación.";return "https://wa.me/"+phone+"?text="+encodeURIComponent(msg);}
  function toText(row){if(!row)return "";return ["FICHA DEL ESTUDIANTE","Nombre: "+row._nombres,"Cédula: "+row._cedula,"Carrera: "+row._carrera,"División: "+(row._division||"Sin división"),"Período: "+row._periodo,"Matrícula: "+row._estadoMatricula,"Estado: "+(row._estado&&row._estado.label),"Correo: "+row._correo,"Celular: "+row._celular].join("\n");}
  window.FichaCore={periods:periods,students:students,divisions:divisions,filter:filter,getById:getById,requisitos:requisitos,whatsappUrl:whatsappUrl,toText:toText,estadoCelda:estadoCelda,estadoMatricula:estadoMatricula,divisionOf:divisionOf,fieldValue:fieldValue,reqValue:reqValue};
})(window);