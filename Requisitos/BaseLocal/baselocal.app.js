/* =========================================================
Nombre completo: baselocal.app.js
Ruta o ubicación: /Requisitos/BaseLocal/baselocal.app.js
Función o funciones:
- Renderizar la pantalla BL.
- Mostrar periodos, estudiantes, historial y diagnóstico local.
Con qué se conecta:
- baselocal.core.js
- baselocal.manual.js
========================================================= */
(function(window,document){
  "use strict";
  var state={tab:"periodos",periodId:"",search:""};
  function el(id){return document.getElementById(id);}function text(v){return String(v==null?"":v).trim();}
  function esc(v){return text(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;");}
  function status(msg,cls){var s=el("bl-status");if(s){s.textContent=msg;s.className="bl-status "+(cls||"bl-status-info");}}
  function table(headers,rows){if(!rows||!rows.length)return '<p class="bl-help">Sin datos todavía. Primero analiza un Excel en Requisito.</p>';var h='<table><thead><tr>'+headers.map(function(x){return '<th>'+esc(x.label)+'</th>';}).join('')+'</tr></thead><tbody>';h+=rows.map(function(row){return '<tr>'+headers.map(function(x){return '<td>'+esc(typeof x.value==="function"?x.value(row):row[x.key])+'</td>';}).join('')+'</tr>';}).join('');return h+'</tbody></table>';}
  function renderPeriods(view){el("bl-periodos-table").innerHTML=table([{label:"Período",key:"label"},{label:"ID",key:"id"},{label:"Actualizado",key:"updatedAt"}],view.periods);}
  function renderStudents(view){var rows=view.students.slice(0,300);el("bl-estudiantes-table").innerHTML=table([{label:"Cédula",key:"cedula"},{label:"Nombre",key:"nombres"},{label:"Carrera",key:"nombrecarrera"},{label:"Período",key:"periodoLabel"}],rows);}
  function renderHistory(view){el("bl-history-table").innerHTML=table([{label:"Fecha",key:"createdAt"},{label:"Período",key:"periodoLabel"},{label:"Archivo",key:"fileName"},{label:"Filas",key:"totalRows"}],view.history);}
  function renderDiagnostics(view){el("bl-diagnostics-box").textContent=JSON.stringify(view.diagnostics,null,2);}
  function renderSelectors(view){var sel=el("bl-filter-period");if(!sel)return;var current=state.periodId||sel.value;sel.innerHTML='<option value="">Todos los períodos</option>'+view.periods.map(function(p){return '<option value="'+esc(p.id)+'">'+esc(p.label||p.id)+'</option>';}).join('');sel.value=current;}
  function render(){try{var view=window.BaseLocalAPI.buildView(state.periodId,state.search);renderSelectors(view);el("bl-kpi-periodos").textContent=view.periods.length;el("bl-kpi-estudiantes").textContent=view.students.length;el("bl-kpi-historial").textContent=view.history.length;el("bl-kpi-carreras").textContent=view.careersCount;el("bl-kpi-estado").textContent="Local";renderPeriods(view);renderStudents(view);renderHistory(view);renderDiagnostics(view);var man=el("bl-manual-text");if(man&&window.BaseLocalManual)man.value=window.BaseLocalManual.getManual();status("BaseLocal cargada correctamente.","bl-status-ok");}catch(e){console.error("[BaseLocal]",e);status(e.message||String(e),"bl-status-warn");}}
  function setTab(tab){state.tab=tab;document.querySelectorAll(".bl-tabs button").forEach(function(b){b.classList.toggle("is-active",b.dataset.tab===tab);});document.querySelectorAll(".bl-panel").forEach(function(p){p.classList.toggle("is-active",p.id==="bl-tab-"+tab);});}
  function exportJson(){var data=window.BaseLocalAPI.getSnapshot();var blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="baselocal-requisitos.json";a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},1000);}
  function copyRefs(){var txt=window.BaseLocalManual?window.BaseLocalManual.getManual():"";if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(txt).then(function(){status("Referencias copiadas.","bl-status-ok");}).catch(function(){var m=el("bl-manual-text");if(m){m.focus();m.select();}status("Copia manualmente desde la pestaña Manual.","bl-status-warn");});}else{var m=el("bl-manual-text");if(m){m.focus();m.select();}status("Copia manualmente desde la pestaña Manual.","bl-status-warn");}}
  function boot(){if(window.ExcelLocalBridge)window.ExcelLocalBridge.ensureReady();document.querySelectorAll(".bl-tabs button").forEach(function(b){b.addEventListener("click",function(){setTab(b.dataset.tab);});});if(el("bl-filter-period"))el("bl-filter-period").addEventListener("change",function(e){state.periodId=e.target.value;render();});if(el("bl-filter-search"))el("bl-filter-search").addEventListener("input",function(e){state.search=e.target.value;render();});if(el("bl-btn-refresh"))el("bl-btn-refresh").addEventListener("click",render);if(el("bl-btn-export"))el("bl-btn-export").addEventListener("click",exportJson);if(el("bl-btn-copy-refs"))el("bl-btn-copy-refs").addEventListener("click",copyRefs);render();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})(window,document);
