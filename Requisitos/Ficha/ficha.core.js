/* =========================================================
Nombre completo: ficha.core.js
Ruta o ubicación: /Requisitos/Ficha/ficha.core.js
Función o funciones:
- Leer estudiantes primero desde BL2 y usar ExcelLocalRepo solo como respaldo.
- Normalizar datos de la ficha individual.
- Calcular estado general, matrícula y requisitos.
- Filtrar por período, división y matrícula.
- Mostrar ACTIVO por defecto.
- Usar nombres visibles normalizados sin modificar la base de datos.
- Leer requisitos con alias inteligentes de Firestore/Base Local.
- Generar mensajes para WhatsApp y Telegram con saludo automático.
- Leer y evaluar notas Nart, Ndef y Nfin.
- Evitar cargar toda la base para búsquedas de Ficha.
Con qué se conecta:
- ../BaseLocal2/repositories/bl2-estudiantes.repo.js
- ../BaseLocal2/repositories/bl2-requisitos.repo.js
- excel-local.repo.js
- bl-campos.js
- bl-periodos-canon.service.js
- bl-divisiones.service.js
- ficha.app.js
========================================================= */
(function(window){
  "use strict";
  function label(key,fallback){try{if(window.BLCampos&&typeof window.BLCampos.requirementLabel==="function")return window.BLCampos.requirementLabel(key,fallback);}catch(error){}return fallback||key;}
  var MAIN_REQS=[
    {key:"academico",field:"academico",label:label("academico","Académico")},
    {key:"documentacion",field:"documentacion",label:label("documentacion","Documentación")},
    {key:"financiero",field:"financiero",label:label("financiero","Financiero")},
    {key:"titulacion",field:"titulacion",label:label("titulacion","Titulación")},
    {key:"practicasvinculacion",field:"practicasVinculacion",label:label("practicasvinculacion","Prácticas")},
    {key:"vinculacion",field:"vinculacion",label:label("vinculacion","Vinculación")},
    {key:"seguimientograduados",field:"seguimientoGraduados",label:label("seguimientograduados","Seguimiento graduados")},
    {key:"ingles",field:"ingles",label:label("ingles","Inglés")},
    {key:"actualizaciondatos",field:"actualizacionDatos",label:label("actualizaciondatos","Actualización de datos")}
  ];
  var SPECIAL_REQS=[
    {key:"aprobaciontitulacion",field:"aprobacionTitulacion",label:label("aprobaciontitulacion","Aprobación titulación"),icon:"🎓"},
    {key:"aprobacioncomplexivoproyecto",field:"aprobacionComplexivoProyecto",label:label("aprobacioncomplexivoproyecto","Aprobación complexivo/proyecto"),icon:"🧩"}
  ];
  var NOTE_FIELDS=[
    {key:"nart",label:"Nart",aliases:["Notart","notart","Nart","nart","NotaArt","notaArt"]},
    {key:"ndef",label:"Ndef",aliases:["Notdef","notdef","Ndef","ndef","NotaDef","notaDef"]},
    {key:"nfin",label:"Nfin",aliases:["Notafinal","notafinal","NotaFinal","notaFinal","Nfin","nfin","Nota final","nota final"]}
  ];
  var ALL_REQS=MAIN_REQS.concat(SPECIAL_REQS);
  var REQS=MAIN_REQS;
  var cache={periods:null,studentsByMatricula:{},signatureByMatricula:{}};
  function text(v){return String(v==null?"":v).trim();}
  function norm(v){return text(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
  function pick(row,aliases,fallback){var keys=Object.keys(row||{});for(var i=0;i<aliases.length;i+=1){for(var j=0;j<keys.length;j+=1){if(norm(keys[j])===norm(aliases[i])){var value=row[keys[j]];if(value!=null&&text(value)!=="")return value;}}}return fallback;}
  function fieldValue(row,field,fallback){if(!row)return fallback;try{if(window.BLCampos&&typeof window.BLCampos.getValue==="function")return window.BLCampos.getValue(row,field,fallback);}catch(error){}return pick(row,[field],fallback);}
  function reqValue(row,req){return fieldValue(row,req.field||req.key,pick(row,[req.key],""));}
  function numberValue(value){var raw=text(value).replace(",",".");if(!raw)return null;var n=Number(raw);return Number.isFinite(n)?n:null;}
  function estadoNota(value){var n=numberValue(value);return n!=null&&n>=7?"cumple":"no_cumple";}
  function estadoMatricula(v){return norm(v||"ACTIVO")==="retirado"?"RETIRADO":"ACTIVO";}
  function estadoCelda(v){var k=norm(v);if(!k)return "no_cumple";if(["cumple","si","s","ok","aprobado","aprobada","1","true","x","validado","completo"].indexOf(k)>=0)return "cumple";if(k.indexOf("no cumple")>=0||["no","n","reprobado","reprobada","0","false","falta","incompleto","pendiente","sin dato"].indexOf(k)>=0)return "no_cumple";return "no_cumple";}
  function bl2Students(){return window.BL2EstudiantesRepo||null;}
  function bl2Reqs(){return window.BL2RequisitosRepo||null;}
  function hasBL2(){return !!(bl2Students()&&typeof bl2Students().buscar==="function");}
  function repo(){if(!window.ExcelLocalRepo)throw new Error("ExcelLocalRepo no disponible. Primero carga un Excel en Carga.");return window.ExcelLocalRepo;}
  function periods(){if(cache.periods)return cache.periods.slice();var list=[];if(bl2Students()&&typeof bl2Students().listPeriods==="function"){list=bl2Students().listPeriods()||[];}else{list=repo().listPeriods?repo().listPeriods():repo().getSnapshot().periods||[];}cache.periods=list.slice();return list;}
  function rawStudents(matricula){if(hasBL2()){return bl2Students().listarPagina({matricula:matricula==null?"ACTIVO":matricula,limit:5000}).rows||[];}if(repo().listStudentsByStatus&&matricula!==undefined)return repo().listStudentsByStatus(matricula||"");return repo().listAllStudents?repo().listAllStudents():repo().getSnapshot().students||[];}
  function samePeriod(a,b){if(!text(b))return true;if(window.BLPeriodosCanon&&typeof window.BLPeriodosCanon.samePeriod==="function")return window.BLPeriodosCanon.samePeriod(a,b);return text(a)===text(b);}
  function divisionOf(row){if(row&&row._bl2Division)return row._bl2Division;if(window.BLDivisionesService&&typeof window.BLDivisionesService.studentDivision==="function")return window.BLDivisionesService.studentDivision(row);var list=Array.isArray(row&&row.divisiones)?row.divisiones:[];return list[0]||row.division||"Sin división";}
  function hasDivision(row,division){if(!text(division))return true;if(row&&row._bl2Division)return norm(row._bl2Division)===norm(division);if(window.BLDivisionesService&&typeof window.BLDivisionesService.hasDivision==="function")return window.BLDivisionesService.hasDivision(row,division);return norm(divisionOf(row))===norm(division);}
  function telegramInfo(row){var user=text(pick(row,["telegramUser","TelegramUser","telegramuser","usuarioTelegram","UsuarioTelegram","telegram","Telegram"],""));var chatId=text(pick(row,["telegramChatId","TelegramChatId","telegramchatid","chatIdTelegram","ChatIdTelegram","chatId","ChatId"],""));return {user:user,chatId:chatId};}
  function telegramUrl(row){var info=telegramInfo(row);if(info.user){return "https://t.me/"+encodeURIComponent(info.user.replace(/^@+/,""));}if(info.chatId){return "tg://user?id="+encodeURIComponent(info.chatId);}return "";}
  function saludo(){var h=new Date().getHours();if(h<12)return "Buen día";if(h<19)return "Buena tarde";return "Buena noche";}
  function normalizeStudent(row){var r=Object.assign({},row||{});r._id=text(r._bl2Id||fieldValue(r,"cedula","")||fieldValue(r,"numeroIdentificacion","")||r._docId||r.docId);r._cedula=text(r._bl2Id||fieldValue(r,"cedula",fieldValue(r,"numeroIdentificacion","")));r._nombres=text(r._bl2Nombre||fieldValue(r,"nombres",r.nombre||r.estudiante||""));r._carrera=text(r._bl2Carrera||fieldValue(r,"nombreCarrera",r.carrera||""));r._division=divisionOf(r);r._sede=text(fieldValue(r,"sede",r.Sede||""));r._horario=text(pick(r,["horariocomplexivo","HorarioComplexivo","horarioComplexivo","horario"],""));r._celular=text(fieldValue(r,"celular",r.telefono||r.whatsapp||""));r._correo=text(fieldValue(r,"correoPersonal",fieldValue(r,"correoInstitucional","")));r._periodo=text(r._bl2Periodo||fieldValue(r,"periodoLabel",fieldValue(r,"periodoId","")));r._estadoMatricula=estadoMatricula(r._bl2EstadoMatricula||fieldValue(r,"estadoMatricula",r.estadoMatricula));var tg=telegramInfo(r);r._telegramUser=tg.user;r._telegramChatId=tg.chatId;r._estado=estadoGeneral(r);return r;}
  function estadoGeneral(row){var ok=0,no=0,pend=0;ALL_REQS.forEach(function(req){var e=estadoCelda(reqValue(row,req));if(e==="cumple")ok++;else if(e==="no_cumple")no++;else pend++;});if(no>0)return {id:"no_cumple",label:"No cumple",ok:ok,no:no,pend:pend};if(pend>0)return {id:"pendiente",label:"Con pendientes",ok:ok,no:no,pend:pend};return {id:"cumple",label:"Cumple todo",ok:ok,no:no,pend:pend};}
  function rowsSignature(rows,matricula){var first=rows[0]||{};var last=rows[rows.length-1]||{};return [matricula||"",rows.length,first._docId||first.docId||first.cedula||first._bl2Id||"",first.updatedAt||"",last._docId||last.docId||last.cedula||last._bl2Id||"",last.updatedAt||""].join("|");}
  function students(matricula){var key=matricula==null?"ACTIVO":matricula;var rows=rawStudents(key);var signature=rowsSignature(rows,key);if(cache.studentsByMatricula[key]&&cache.signatureByMatricula[key]===signature){return cache.studentsByMatricula[key];}var normalized=rows.map(normalizeStudent);cache.studentsByMatricula[key]=normalized;cache.signatureByMatricula[key]=signature;return normalized;}
  function invalidate(){cache.periods=null;cache.studentsByMatricula={};cache.signatureByMatricula={};try{if(window.BL2&&typeof window.BL2.invalidate==="function")window.BL2.invalidate();}catch(error){}}
  function divisions(list,opts){opts=opts||{};if(!list&&bl2Students()&&typeof bl2Students().listDivisions==="function")return bl2Students().listDivisions({periodId:opts.periodId||"",matricula:opts.matricula==null?"ACTIVO":opts.matricula});var rows=list||students("ACTIVO");if(window.BLDivisionesService&&typeof window.BLDivisionesService.listDivisionsWithEmpty==="function")return window.BLDivisionesService.listDivisionsWithEmpty(rows,"");var map={};rows.forEach(function(s){map[divisionOf(s)]=true;});return Object.keys(map).sort(function(a,b){return a.localeCompare(b,"es");});}
  function filter(opts){opts=opts||{};var q=norm(opts.search);var periodId=text(opts.periodId);var division=text(opts.division);var matricula=opts.matricula==null?"ACTIVO":text(opts.matricula);var limit=Math.max(1,Number(opts.limit||400)||400);if(hasBL2()){return (bl2Students().buscar({periodId:periodId,division:division,matricula:matricula,search:opts.search||"",limit:limit}).rows||[]).map(normalizeStudent);}return students(matricula).filter(function(s){if(matricula&&s._estadoMatricula!==matricula)return false;if(periodId&&!samePeriod(s.periodoId||s.ultimoPeriodoId,periodId))return false;if(division&&!hasDivision(s,division))return false;if(q){var hay=norm([s._cedula,s._nombres,s._carrera,s._division,s._correo,s._celular,s._periodo,s._estadoMatricula,s._telegramUser,s._telegramChatId].join(" "));if(hay.indexOf(q)<0)return false;}return true;}).slice(0,limit);}
  function getById(id,opts){var wanted=text(id);opts=opts||{};if(hasBL2()){var direct=bl2Students().obtenerPorCedula(wanted,{periodId:opts.periodId||"",division:opts.division||"",matricula:opts.matricula==null?"":opts.matricula});if(direct)return normalizeStudent(direct);}return filter({periodId:opts.periodId||"",division:opts.division||"",matricula:opts.matricula==null?"":opts.matricula,search:"",limit:5000}).find(function(s){return text(s._id)===wanted;})||null;}
  function buildReq(row,req){if(bl2Reqs()&&typeof bl2Reqs().requirement==="function")return bl2Reqs().requirement(row,req);var raw=text(reqValue(row,req));var estado=estadoCelda(raw);return {key:req.key,field:req.field,label:req.label,icon:req.icon||"",value:raw||"NO CUMPLE",estado:estado};}
  function requisitos(row){return REQS.map(function(req){return buildReq(row,req);});}
  function especiales(row){return SPECIAL_REQS.map(function(req){return buildReq(row,req);});}
  function pendientes(row,includeSpecial){var source=includeSpecial?ALL_REQS:REQS;return source.map(function(req){return buildReq(row,req);}).filter(function(req){return req.estado!=="cumple";});}
  function notas(row){if(bl2Reqs()&&typeof bl2Reqs().notes==="function")return bl2Reqs().notes(row,NOTE_FIELDS);return NOTE_FIELDS.map(function(note){var raw=pick(row,note.aliases,"");var n=numberValue(raw);return {key:note.key,label:note.label,value:n==null?"—":String(raw),number:n,estado:estadoNota(raw)};});}
  function studentMessage(row){row=normalizeStudent(row||{});var faltantes=pendientes(row,true);var lines=[saludo()+", "+(row._nombres||"estudiante")+".","","Le escribimos desde el área de Titulación.","Carrera: "+(row._carrera||"—"),"Período: "+(row._periodo||"—"),""];if(faltantes.length){lines.push("Requisitos pendientes:");faltantes.forEach(function(req){lines.push("- "+req.label);});}else{lines.push("No registra requisitos pendientes.");}lines.push("","Por favor revisar y regularizar la información pendiente.");return lines.join("\n");}
  function whatsappUrl(row){row=normalizeStudent(row||{});var phone=text(row&&row._celular).replace(/[^0-9]/g,"");if(!phone)return "";if(phone.length===10&&phone.charAt(0)==="0")phone="593"+phone.slice(1);return "https://wa.me/"+phone+"?text="+encodeURIComponent(studentMessage(row));}
  function toText(row){if(!row)return "";row=normalizeStudent(row);var faltantes=pendientes(row,true);var tg=telegramInfo(row);var ns=notas(row);var lines=["FICHA DEL ESTUDIANTE","Nombre: "+row._nombres,"Cédula: "+row._cedula,"Carrera: "+row._carrera,"Período: "+row._periodo,"Matrícula: "+row._estadoMatricula,"Estado: "+(row._estado&&row._estado.label),"Correo: "+row._correo,"Celular: "+row._celular,"Telegram: "+(tg.user||tg.chatId||"—"),"","REQUISITOS PENDIENTES"];if(faltantes.length){faltantes.forEach(function(req){lines.push("- "+req.label);});}else{lines.push("Sin requisitos pendientes.");}lines.push("","NOTAS");ns.forEach(function(n){lines.push(n.label+": "+n.value);});return lines.join("\n");}
  function source(){return hasBL2()?"BL2":"ExcelLocalRepo";}
  window.FichaCore={REQS:REQS,SPECIAL_REQS:SPECIAL_REQS,ALL_REQS:ALL_REQS,NOTE_FIELDS:NOTE_FIELDS,periods:periods,students:students,divisions:divisions,filter:filter,getById:getById,requisitos:requisitos,especiales:especiales,pendientes:pendientes,notas:notas,whatsappUrl:whatsappUrl,telegramUrl:telegramUrl,telegramInfo:telegramInfo,studentMessage:studentMessage,toText:toText,estadoCelda:estadoCelda,estadoNota:estadoNota,estadoMatricula:estadoMatricula,divisionOf:divisionOf,fieldValue:fieldValue,reqValue:reqValue,invalidate:invalidate,source:source};
})(window);
