/* =========================================================
Nombre completo: titulacion.app.js
Ruta o ubicación: /Requisitos/Titulacion/frontend/titulacion.app.js
Función o funciones:
- Orquestar la nueva pantalla Infor.
- Manejar período, tipo Regular/PVC, Excel, cronogramas, anexos, Gemini y diagnóstico.
- Usar InforPeriodo como fuente única para períodos, conteo y modalidades automáticas.
- Guardar insumos mínimos por período usando InforState.
Con qué se conecta:
- ../core/infor.periodo.js
- ../core/infor.state.js
- ../../Stats/stats.rules.js
- titulacion.html
========================================================= */
(function(window, document){
  "use strict";

  var state = {periods:[], anexos:[], booted:false, periodSummary:null};

  function el(id){return document.getElementById(id);}
  function text(value){return String(value == null ? "" : value).trim();}
  function esc(value){return text(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");}
  function option(value,label,selected){return '<option value="' + esc(value) + '" ' + (selected ? 'selected' : '') + '>' + esc(label) + '</option>';}
  function status(message, cls){var box = el("infor-status");if(box){box.textContent = message;box.className = "infor-status " + (cls || "");}}
  function bind(id,eventName,handler){var node = el(id);if(node){node.addEventListener(eventName,handler);}}

  function periodo(){return window.InforPeriodo || null;}
  function periodIdOf(period){return periodo() ? periodo().periodIdOf(period) : text(period && (period.id || period.periodoId || period.value || period.key) || period);}
  function periodLabelOf(period){return periodo() ? periodo().periodLabelOf(period) : text(period && (period.label || period.periodoLabel || period.nombre || period.name || period.id || period.periodoId) || period);}

  function listPeriods(){
    if(periodo() && typeof periodo().list === "function"){return periodo().list();}
    return [];
  }

  function selectedPeriod(){
    var id = el("infor-periodo") ? el("infor-periodo").value : "";
    return state.periods.find(function(period){return periodIdOf(period) === id;}) || {id:id,label:id};
  }

  function fillPeriods(){
    var select = el("infor-periodo");
    if(!select){return;}
    state.periods = listPeriods();
    select.innerHTML = option("", "Selecciona un período", !select.value) + state.periods.map(function(period){
      var id = periodIdOf(period);
      return option(id, periodLabelOf(period), select.value === id);
    }).join("");
  }

  function reportName(snapshot){
    snapshot = snapshot || window.InforState.getState();
    if(state.periodSummary && state.periodSummary.reportName){return state.periodSummary.reportName;}
    var label = text(snapshot.periodLabel || snapshot.periodId);
    return label ? "Informe de Titulación " + label : "—";
  }

  function setChip(id, label, cls){
    var node = el(id);
    if(!node){return;}
    node.textContent = label;
    node.className = "infor-chip " + (cls || "");
  }

  function updatePeriodSummary(snapshot){
    snapshot = snapshot || window.InforState.getState();
    if(periodo() && typeof periodo().summary === "function" && text(snapshot.periodId || snapshot.periodLabel)){
      state.periodSummary = periodo().summary({id:snapshot.periodId,label:snapshot.periodLabel});
    }else{
      state.periodSummary = null;
    }
    return state.periodSummary;
  }

  function renderModalidades(summary){
    var box = el("infor-modalidades");
    if(!box){return;}
    var list = summary && Array.isArray(summary.modalities) ? summary.modalities : [];
    if(!list.length){box.innerHTML = "<em>Selecciona un período.</em>";return;}
    box.innerHTML = list.map(function(item){
      var cls = item.locked ? " locked" : (item.default ? " default" : "");
      var tag = item.locked ? "fijo" : (item.default ? "por defecto" : "editable en Ficha");
      return '<span class="infor-mode-pill' + cls + '">' + esc(item.label) + ' · ' + esc(tag) + '</span>';
    }).join("");
  }

  function renderByPeriod(snapshot){
    snapshot = snapshot || window.InforState.getState();
    var summary = updatePeriodSummary(snapshot);
    var info = summary && summary.type ? summary.type : (snapshot.periodType || {id:"", label:"Sin período"});
    var isRegular = info.id === "REGULAR";
    setChip("infor-period-type", info.label || "Sin período", isRegular ? "ok" : (info.id === "PVC" ? "warn" : ""));
    setChip("infor-cronograma-mode", isRegular ? "Regular: Complexivo + Trabajo" : (info.id === "PVC" ? "PVC: Artículo Académico" : "Automático"), isRegular ? "ok" : (info.id === "PVC" ? "warn" : ""));
    if(el("infor-type-label")){el("infor-type-label").textContent = info.label || "—";}
    if(el("infor-source-label")){el("infor-source-label").textContent = summary && summary.students ? summary.students.source : "—";}
    if(el("infor-students-count")){el("infor-students-count").textContent = summary && summary.students ? String(summary.students.total || 0) : "0";}
    if(el("infor-report-name")){el("infor-report-name").textContent = reportName(snapshot);}
    renderModalidades(summary);
    if(el("infor-cronogramas-regular")){el("infor-cronogramas-regular").classList.toggle("is-hidden", !isRegular);}
    if(el("infor-cronogramas-pvc")){el("infor-cronogramas-pvc").classList.toggle("is-hidden", isRegular || !info.id);}
  }

  function renderGemini(){
    var hasKey = window.InforState.refreshGeminiFlag();
    setChip("infor-gemini-state", hasKey ? "Gemini configurado" : "Gemini sin clave", hasKey ? "ok" : "warn");
  }

  function renderExcel(snapshot){
    snapshot = snapshot || window.InforState.getState();
    var excel = snapshot.excel || {};
    setChip("infor-excel-state", excel.loaded ? "Excel registrado" : "Sin Excel", excel.loaded ? "ok" : "warn");
    if(el("infor-excel-name")){el("infor-excel-name").textContent = excel.fileName || "—";}
    if(el("infor-excel-sheets")){el("infor-excel-sheets").textContent = excel.loaded ? "Pendiente de lectura inteligente" : "Pendiente";}
  }

  function renderCronogramas(snapshot){
    snapshot = snapshot || window.InforState.getState();
    var c = snapshot.cronogramas || {};
    if(el("infor-cronograma-complexivo") && el("infor-cronograma-complexivo").value !== text(c.complexivo)){el("infor-cronograma-complexivo").value = text(c.complexivo);}
    if(el("infor-cronograma-trabajo") && el("infor-cronograma-trabajo").value !== text(c.trabajoTitulacion)){el("infor-cronograma-trabajo").value = text(c.trabajoTitulacion);}
    if(el("infor-cronograma-pvc") && el("infor-cronograma-pvc").value !== text(c.pvc)){el("infor-cronograma-pvc").value = text(c.pvc);}
  }

  function renderAnexos(){
    var box = el("infor-anexos-list");
    if(el("infor-anexos-count")){el("infor-anexos-count").textContent = state.anexos.length + " anexos";}
    if(!box){return;}
    if(!state.anexos.length){box.innerHTML = '<div class="infor-empty">Sin anexos cargados.</div>';return;}
    box.innerHTML = state.anexos.map(function(item, index){
      return '<article class="infor-anexo" data-index="' + index + '">' +
        (item.preview ? '<img src="' + esc(item.preview) + '" alt="' + esc(item.title || item.name) + '">' : '') +
        '<input class="infor-anexo-title" type="text" data-title-index="' + index + '" value="' + esc(item.title || '') + '" placeholder="Título del anexo" />' +
        '<div class="infor-anexo-meta"><span>' + esc(item.name || 'imagen') + '</span><span>' + Math.round((item.size || 0)/1024) + ' KB</span></div>' +
      '</article>';
    }).join("");
  }

  function saveAnexosToState(){
    window.InforState.setAnexos(state.anexos.map(function(item){
      return {name:item.name,size:item.size,type:item.type,title:item.title || item.name,createdAt:item.createdAt};
    }));
    renderDiagnostics();
  }

  function renderDiagnostics(){
    var node = el("infor-diagnostics");
    if(!node){return;}
    var snapshot = window.InforState.getState();
    node.textContent = JSON.stringify({
      bloque:"Bloque 2 - Período, Regular/PVC y modalidades",
      generatedAt:new Date().toISOString(),
      periodId:snapshot.periodId,
      periodLabel:snapshot.periodLabel,
      periodType:snapshot.periodType,
      periodSummary:state.periodSummary,
      excel:snapshot.excel,
      cronogramas:{
        complexivo:!!text(snapshot.cronogramas && snapshot.cronogramas.complexivo),
        trabajoTitulacion:!!text(snapshot.cronogramas && snapshot.cronogramas.trabajoTitulacion),
        pvc:!!text(snapshot.cronogramas && snapshot.cronogramas.pvc)
      },
      anexos:state.anexos.map(function(x){return {name:x.name,title:x.title,size:x.size,type:x.type};}),
      gemini:snapshot.gemini,
      lastProcess:snapshot.lastProcess,
      diagnostics:snapshot.diagnostics
    }, null, 2);
  }

  function renderAll(message, cls){
    var snapshot = window.InforState.getState();
    renderByPeriod(snapshot);
    renderGemini();
    renderExcel(snapshot);
    renderCronogramas(snapshot);
    renderAnexos();
    renderDiagnostics();
    if(message){status(message, cls || "ok");}
  }

  function onPeriodChange(){
    var period = selectedPeriod();
    var id = periodIdOf(period);
    var label = periodLabelOf(period);
    if(!id){window.InforState.loadPeriod("", "");renderAll("Selecciona un período para iniciar.", "warn");return;}
    window.InforState.loadPeriod(id, label);
    renderAll("Período cargado: " + label + ".", "ok");
  }

  function onExcelChange(event){
    var file = event.target.files && event.target.files[0];
    if(!file){return;}
    window.InforState.setExcelInfo({fileName:file.name,size:file.size,type:file.type || "",loaded:true,sheetCount:0,ignoredSheets:0});
    renderAll("Excel registrado. La lectura inteligente se conectará en el bloque siguiente.", "ok");
  }

  function onCronogramaInput(kind, value){
    window.InforState.setCronograma(kind, value);
    renderDiagnostics();
  }

  function onAnexosChange(event){
    var files = Array.prototype.slice.call(event.target.files || []);
    var mapped = files.filter(function(file){return /^image\//.test(file.type || "");}).map(function(file){
      return {name:file.name,size:file.size,type:file.type,title:file.name,createdAt:new Date().toISOString(),preview:URL.createObjectURL(file)};
    });
    state.anexos = state.anexos.concat(mapped);
    saveAnexosToState();
    renderAnexos();
    renderDiagnostics();
    status(mapped.length ? "Anexos cargados: " + mapped.length + "." : "No se detectaron imágenes válidas.", mapped.length ? "ok" : "warn");
  }

  function openGemini(){
    var modal = el("infor-gemini-modal");
    if(modal){modal.classList.remove("is-hidden");}
    if(el("infor-gemini-key")){el("infor-gemini-key").value = window.InforState.getGeminiKey();el("infor-gemini-key").focus();}
  }

  function closeGemini(){var modal = el("infor-gemini-modal");if(modal){modal.classList.add("is-hidden");}}
  function saveGemini(){window.InforState.setGeminiKey(el("infor-gemini-key") ? el("infor-gemini-key").value : "");closeGemini();renderAll("Clave Gemini guardada localmente.", "ok");}
  function clearGemini(){window.InforState.setGeminiKey("");if(el("infor-gemini-key")){el("infor-gemini-key").value = "";}renderAll("Clave Gemini eliminada.", "warn");}

  function process(){
    var snapshot = window.InforState.getState();
    if(!text(snapshot.periodId || snapshot.periodLabel)){status("Primero selecciona un período.", "warn");return;}
    if(!window.InforState.getGeminiKey()){status("Proceso detenido: falta configurar la clave de Gemini.", "bad");renderDiagnostics();return;}
    window.InforState.processDraft();
    renderAll("Bloque 2 procesado: período, tipo y modalidad automática quedaron listos.", "ok");
  }

  function bindEvents(){
    bind("infor-periodo", "change", onPeriodChange);
    bind("infor-excel-file", "change", onExcelChange);
    bind("infor-cronograma-complexivo", "input", function(e){onCronogramaInput("complexivo", e.target.value);});
    bind("infor-cronograma-trabajo", "input", function(e){onCronogramaInput("trabajoTitulacion", e.target.value);});
    bind("infor-cronograma-pvc", "input", function(e){onCronogramaInput("pvc", e.target.value);});
    bind("infor-anexos-input", "change", onAnexosChange);
    bind("infor-anexos-list", "input", function(e){
      var index = e.target && e.target.getAttribute ? Number(e.target.getAttribute("data-title-index")) : -1;
      if(index >= 0 && state.anexos[index]){state.anexos[index].title = e.target.value;saveAnexosToState();renderDiagnostics();}
    });
    bind("infor-gemini-open", "click", openGemini);
    bind("infor-gemini-close", "click", closeGemini);
    bind("infor-gemini-save", "click", saveGemini);
    bind("infor-gemini-clear", "click", clearGemini);
    bind("infor-process", "click", process);
    bind("infor-gemini-modal", "click", function(e){if(e.target && e.target.id === "infor-gemini-modal"){closeGemini();}});
  }

  function boot(){
    try{
      fillPeriods();
      bindEvents();
      window.InforState.loadPeriod("", "");
      renderAll(state.periods.length ? "Infor listo. Selecciona un período." : "Infor listo, pero no encontré períodos cargados todavía.", state.periods.length ? "ok" : "warn");
      state.booted = true;
    }catch(error){
      console.error("[Infor boot]", error);
      status(error.message || String(error), "bad");
    }
  }

  if(document.readyState === "loading"){document.addEventListener("DOMContentLoaded", boot);}else{boot();}
  window.InforApp = {render:renderAll,getState:function(){return Object.assign({}, state);}};
})(window, document);
