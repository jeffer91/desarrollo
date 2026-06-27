/* =========================================================
Nombre completo: stats.app.js
Ruta o ubicación: /Requisitos/Stats/stats.app.js
Función o funciones:
- Controlar la pantalla Stats y conectar filtros, KPIs, gráficos, tablas y estudiantes.
- Manejar filtros por período, división, matrícula, carrera, estado y requisito.
- Mostrar aprobación por período solo cuando exista período seleccionado.
- Separar requisitos normales de aprobación final.
- Eliminar dependencia visual de exportación y diagnóstico.
Con qué se conecta:
- stats.rules.js
- stats.core.js
- stats.charts.js
- stats.tables.js
- stats.students.js
========================================================= */
(function(window,document){
  "use strict";

  var state={
    periodId:"",
    division:"",
    matricula:"ACTIVO",
    career:"",
    status:"",
    requirementKey:"",
    data:null
  };

  function el(id){return document.getElementById(id);}
  function text(value){return String(value==null?"":value).trim();}
  function num(value){value=Number(value);return isFinite(value)?value:0;}
  function pct(value,total){return total?Math.round((num(value)*10000)/num(total))/100:0;}
  function esc(value){return text(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");}
  function status(msg,cls){var s=el("stats-status");if(s){s.textContent=msg;s.className="stats-status "+(cls||"");}}
  function option(value,label,selected){return '<option value="'+esc(value)+'" '+(selected?'selected':'')+'>'+esc(label)+'</option>';}
  function source(){return window.StatsCore&&typeof window.StatsCore.source==="function"?window.StatsCore.source():"Base Local";}
  function setText(id,value){var node=el(id);if(node)node.textContent=value;}
  function setHtml(id,value){var node=el(id);if(node)node.innerHTML=value;}
  function setVisible(node,visible){if(node)node.style.display=visible?"":"none";}
  function on(id,event,handler){var node=el(id);if(node)node.addEventListener(event,handler);}

  function periodValue(item){
    if(typeof item==="string")return item;
    item=item||{};
    return text(item.id||item.periodoId||item.periodId||item.value||item.key||item.label||item.periodoLabel||item.nombre||"");
  }

  function periodLabel(item){
    if(typeof item==="string")return item;
    item=item||{};
    return text(item.label||item.periodoLabel||item.nombre||item.name||item.id||item.periodoId||item.periodId||item.value||"");
  }

  function fillPeriodOptions(data){
    var p=el("stats-periodo");
    if(!p)return;
    var list=data.periodList||[];
    p.innerHTML=option("","Selecciona un período",!state.periodId)+list.map(function(item){
      var value=periodValue(item);
      var label=periodLabel(item)||value;
      return option(value,label,state.periodId===value);
    }).join("");
    p.value=state.periodId;
  }

  function fillSimpleSelect(id,emptyLabel,list,current){
    var node=el(id);
    if(!node)return current;
    list=list||[];
    node.innerHTML=option("",emptyLabel,!current)+list.map(function(item){return option(item,item,current===item);}).join("");
    if(current&&list.indexOf(current)<0){current="";}
    node.value=current;
    return current;
  }

  function requirementOptionsHtml(data){
    var filtro=data.requisitosFiltro||{};
    var reqs=filtro.requisitos||[];
    var finals=filtro.finales||[];
    var html=option("","Todos los requisitos",!state.requirementKey);

    if(reqs.length){
      html+='<optgroup label="Requisitos">'+reqs.map(function(item){return option(item.key,item.label,state.requirementKey===item.key);}).join("")+'</optgroup>';
    }
    if(finals.length){
      html+='<optgroup label="Aprobación final">'+finals.map(function(item){return option(item.key,item.label,state.requirementKey===item.key);}).join("")+'</optgroup>';
    }
    return html;
  }

  function fillRequirementFilter(data){
    var node=el("stats-requisito");
    if(!node)return;
    node.innerHTML=requirementOptionsHtml(data||{});
    node.value=state.requirementKey;
    if(state.requirementKey&&node.value!==state.requirementKey){
      state.requirementKey="";
      node.value="";
    }
  }

  function fillFilters(data){
    fillPeriodOptions(data);
    state.division=fillSimpleSelect("stats-division","Todas",data.divisionList||[],state.division);
    state.career=fillSimpleSelect("stats-carrera","Todas",data.careerList||[],state.career);
    var m=el("stats-matricula");if(m)m.value=state.matricula;
    var st=el("stats-estado");if(st)st.value=state.status;
    fillRequirementFilter(data);
  }

  function bar(label,value,total,extra){
    var percent=pct(value,total);
    return '<div class="stats-bar-row '+esc(extra||"")+'">'
      + '<div class="stats-bar-label" title="'+esc(label)+'">'+esc(label)+'</div>'
      + '<div class="stats-bar-track"><div class="stats-bar-fill" style="width:'+Math.max(0,Math.min(100,percent))+'%"></div></div>'
      + '<div class="stats-bar-value">'+esc(value)+' / '+esc(percent)+'%</div>'
      + '</div>';
  }

  function renderEstados(data){
    var box=el("stats-estados");
    var total=data.total||0;
    if(!box)return;
    box.innerHTML=[
      bar("Aprobado",data.estados.cumple||0,total,"ok"),
      bar("No cumple",data.estados.no_cumple||0,total,"bad")
    ].join("");
    setText("stats-estados-meta",total+" estudiantes");
  }

  function renderRequisitos(data){
    var box=el("stats-requisitos");
    if(!box)return;
    var rows=data.requisitos||[];
    if(!rows.length){box.innerHTML='<div class="empty">Sin datos.</div>';return;}
    box.innerHTML=rows.map(function(r){
      var total=r.aplica||r.total||0;
      var suffix=r.no_aplica?'<small>No aplica: '+esc(r.no_aplica)+'</small>':'';
      return '<div>'+bar(r.label,r.cumple,total)+' '+suffix+'</div>';
    }).join("");
  }

  function table(rows,kind){
    rows=rows||[];
    if(!rows.length)return '<div class="empty">Sin datos.</div>';
    var html='<table class="stats-sortable-table" data-sortable="true"><thead><tr>'
      + '<th data-sort-type="text">Nombre</th>'
      + '<th data-sort-type="number">Total</th>'
      + '<th data-sort-type="number">Cumple</th>'
      + '<th data-sort-type="number">No cumple</th>';
    if(kind==="requirements"||kind==="final")html+='<th data-sort-type="number">No aplica</th>';
    html+='<th data-sort-type="percent">Avance</th></tr></thead><tbody>';

    html+=rows.map(function(r){
      var key=esc(r.label||r.key||"Sin dato");
      var total=num(r.aplica||r.total);
      var cumple=num(r.cumple);
      var no=num(r.no_cumple);
      var noAplica=num(r.no_aplica);
      var avance=num(r.avance);
      return '<tr>'
        + '<td data-sort="'+key+'"><strong>'+key+'</strong></td>'
        + '<td data-sort="'+total+'">'+total+'</td>'
        + '<td data-sort="'+cumple+'"><span class="pill pill-ok">'+cumple+'</span></td>'
        + '<td data-sort="'+no+'"><span class="pill pill-bad">'+no+'</span></td>'
        + ((kind==="requirements"||kind==="final")?'<td data-sort="'+noAplica+'"><span class="pill pill-na">'+noAplica+'</span></td>':'')
        + '<td data-sort="'+avance+'">'+avance+'%</td>'
        + '</tr>';
    }).join("");

    return html+'</tbody></table>';
  }

  function renderTables(data){
    setHtml("stats-carreras",table(data.carreras,"general"));
    setHtml("stats-periodos",table(data.periodos,"general"));
    setText("stats-carreras-meta",(data.carreras||[]).length+" carreras");
    setText("stats-periodos-meta",(data.periodos||[]).length+" períodos");
  }

  function renderFinales(data){
    setHtml("stats-finales",table(data.requisitosFinales||[],"final"));
  }

  function renderPeriodApproval(data){
    var chip=el("stats-period-type");
    var card=el("stats-period-approval-card");
    var okArticle=el("stats-ok")&&el("stats-ok").closest?el("stats-ok").closest("article"):null;
    var noArticle=el("stats-no")&&el("stats-no").closest?el("stats-no").closest("article"):null;
    var hasPeriod=!!state.periodId;
    setVisible(card,hasPeriod);
    setVisible(okArticle,hasPeriod);
    setVisible(noArticle,hasPeriod);

    if(!hasPeriod){
      if(chip)chip.textContent="Selecciona un período";
      setText("stats-period-approval","—");
      return;
    }

    var info=data.periodApproval||{};
    if(chip)chip.textContent=(info.label||"Período")+(info.pattern?" · "+info.pattern.replace(/_/g,"-"):"");
    setText("stats-period-approval",(info.approved||0)+" / "+(info.total||0)+" · "+(info.avance||0)+"%");
  }

  function renderKpis(data){
    setText("stats-total",data.total||0);
    setText("stats-ok",data.estados&&data.estados.cumple?data.estados.cumple:0);
    setText("stats-pend",0);
    setText("stats-no",data.estados&&data.estados.no_cumple?data.estados.no_cumple:0);
    setText("stats-avance",(data.avanceGeneral||0)+"%");
    renderPeriodApproval(data);
  }

  function renderCharts(data){
    if(window.StatsCharts&&typeof window.StatsCharts.renderAll==="function")window.StatsCharts.renderAll(data);
  }

  function renderStudents(data){
    if(window.StatsStudents&&typeof window.StatsStudents.render==="function")window.StatsStudents.render(data,"stats-estudiantes");
  }

  function bindSortableTables(){
    if(window.StatsTables&&typeof window.StatsTables.bindAll==="function")window.StatsTables.bindAll(document);
  }

  function render(){
    try{
      if(!window.StatsCore||typeof window.StatsCore.resumen!=="function")throw new Error("StatsCore no disponible.");
      state.data=window.StatsCore.resumen({
        periodId:state.periodId,
        division:state.division,
        matricula:state.matricula,
        career:state.career,
        status:state.status,
        requirementKey:state.requirementKey
      });
      var data=state.data;
      fillFilters(data);
      renderKpis(data);
      renderEstados(data);
      renderRequisitos(data);
      renderTables(data);
      renderFinales(data);
      renderCharts(data);
      renderStudents(data);
      bindSortableTables();
      setText("stats-diagnostics",JSON.stringify(data.diagnostics||{},null,2));
      status("Stats cargado por "+source()+". Período: "+(state.periodId||"sin seleccionar")+". Requisito: "+(state.requirementKey||"todos")+".","ok");
    }catch(error){
      console.error("[Stats]",error);
      status(error.message||String(error),"warn");
    }
  }

  function bind(){
    on("stats-periodo","change",function(e){state.periodId=e.target.value;state.division="";state.career="";render();});
    on("stats-division","change",function(e){state.division=e.target.value;state.career="";render();});
    on("stats-matricula","change",function(e){state.matricula=e.target.value;state.division="";state.career="";render();});
    on("stats-carrera","change",function(e){state.career=e.target.value;render();});
    on("stats-estado","change",function(e){state.status=e.target.value;render();});
    on("stats-requisito","change",function(e){state.requirementKey=e.target.value;render();});
    on("stats-refresh","click",render);
  }

  function boot(){
    if(window.ExcelLocalBridge&&typeof window.ExcelLocalBridge.ensureReady==="function")window.ExcelLocalBridge.ensureReady();
    bind();
    render();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);
  else boot();
})(window,document);
