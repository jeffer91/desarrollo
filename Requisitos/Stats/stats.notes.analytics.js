/* =========================================================
Nombre completo: stats.notes.analytics.js
Ruta o ubicación: /Requisitos/Stats/stats.notes.analytics.js
Función o funciones:
- Calcular analítica avanzada de notas para Stats.
- Agrupar por carrera, rangos de nota, riesgos académicos, rankings y lectura ejecutiva.
- Separar el cálculo fuerte de la capa visual stats.notes.js.
Con qué se conecta:
- stats.core.js
- stats.notes.js
- stats.notes.charts.js
========================================================= */
(function(window){
  "use strict";

  function text(value){return String(value==null?"":value).trim();}
  function norm(value){return text(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
  function num(value){var n=Number(value);return Number.isFinite(n)?n:null;}
  function round2(value){return Number.isFinite(value)?Math.round((value+Number.EPSILON)*100)/100:null;}
  function pct(n,d){return d?round2((Number(n||0)*100)/Number(d||0)):0;}
  function avg(values){values=(values||[]).filter(function(v){return Number.isFinite(v);});if(!values.length)return null;return round2(values.reduce(function(a,b){return a+b;},0)/values.length);}
  function byDesc(field){return function(a,b){return Number(b[field]||0)-Number(a[field]||0)||text(a.carrera).localeCompare(text(b.carrera),"es");};}
  function byAsc(field){return function(a,b){return Number(a[field]||0)-Number(b[field]||0)||text(a.carrera).localeCompare(text(b.carrera),"es");};}

  function getNotes(row){
    if(row&&row._notas)return row._notas;
    if(window.StatsCore&&typeof window.StatsCore.extractNotes==="function")return window.StatsCore.extractNotes(row||{});
    return {nart:null,ndef:null,nfin:null};
  }

  function careerOf(row){return text(row&&row._carrera)||text(row&&row.nombrecarrera)||text(row&&row.nombreCarrera)||text(row&&row.carrera)||"SIN CARRERA";}

  function riskOf(notes){
    var nart=num(notes&&notes.nart), ndef=num(notes&&notes.ndef), nfin=num(notes&&notes.nfin);
    var completo=nart!==null&&ndef!==null&&nfin!==null;
    if(nfin!==null&&nfin<7)return {nivel:"alto",label:"Riesgo alto",motivo:"Nota final menor a 7"};
    if(nart!==null&&nart<7)return {nivel:"alto",label:"Riesgo alto",motivo:"Artículo menor a 7"};
    if(ndef!==null&&ndef<7)return {nivel:"alto",label:"Riesgo alto",motivo:"Defensa menor a 7"};
    if(nart!==null&&ndef===null)return {nivel:"alto",label:"Riesgo alto",motivo:"Falta defensa"};
    if(nfin!==null&&nfin<7.5)return {nivel:"medio",label:"Riesgo medio",motivo:"Nota final cercana al mínimo"};
    if(!completo&&(nart!==null||ndef!==null||nfin!==null))return {nivel:"medio",label:"Riesgo medio",motivo:"Notas incompletas"};
    if(nart!==null&&ndef!==null&&(ndef-nart)<=-1)return {nivel:"medio",label:"Riesgo medio",motivo:"La defensa baja más de 1 punto"};
    return {nivel:"bajo",label:"Riesgo bajo",motivo:completo?"Notas completas":"Sin información suficiente"};
  }

  function rangeOf(nfin){
    nfin=num(nfin);
    if(nfin===null)return "Sin nota final";
    if(nfin<7)return "Menor a 7";
    if(nfin<7.5)return "7.00 - 7.49";
    if(nfin<8)return "7.50 - 7.99";
    if(nfin<9)return "8.00 - 8.99";
    return "9.00 - 10";
  }

  function emptyCareer(carrera){
    return {carrera:carrera,total:0,conNart:0,conNdef:0,conNfin:0,sinNart:0,sinNdef:0,sinNfin:0,nartValues:[],ndefValues:[],nfinValues:[],promNart:null,promNdef:null,promNfin:null,diferenciaNdefNart:null,aprobados:0,reprobados:0,riesgoAlto:0,riesgoMedio:0,riesgoBajo:0,pendientesCriticos:0,porcentajeAprobacion:0,porcentajeRiesgoAlto:0,porcentajePendienteFinal:0,semaforo:"gris",diagnostico:"Sin datos"};
  }

  function finalizeCareer(item){
    item.sinNart=item.total-item.conNart;
    item.sinNdef=item.total-item.conNdef;
    item.sinNfin=item.total-item.conNfin;
    item.promNart=avg(item.nartValues);
    item.promNdef=avg(item.ndefValues);
    item.promNfin=avg(item.nfinValues);
    item.diferenciaNdefNart=(item.promNart!==null&&item.promNdef!==null)?round2(item.promNdef-item.promNart):null;
    item.porcentajeAprobacion=pct(item.aprobados,item.conNfin);
    item.porcentajeRiesgoAlto=pct(item.riesgoAlto,item.total);
    item.porcentajePendienteFinal=pct(item.sinNfin,item.total);
    if(!item.total)item.semaforo="gris";
    else if(item.porcentajeRiesgoAlto>=25||item.porcentajePendienteFinal>=35||(item.promNfin!==null&&item.promNfin<7))item.semaforo="rojo";
    else if(item.porcentajeRiesgoAlto>=12||item.porcentajePendienteFinal>=18||(item.promNfin!==null&&item.promNfin<7.5))item.semaforo="amarillo";
    else item.semaforo="verde";
    if(item.semaforo==="rojo")item.diagnostico="Atención prioritaria: revisar riesgo, defensas o notas pendientes.";
    else if(item.semaforo==="amarillo")item.diagnostico="Revisión recomendada: hay pendientes o notas cercanas al mínimo.";
    else if(item.semaforo==="verde")item.diagnostico="Avance estable: notas completas o rendimiento adecuado.";
    delete item.nartValues;delete item.ndefValues;delete item.nfinValues;
    return item;
  }

  function analizar(data){
    data=data||{};
    var rows=data.rows||data.estudiantes||[];
    var carrerasMap={},rangosMap={"Sin nota final":0,"Menor a 7":0,"7.00 - 7.49":0,"7.50 - 7.99":0,"8.00 - 8.99":0,"9.00 - 10":0};
    var total=rows.length,nartValues=[],ndefValues=[],nfinValues=[];
    var riesgos={alto:0,medio:0,bajo:0};
    var estudiantesRiesgo=[];

    rows.forEach(function(row){
      var carrera=careerOf(row);
      if(!carrerasMap[carrera])carrerasMap[carrera]=emptyCareer(carrera);
      var c=carrerasMap[carrera];
      var notes=getNotes(row);
      var nart=num(notes.nart),ndef=num(notes.ndef),nfin=num(notes.nfin);
      var risk=riskOf(notes);
      c.total++;
      if(nart!==null){c.conNart++;c.nartValues.push(nart);nartValues.push(nart);}
      if(ndef!==null){c.conNdef++;c.ndefValues.push(ndef);ndefValues.push(ndef);}
      if(nfin!==null){c.conNfin++;c.nfinValues.push(nfin);nfinValues.push(nfin);if(nfin>=7)c.aprobados++;else c.reprobados++;}
      if(nfin===null||ndef===null)c.pendientesCriticos++;
      c["riesgo"+risk.nivel.charAt(0).toUpperCase()+risk.nivel.slice(1)]++;
      riesgos[risk.nivel]++;
      rangosMap[rangeOf(nfin)]++;
      if(risk.nivel!=="bajo")estudiantesRiesgo.push({nombre:text(row._nombres)||"Sin nombre",cedula:text(row._cedula),carrera:carrera,nart:nart,ndef:ndef,nfin:nfin,nivel:risk.nivel,motivo:risk.motivo});
    });

    var carreras=Object.keys(carrerasMap).map(function(key){return finalizeCareer(carrerasMap[key]);}).sort(byDesc("total"));
    var resumen={
      total:total,
      conNart:nartValues.length,
      conNdef:ndefValues.length,
      conNfin:nfinValues.length,
      sinNart:total-nartValues.length,
      sinNdef:total-ndefValues.length,
      sinNfin:total-nfinValues.length,
      promNart:avg(nartValues),
      promNdef:avg(ndefValues),
      promNfin:avg(nfinValues),
      diferenciaNdefNart:(avg(nartValues)!==null&&avg(ndefValues)!==null)?round2(avg(ndefValues)-avg(nartValues)):null,
      aprobados:nfinValues.filter(function(n){return n>=7;}).length,
      reprobados:nfinValues.filter(function(n){return n<7;}).length,
      porcentajeAprobacion:pct(nfinValues.filter(function(n){return n>=7;}).length,nfinValues.length),
      riesgoAlto:riesgos.alto,
      riesgoMedio:riesgos.medio,
      riesgoBajo:riesgos.bajo,
      porcentajeRiesgoAlto:pct(riesgos.alto,total)
    };

    var rangos=Object.keys(rangosMap).map(function(key){return {rango:key,total:rangosMap[key],porcentaje:pct(rangosMap[key],total)};});
    var rankings={
      mejoresPromedios:carreras.filter(function(c){return c.promNfin!==null;}).slice().sort(byDesc("promNfin")).slice(0,5),
      menoresPromedios:carreras.filter(function(c){return c.promNfin!==null;}).slice().sort(byAsc("promNfin")).slice(0,5),
      masRiesgo:carreras.slice().sort(byDesc("riesgoAlto")).slice(0,5),
      masPendientes:carreras.slice().sort(byDesc("sinNfin")).slice(0,5),
      defensaMasBaja:carreras.filter(function(c){return c.diferenciaNdefNart!==null;}).slice().sort(byAsc("diferenciaNdefNart")).slice(0,5)
    };

    var lectura=crearLectura(resumen,carreras,rankings);
    return {resumen:resumen,carreras:carreras,rangos:rangos,rankings:rankings,estudiantesRiesgo:estudiantesRiesgo.slice(0,40),lectura:lectura,creadoEn:new Date().toISOString()};
  }

  function crearLectura(resumen,carreras,rankings){
    var out=[];
    var mejor=rankings.mejoresPromedios[0];
    var riesgo=rankings.masRiesgo[0];
    var pendiente=rankings.masPendientes[0];
    var defensa=rankings.defensaMasBaja[0];
    if(mejor)out.push("Mejor promedio final: "+mejor.carrera+" con "+mejor.promNfin+".");
    if(riesgo&&riesgo.riesgoAlto>0)out.push("Mayor riesgo alto: "+riesgo.carrera+" con "+riesgo.riesgoAlto+" estudiante(s).");
    if(pendiente&&pendiente.sinNfin>0)out.push("Más notas finales pendientes: "+pendiente.carrera+" con "+pendiente.sinNfin+" pendiente(s).");
    if(defensa&&defensa.diferenciaNdefNart<0)out.push("La defensa baja más el promedio en "+defensa.carrera+" ("+defensa.diferenciaNdefNart+" puntos frente a artículo).");
    if(resumen.diferenciaNdefNart!==null)out.push(resumen.diferenciaNdefNart<0?"Tendencia general: la defensa está bajando el promedio frente al artículo.":"Tendencia general: la defensa sostiene o mejora el promedio frente al artículo.");
    if(!out.length)out.push("Todavía no hay suficientes notas para generar lectura automática.");
    return out;
  }

  window.StatsNotesAnalytics={analizar:analizar,riskOf:riskOf,rangeOf:rangeOf};
})(window);
