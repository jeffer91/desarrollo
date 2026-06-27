/* =========================================================
Nombre completo: bl2-reportes.repo.js
Ruta o ubicación: /Requisitos/BaseLocal2/repositories/bl2-reportes.repo.js
Función o funciones:
- Generar reportes y coordinación desde el resumen BL2 cacheado.
- Evitar duplicar cálculos en Coordi y Reportes.
- Mantener formatos compatibles con coordi.core.js y repo.core.js.
Con qué se conecta:
- bl2-stats.repo.js
- bl2-cache-resumen.service.js
- Coordi/coordi.core.js
- Reportes/repo.core.js
========================================================= */
(function(window){
  "use strict";

  function stats(){return window.BL2StatsRepo || null;}
  function cache(){return window.BL2CacheResumen || null;}
  function text(v){return String(v==null?"":v).trim();}
  function pct(n,d){return d?Math.round((n*10000)/d)/100:0;}

  function priority(row){
    var e=row&&row._estado?row._estado:{ok:0,no:0,pend:0};
    var score=(e.no||0)*3+(e.pend||0);
    var level=score>=8||(e.no||0)>=2?"alta":score>=3?"media":"baja";
    return {level:level,label:level==="alta"?"Alta":level==="media"?"Media":"Baja",score:score,ok:e.ok||0,no:e.no||0,pend:e.pend||0,total:(stats()&&stats().REQS?stats().REQS.length:11)};
  }

  function coordiSummary(opts){
    opts=opts||{};
    if(cache()){return cache().getOrSet("coordi",opts,function(){return buildCoordi(opts);},{ttl:3000});}
    return buildCoordi(opts);
  }

  function buildCoordi(opts){
    var base=stats()?stats().resumen({periodId:opts.periodId||"",division:opts.division||"",matricula:"",career:opts.career||"",status:""}):{rows:[],periodList:[],divisionList:[],careerList:[]};
    var priorityLevel=text(opts.priority);
    var rows=(base.rows||[]).map(function(row){var r=Object.assign({},row);r._priority=priority(r);return r;}).filter(function(row){return !priorityLevel||row._priority.level===priorityLevel;}).sort(function(a,b){return b._priority.score-a._priority.score||String(a._nombres||"").localeCompare(String(b._nombres||""),"es");});
    var k={total:rows.length,alta:0,media:0,baja:0,carreras:0};
    rows.forEach(function(s){k[s._priority.level]++;});
    var carreras=byCareer(rows);k.carreras=carreras.length;
    return {kpis:k,rows:rows,carreras:carreras,requisitos:byRequirement(rows),periodList:base.periodList||[],divisionList:base.divisionList||[],careerList:base.careerList||[],diagnostics:{generatedAt:new Date().toISOString(),source:"BL2ReportesRepo.coordi",filters:opts,total:rows.length}};
  }

  function byCareer(list){var map={};list.forEach(function(s){var k=s._carrera||"SIN CARRERA";if(!map[k])map[k]={key:k,total:0,alta:0,media:0,baja:0,pendientes:0,noCumple:0,avance:0};map[k].total++;map[k][s._priority.level]++;map[k].pendientes+=s._priority.pend;map[k].noCumple+=s._priority.no;});Object.keys(map).forEach(function(k){var x=map[k];x.avance=pct(x.baja,x.total);});return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return b.alta-a.alta||b.pendientes-a.pendientes||a.key.localeCompare(b.key,"es");});}
  function byRequirement(list){var reqs=stats()&&stats().REQS?stats().REQS:[];return reqs.map(function(req){var item={key:req.key,label:req.label,total:list.length,cumple:0,pendiente:0,no_cumple:0,atencion:0};list.forEach(function(row){var e=stats().estadoCelda(row[req.key]);item[e]++;});item.atencion=item.no_cumple*3+item.pendiente;return item;}).sort(function(a,b){return b.atencion-a.atencion;});}

  function reportBuild(opts){
    opts=Object.assign({tipo:"general",matricula:"ACTIVO"},opts||{});
    if(cache()){return cache().getOrSet("reportes",opts,function(){return buildReport(opts);},{ttl:3000});}
    return buildReport(opts);
  }

  function buildReport(opts){
    var base=stats()?stats().resumen(opts):{rows:[],kpis:{},carreras:[],requisitos:[],periodList:[],divisionList:[],careerList:[]};
    var kpis={total:base.total||0,cumple:(base.estados&&base.estados.cumple)||0,pendiente:(base.estados&&base.estados.pendiente)||0,no_cumple:(base.estados&&base.estados.no_cumple)||0,avance:base.avanceGeneral||0};
    var pendientes=(base.rows||[]).filter(function(s){return s._estado&&s._estado.id!=="cumple";}).sort(function(a,b){return ((b._estado.no||0)*3+(b._estado.pend||0))-((a._estado.no||0)*3+(a._estado.pend||0))||String(a._nombres||"").localeCompare(String(b._nombres||""),"es");});
    var data={tipo:text(opts.tipo)||"general",generatedAt:new Date().toISOString(),kpis:kpis,carreras:base.carreras||[],requisitos:(base.requisitos||[]).slice().sort(function(a,b){return (b.atencion||0)-(a.atencion||0);}),pendientes:pendientes,periodList:base.periodList||[],divisionList:base.divisionList||[],careerList:base.careerList||[],rows:base.rows||[],filters:opts,source:"BL2ReportesRepo"};
    data.text=makeText(data);data.html=makeHtml(data);return data;
  }

  function makeText(data){var k=data.kpis;var lines=["REPORTE DE REQUISITOS","Fecha: "+new Date(data.generatedAt).toLocaleString(),"Tipo: "+data.tipo,"Matrícula: "+(data.filters.matricula||"Todos"),"División: "+(data.filters.division||"Todas"),"","RESUMEN GENERAL","Total estudiantes: "+k.total,"Cumplen todo: "+k.cumple,"Con pendientes: "+k.pendiente,"No cumplen: "+k.no_cumple,"Avance general: "+k.avance+"%",""];if(data.carreras[0])lines.push("Carrera con mayor atención: "+data.carreras[0].key+" (No cumple: "+data.carreras[0].no_cumple+", pendientes: "+data.carreras[0].pendiente+")");if(data.requisitos[0])lines.push("Requisito crítico: "+data.requisitos[0].label+" (No cumple: "+data.requisitos[0].no_cumple+", pendientes: "+data.requisitos[0].pendiente+")");lines.push("","RECOMENDACIÓN","Priorizar estudiantes activos con no cumplen y luego los que tienen pendientes acumulados.");return lines.join("\n");}
  function makeHtml(data){return "<h1>Reporte de Requisitos</h1><pre>"+makeText(data).replace(/&/g,"&amp;").replace(/</g,"&lt;")+"</pre>";}

  function message(data,type){data=data||coordiSummary({});type=type||"general";var k=data.kpis||{};var topCareer=(data.carreras||[])[0];var topReq=(data.requisitos||[])[0];if(type==="carrera"&&topCareer){return "Resumen de coordinación por carrera:\n\nLa carrera con mayor atención es "+topCareer.key+".\nTotal estudiantes: "+topCareer.total+".\nPrioridad alta: "+topCareer.alta+".\nPendientes acumulados: "+topCareer.pendientes+".\n\nSe recomienda revisar primero los casos de prioridad alta y confirmar los requisitos pendientes.";}if(type==="pendientes"&&topReq){return "Seguimiento de requisitos críticos:\n\nEl requisito con mayor atención es: "+topReq.label+".\nPendientes: "+topReq.pendiente+".\nNo cumplen: "+topReq.no_cumple+".\n\nFavor revisar esta información y coordinar la actualización correspondiente.";}return "Resumen general de coordinación:\n\nTotal estudiantes revisados: "+(k.total||0)+".\nDivisión: "+((data.diagnostics&&data.diagnostics.filters&&data.diagnostics.filters.division)||"Todas")+".\nPrioridad alta: "+(k.alta||0)+".\nPrioridad media: "+(k.media||0)+".\nPrioridad baja: "+(k.baja||0)+".\nCarreras involucradas: "+(k.carreras||0)+".\n\nSe recomienda iniciar el seguimiento por los estudiantes con prioridad alta.";}

  window.BL2ReportesRepo={version:"2.0.0-alpha.1",coordiSummary:coordiSummary,reportBuild:reportBuild,message:message,priority:priority,source:function(){return "BL2ReportesRepo";}};
})(window);
