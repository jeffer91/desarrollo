/* =========================================================
Nombre completo: tabla.core.js
Ruta o ubicación: /Requisitos/Gestion/Tabla/tabla.core.js
Función o funciones:
- Leer estudiantes primero desde BL2 y usar ExcelLocalRepo como respaldo.
- Calcular estado general del estudiante.
- Aplicar filtros de período, división, matrícula, carrera, estado y búsqueda.
- Mostrar ACTIVO por defecto.
- Entregar resultados paginados para no renderizar toda la base.
- Normalizar datos de Telegram para contacto individual y masivo desde Tabla.
Con qué se conecta:
- ../../BaseLocal2/repositories/bl2-estudiantes.repo.js
- ../../BaseLocal2/services/bl2-pagination.service.js
- excel-local.repo.js
- bl-periodos-canon.service.js
- bl-divisiones.service.js
- tabla.app.js
========================================================= */
(function(window){
  "use strict";
  var REQS=["academico","documentacion","financiero","titulacion","practicasvinculacion","vinculacion","seguimientograduados","ingles","actualizaciondatos","aprobaciontitulacion","aprobacioncomplexivoproyecto"];
  var TELEGRAM_USER_ALIASES=["_telegramUser","telegramUser","TelegramUser","telegramuser","usuarioTelegram","UsuarioTelegram","usuariotelegram","telegram","Telegram"];
  var TELEGRAM_CHAT_ID_ALIASES=["_telegramChatId","telegramChatId","TelegramChatId","telegramchatid","chatIdTelegram","ChatIdTelegram","chatidtelegram","chatId","ChatId","chatid"];

  function text(v){return String(v==null?"":v).trim();}
  function norm(v){return text(v).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
  function cleanTelegramUser(v){return text(v).replace(/^@+/,"").trim();}
  function estadoMatricula(v){return norm(v||"ACTIVO")==="retirado"?"RETIRADO":"ACTIVO";}
  function estadoCelda(v){var k=norm(v);if(!k)return "pendiente";if(["si","sí","s","ok","cumple","aprobado","aprobada","1","true","x","validado","completo"].indexOf(k)>=0)return "cumple";if(["no","n","no cumple","reprobado","reprobada","0","false","falta","incompleto"].indexOf(k)>=0)return "no_cumple";return "pendiente";}
  function estadoEstudiante(row){var no=0,pend=0,ok=0;REQS.forEach(function(req){var e=estadoCelda(row[req]);if(e==="cumple")ok++;else if(e==="no_cumple")no++;else pend++;});if(no>0)return {id:"no_cumple",label:"No cumple",ok:ok,no:no,pend:pend};if(pend>0)return {id:"pendiente",label:"Con pendientes",ok:ok,no:no,pend:pend};return {id:"cumple",label:"Cumple todo",ok:ok,no:no,pend:pend};}
  function pick(row,aliases,fallback){var keys=Object.keys(row||{});for(var i=0;i<aliases.length;i++){for(var j=0;j<keys.length;j++){if(norm(keys[j])===norm(aliases[i])){var value=row[keys[j]];if(value!=null&&text(value)!=="")return value;}}}return fallback;}
  function telegramInfo(row){row=row||{};var user=cleanTelegramUser(pick(row,TELEGRAM_USER_ALIASES,""));var chatId=text(pick(row,TELEGRAM_CHAT_ID_ALIASES,""));return {user:user,chatId:chatId,hasTelegram:!!(user||chatId),canSendByBot:!!chatId};}
  function telegramUrl(row){var info=telegramInfo(row);if(info.user)return "https://t.me/"+encodeURIComponent(info.user);if(info.chatId)return "tg://user?id="+encodeURIComponent(info.chatId);return "";}
  function repo(){if(!window.ExcelLocalRepo)throw new Error("ExcelLocalRepo no disponible. Primero carga Base Local.");return window.ExcelLocalRepo;}
  function bl2Repo(){return window.BL2EstudiantesRepo||null;}
  function pager(){return window.BL2PaginationService||null;}
  function hasBL2(){return !!(bl2Repo()&&typeof bl2Repo().buscar==="function");}
  function snapshot(){return repo().getSnapshot();}
  function periods(){if(hasBL2()&&typeof bl2Repo().listPeriods==="function")return bl2Repo().listPeriods()||[];return repo().listPeriods?repo().listPeriods():snapshot().periods||[];}
  function students(matricula){if(hasBL2())return (bl2Repo().listarPagina({matricula:matricula==null?"ACTIVO":matricula,limit:0}).rows||[]);if(repo().listStudentsByStatus&&matricula!==undefined)return repo().listStudentsByStatus(matricula||"");return repo().listAllStudents?repo().listAllStudents():snapshot().students||[];}
  function samePeriod(a,b){if(!text(b))return true;if(window.BLPeriodosCanon&&typeof window.BLPeriodosCanon.samePeriod==="function")return window.BLPeriodosCanon.samePeriod(a,b);return text(a)===text(b)||norm(a)===norm(b);}
  function divisionOf(row){if(row&&row._bl2Division)return row._bl2Division;if(window.BLDivisionesService&&typeof window.BLDivisionesService.studentDivision==="function")return window.BLDivisionesService.studentDivision(row);var list=Array.isArray(row&&row.divisiones)?row.divisiones:[];return list[0]||row.division||"Sin división";}
  function hasDivision(row,division){if(!text(division))return true;if(row&&row._bl2Division)return norm(row._bl2Division)===norm(division);if(window.BLDivisionesService&&typeof window.BLDivisionesService.hasDivision==="function")return window.BLDivisionesService.hasDivision(row,division);return norm(divisionOf(row))===norm(division);}
  function decorate(row){var r=Object.assign({},row||{});var tg=telegramInfo(r);r._estadoGeneral=estadoEstudiante(r);r._estadoMatricula=estadoMatricula(r._bl2EstadoMatricula||r.estadoMatricula);r._cedula=text(r._bl2Id||r.cedula||r.numeroIdentificacion||r.numeroidentificacion);r._nombres=text(r._bl2Nombre||r.nombres||r.Nombres||r.nombre||r.estudiante);r._carrera=text(r._bl2Carrera||r.nombrecarrera||r.nombreCarrera||r.NombreCarrera||r.carrera);r._division=divisionOf(r);r._celular=text(r.celular||r.Celular||r.telefono||r.whatsapp);r._correo=text(r.correopersonal||r.CorreoPersonal||r.correoPersonal||r.correoinstitucional||r.CorreoInstitucional||r.correoInstitucional);r._periodo=text(r._bl2Periodo||r.periodoLabel||r.periodoId);r._telegramUser=tg.user;r._telegramChatId=tg.chatId;r._telegramTiene=tg.hasTelegram;r._telegramBot=tg.canSendByBot;return r;}
  function careers(list){var map={};(list||students("ACTIVO").map(decorate)).forEach(function(s){var c=text(s._carrera||s.nombrecarrera||s.nombreCarrera||s.carrera)||"SIN CARRERA";map[c]=true;});return Object.keys(map).sort(function(a,b){return a.localeCompare(b,"es");});}
  function divisions(list,opts){opts=opts||{};if(!list&&hasBL2()&&typeof bl2Repo().listDivisions==="function")return bl2Repo().listDivisions({periodId:opts.periodId||"",matricula:opts.matricula==null?"ACTIVO":opts.matricula});var rows=(list||students("ACTIVO").map(decorate));if(window.BLDivisionesService&&typeof window.BLDivisionesService.listDivisionsWithEmpty==="function")return window.BLDivisionesService.listDivisionsWithEmpty(rows,"");var map={};rows.forEach(function(s){map[divisionOf(s)]=true;});return Object.keys(map).sort(function(a,b){return a.localeCompare(b,"es");});}
  function baseRows(opts){opts=opts||{};var matricula=opts.matricula==null?"ACTIVO":text(opts.matricula);if(hasBL2()){return (bl2Repo().buscar({periodId:opts.periodId||"",division:opts.division||"",matricula:matricula,search:opts.search||"",limit:0}).rows||[]).map(decorate);}return students(matricula).map(decorate);}
  function filterAll(opts){opts=opts||{};var q=norm(opts.search);var periodId=text(opts.periodId);var division=text(opts.division);var career=text(opts.career);var status=text(opts.status);var matricula=opts.matricula==null?"ACTIVO":text(opts.matricula);return baseRows(opts).filter(function(s){if(matricula&&s._estadoMatricula!==matricula)return false;if(periodId&&!samePeriod(s.periodoId||s._periodo,periodId))return false;if(division&&!hasDivision(s,division))return false;if(career&&s._carrera!==career)return false;if(status&&s._estadoGeneral.id!==status)return false;if(q){var hay=norm([s._cedula,s._nombres,s._carrera,s._division,s._correo,s._celular,s._telegramUser,s._telegramChatId,s.periodoLabel,s.periodoId,s._periodo,s._estadoMatricula].join(" "));if(hay.indexOf(q)<0)return false;}return true;});}
  function filter(opts){return filterAll(opts);}
  function page(opts){opts=opts||{};var rows=filterAll(opts);var pageInfo=pager()?pager().build(rows.length,{page:opts.page||1,pageSize:opts.pageSize||100}):{page:1,pageSize:100,offset:0,total:rows.length,pages:1,hasPrev:false,hasNext:false,label:""};var pageRows=rows.slice(pageInfo.offset,pageInfo.offset+pageInfo.pageSize);return {rows:pageRows,allRows:rows,total:rows.length,pagination:pageInfo,summary:summary(rows),source:hasBL2()?"BL2":"ExcelLocalRepo"};}
  function summary(list){list=Array.isArray(list)?list:[];var careerMap={};var c={total:list.length,cumple:0,pendiente:0,no_cumple:0,carreras:0};list.forEach(function(s){c[s._estadoGeneral.id]=(c[s._estadoGeneral.id]||0)+1;careerMap[text(s._carrera)||"SIN CARRERA"]=true;});c.carreras=Object.keys(careerMap).length;return c;}
  function whatsappUrl(row){var phone=text(row._celular).replace(/[^0-9]/g,"");if(!phone)return "";if(phone.length===10&&phone.charAt(0)==="0")phone="593"+phone.slice(1);var msg="Estimado/a "+(row._nombres||"estudiante")+", le escribimos sobre sus requisitos de titulación.";return "https://wa.me/"+phone+"?text="+encodeURIComponent(msg);}
  window.TablaCore={REQS:REQS,estadoEstudiante:estadoEstudiante,estadoMatricula:estadoMatricula,periods:periods,students:students,careers:careers,divisions:divisions,filter:filter,page:page,summary:summary,whatsappUrl:whatsappUrl,telegramInfo:telegramInfo,telegramUrl:telegramUrl,decorate:decorate,divisionOf:divisionOf,source:function(){return hasBL2()?"BL2":"ExcelLocalRepo";}};
})(window);
