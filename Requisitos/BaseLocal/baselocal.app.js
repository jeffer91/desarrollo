/* =========================================================
Nombre completo: baselocal.app.js
Ruta o ubicación: /Requisitos/BaseLocal/baselocal.app.js
Función o funciones:
- Renderizar la pantalla Base Local.
- Mostrar períodos, estudiantes, historial y diagnóstico local.
- Aplicar filtro por estado de matrícula: ACTIVO, RETIRADO o todos.
- Permitir sincronización manual, bajada manual desde Firebase, limpieza de base y borrado seguro de período.
- Ejecutar sincronización diaria en segundo plano sin bloquear la vista.
- Evitar doble sincronización diaria cuando Maqueta ya controla Firebase en segundo plano.
- Evitar pantalla blanca por eventos repetidos durante la sincronización.
Con qué se conecta:
- services/bl-campos.js
- services/bl-normalizador.js
- services/bl-filtros.js
- services/bl-limpiar-base.service.js
- services/bl-borrar-periodo.service.js
- baselocal.core.js
- baselocal.firebase.js
- baselocal.connector.js
- baselocal.limpiar.js
- baselocal.borrar-periodo.js
- baselocal.manual.js
========================================================= */
(function(window,document){
  "use strict";

  var state = {tab:"periodos",periodId:"",search:"",statusFilter:"ACTIVO",loading:false,dailyStarted:false,renderPending:false,renderTimer:null,lastRenderError:null};

  function el(id){return document.getElementById(id);}
  function text(value){return String(value == null ? "" : value).trim();}
  function esc(value){return text(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;");}

  function getField(row, canonicalName, fallback){
    try{if(window.BLCampos && typeof window.BLCampos.getValue === "function"){var value = window.BLCampos.getValue(row || {}, canonicalName, fallback || "");return value == null || text(value) === "" ? (fallback || "") : value;}}catch(error){}
    return fallback || "";
  }

  function divisionOf(row){
    if(window.BLDivisionesService && typeof window.BLDivisionesService.studentDivision === "function") return window.BLDivisionesService.studentDivision(row);
    var list = Array.isArray(row && row.divisiones) ? row.divisiones : [];
    return list[0] || row.division || "Sin división";
  }

  function status(message, className){var box = el("bl-status");if(box){box.textContent = message;box.className = "bl-status " + (className || "bl-status-info");}}

  function safeCall(label, fn, fallback){
    try{return typeof fn === "function" ? fn() : fallback;}
    catch(error){console.warn("[BaseLocal " + label + "]", error);state.lastRenderError = error && error.message ? error.message : String(error);return fallback;}
  }

  function setBusy(isBusy, message, mode){
    state.loading = !!isBusy;
    var pullBtn = el("bl-btn-pull-firebase");
    var syncBtn = el("bl-btn-sync-now");
    var cleanBtn = el("bl-btn-clean-base");
    var deleteBtn = el("bl-btn-delete-period");
    if(pullBtn){pullBtn.disabled = !!isBusy;pullBtn.textContent = isBusy && mode === "pull" ? "Bajando..." : "Solo bajar Firebase";}
    if(syncBtn){syncBtn.disabled = !!isBusy;syncBtn.textContent = isBusy && mode === "sync" ? "Sincronizando..." : "Sincronizar ahora";}
    if(cleanBtn){cleanBtn.disabled = !!isBusy;cleanBtn.textContent = isBusy && mode === "clean" ? "Limpiando..." : "Limpiar base";}
    if(deleteBtn){deleteBtn.disabled = !!isBusy;deleteBtn.textContent = isBusy && mode === "delete" ? "Borrando..." : "Borrar período";}
    if(message){status(message, "bl-status-info");}
  }

  function table(headers, rows){
    if(!rows || !rows.length){return '<p class="bl-help">Sin datos todavía. Primero analiza un Excel en Carga, baja datos desde Firebase o sincroniza Base Local.</p>';}
    var head = '<table><thead><tr>' + headers.map(function(header){return '<th>' + esc(header.label) + '</th>';}).join("") + '</tr></thead><tbody>';
    head += rows.map(function(row){return '<tr>' + headers.map(function(header){var value = typeof header.value === "function" ? header.value(row) : row[header.key];return '<td>' + esc(value) + '</td>';}).join("") + '</tr>';}).join("");
    return head + '</tbody></table>';
  }

  function renderPeriods(view){
    var target = el("bl-periodos-table");if(!target) return;
    target.innerHTML = table([{label:"Período", key:"label"},{label:"ID", key:"id"},{label:"Actualizado", key:"updatedAt"}], view.periods || []);
  }

  function renderStudents(view){
    var target = el("bl-estudiantes-table");if(!target) return;
    var rows = (view.students || []).slice(0, 300);
    target.innerHTML = table([
      {label:"Cédula", value:function(row){return row.cedula || getField(row, "cedula", "");}},
      {label:"Nombre", value:function(row){return row.nombres || getField(row, "nombres", row.Nombres || "");}},
      {label:"Carrera", value:function(row){return row.nombrecarrera || getField(row, "nombreCarrera", row.NombreCarrera || "");}},
      {label:"División", value:function(row){return divisionOf(row);}},
      {label:"Sede", value:function(row){return getField(row, "sede", row.Sede || row.sede || "");}},
      {label:"Estado", value:function(row){return row.estadoMatricula || getField(row, "estadoMatricula", "ACTIVO");}},
      {label:"Período", value:function(row){return row.periodoLabel || row.periodoId || getField(row, "periodoId", "");}}
    ], rows);
  }

  function renderHistory(view){
    var target = el("bl-history-table");if(!target) return;
    target.innerHTML = table([{label:"Fecha", key:"createdAt"},{label:"Acción", value:function(row){return row.action || "análisis";}},{label:"Período", key:"periodoLabel"},{label:"Origen", key:"fileName"},{label:"Filas", key:"totalRows"}], view.history || []);
  }

  function renderDiagnostics(view){
    var box = el("bl-diagnostics-box");if(!box) return;
    var diagnostics = view.diagnostics || {};
    var firebaseStatus = safeCall("firebaseStatus", function(){return window.BaseLocalFirebase && typeof window.BaseLocalFirebase.getLastStatus === "function" ? window.BaseLocalFirebase.getLastStatus() : {ok:false, mode:"sin_firebase"};}, {ok:false, mode:"sin_firebase"});
    var syncStatus = safeCall("syncStatus", function(){return window.BaseLocalFirebase && typeof window.BaseLocalFirebase.getSyncStatus === "function" ? window.BaseLocalFirebase.getSyncStatus() : {ok:false, mode:"sin_sync"};}, {ok:false, mode:"sin_sync"});
    var bridgeCounts = safeCall("bridgeCounts", function(){return window.BaseLocalBridge && typeof window.BaseLocalBridge.counts === "function" ? window.BaseLocalBridge.counts() : null;}, null);
    var cleanLogs = safeCall("cleanLogs", function(){return window.BLLimpiarBaseService && typeof window.BLLimpiarBaseService.getLogs === "function" ? window.BLLimpiarBaseService.getLogs().slice(0,3) : [];}, []);
    box.textContent = JSON.stringify({local:diagnostics,vista:{periodoId:state.periodId,estadoMatricula:state.statusFilter,busqueda:state.search,estudiantesVisibles:(view.students || []).length,estudiantesDelPeriodo:view.totalStudentsPeriod || 0,conteoEstados:view.statusCounts || {}},firebase:firebaseStatus,sync:syncStatus,bridge:bridgeCounts,limpiezaBase:cleanLogs,ultimoErrorVista:state.lastRenderError || ""}, null, 2);
  }

  function renderSelectors(view){
    var selector = el("bl-filter-period");
    if(selector){var current = state.periodId || selector.value;selector.innerHTML = '<option value="">Todos los períodos</option>' + (view.periods || []).map(function(period){return '<option value="' + esc(period.id) + '">' + esc(period.label || period.id) + '</option>';}).join("");selector.value = current;}
    var estado = el("bl-filter-estado");if(estado){estado.value = state.statusFilter;}
  }

  function emptyView(message){return {periods:[],students:[],allStudentsForPeriod:[],statusCounts:{ACTIVO:0, RETIRADO:0, TOTAL:0},totalStudentsPeriod:0,history:[{createdAt:new Date().toISOString(), action:"error", periodoLabel:"Base Local", fileName:message || "Error", totalRows:0}],diagnostics:{ok:false, error:message || "Base Local no disponible"},careersCount:0,snapshot:null};}

  function render(){
    state.renderPending = false;
    try{
      if(!window.BaseLocalAPI || typeof window.BaseLocalAPI.buildView !== "function"){throw new Error("BaseLocalAPI no está disponible. Revisa que baselocal.core.js haya cargado correctamente.");}
      var view = window.BaseLocalAPI.buildView(state.periodId, state.search, state.statusFilter);
      var firebaseStatus = safeCall("firebaseStatus", function(){return window.BaseLocalFirebase && typeof window.BaseLocalFirebase.getLastStatus === "function" ? window.BaseLocalFirebase.getLastStatus() : null;}, null);
      var syncStatus = safeCall("syncStatus", function(){return window.BaseLocalFirebase && typeof window.BaseLocalFirebase.getSyncStatus === "function" ? window.BaseLocalFirebase.getSyncStatus() : null;}, null);
      var counts = view.statusCounts || {ACTIVO:0, RETIRADO:0, TOTAL:0};
      renderSelectors(view);
      if(el("bl-kpi-periodos")) el("bl-kpi-periodos").textContent = (view.periods || []).length;
      if(el("bl-kpi-estudiantes")) el("bl-kpi-estudiantes").textContent = view.totalStudentsPeriod || counts.TOTAL || 0;
      if(el("bl-kpi-activos")) el("bl-kpi-activos").textContent = counts.ACTIVO || 0;
      if(el("bl-kpi-retirados")) el("bl-kpi-retirados").textContent = counts.RETIRADO || 0;
      if(el("bl-kpi-historial")) el("bl-kpi-historial").textContent = (view.history || []).length;
      if(el("bl-kpi-carreras")) el("bl-kpi-carreras").textContent = view.careersCount || 0;
      if(el("bl-kpi-estado")) el("bl-kpi-estado").textContent = syncStatus && syncStatus.ok ? "Sincronizada" : (firebaseStatus && firebaseStatus.ok ? "Firebase" : "Local");
      renderPeriods(view);renderStudents(view);renderHistory(view);renderDiagnostics(view);
      var manual = el("bl-manual-text");if(manual && window.BaseLocalManual){manual.value = window.BaseLocalManual.getManual();}
      if(!state.loading){status("Base Local cargada correctamente. Vista actual: " + ((view.students || []).length) + " estudiantes.", "bl-status-ok");}
    }catch(error){
      console.error("[BaseLocal Render]", error);state.lastRenderError = error.message || String(error);
      var fallback = emptyView(state.lastRenderError);renderSelectors(fallback);renderPeriods(fallback);renderStudents(fallback);renderHistory(fallback);renderDiagnostics(fallback);
      status("Base Local no se cayó. Error controlado: " + state.lastRenderError, "bl-status-warn");
    }
  }

  function scheduleRender(reason){if(state.renderTimer){clearTimeout(state.renderTimer);}state.renderPending = true;state.renderTimer = setTimeout(function(){state.renderTimer = null;render(reason || "programado");}, 180);}
  function setTab(tab){state.tab = tab;document.querySelectorAll(".bl-tabs button").forEach(function(button){button.classList.toggle("is-active", button.dataset.tab === tab);});document.querySelectorAll(".bl-panel").forEach(function(panel){panel.classList.toggle("is-active", panel.id === "bl-tab-" + tab);});}

  function exportJson(){
    try{var data = window.BaseLocalAPI.getSnapshot();var blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});var link = document.createElement("a");link.href = URL.createObjectURL(blob);link.download = "carga-base-local.json";link.click();setTimeout(function(){URL.revokeObjectURL(link.href);}, 1000);}
    catch(error){status("No se pudo exportar Base Local: " + (error.message || error), "bl-status-warn");}
  }

  function copyRefs(){
    var content = window.BaseLocalManual ? window.BaseLocalManual.getManual() : "";
    if(navigator.clipboard && navigator.clipboard.writeText){navigator.clipboard.writeText(content).then(function(){status("Referencias copiadas.", "bl-status-ok");}).catch(function(){var manual = el("bl-manual-text");if(manual){manual.focus();manual.select();}status("Copia manualmente desde la pestaña Manual.", "bl-status-warn");});return;}
    var manualFallback = el("bl-manual-text");if(manualFallback){manualFallback.focus();manualFallback.select();}status("Copia manualmente desde la pestaña Manual.", "bl-status-warn");
  }

  async function pullFromFirebase(){
    if(state.loading){return;}
    try{
      if(!window.BaseLocalFirebase || typeof window.BaseLocalFirebase.pull !== "function"){throw new Error("BaseLocalFirebase no está disponible.");}
      setBusy(true, "Bajando datos desde Firebase hacia la base local...", "pull");
      var result = await window.BaseLocalFirebase.pull();
      state.periodId = "";state.search = "";state.statusFilter = "ACTIVO";
      if(el("bl-filter-search")){el("bl-filter-search").value = "";}if(el("bl-filter-estado")){el("bl-filter-estado").value = "ACTIVO";}
      if(window.RequisitosBL && typeof window.RequisitosBL.rebuildSnapshotToCollections === "function"){window.RequisitosBL.rebuildSnapshotToCollections({force:true});}
      if(window.BaseLocalAPI && typeof window.BaseLocalAPI.clearSnapshotCache === "function"){window.BaseLocalAPI.clearSnapshotCache();}
      render();
      status("Datos bajados correctamente desde Firebase. Estudiantes: " + (result.totalStudents || 0) + ". Períodos: " + (result.totalPeriods || 0) + ".", "bl-status-ok");
    }catch(error){console.error("[BaseLocal Firebase Pull]", error);status("Base Local sigue activa. Error al bajar Firebase: " + (error.message || String(error)), "bl-status-warn");}
    finally{setBusy(false);}
  }

  async function syncNow(mode){
    if(state.loading){return;}
    try{
      if(!window.BaseLocalFirebase || typeof window.BaseLocalFirebase.sync !== "function"){throw new Error("BaseLocalFirebase.sync no está disponible.");}
      setBusy(true, "Sincronizando Base Local con Firebase...", "sync");
      var result = await window.BaseLocalFirebase.sync({mode:mode || "manual"});
      if(window.RequisitosBL && typeof window.RequisitosBL.rebuildSnapshotToCollections === "function"){window.RequisitosBL.rebuildSnapshotToCollections({force:true});}
      if(window.BaseLocalAPI && typeof window.BaseLocalAPI.clearSnapshotCache === "function"){window.BaseLocalAPI.clearSnapshotCache();}
      render();
      if(result && result.ok){status(result.message || "Sincronización finalizada correctamente.", "bl-status-ok");}
      else{status((result && result.message) || "No se pudo sincronizar. Base Local sigue funcionando.", "bl-status-warn");}
    }catch(error){console.error("[BaseLocal Sync]", error);status("Base Local sigue activa. Error de sincronización: " + (error.message || String(error)), "bl-status-warn");}
    finally{setBusy(false);}
  }

  async function limpiarBase(){
    if(state.loading){return;}
    try{
      if(!window.BaseLocalLimpiar || typeof window.BaseLocalLimpiar.ejecutar !== "function"){throw new Error("BaseLocalLimpiar no está disponible.");}
      setBusy(true, "Limpiando Firebase y reconstruyendo Base Local...", "clean");
      var result = await window.BaseLocalLimpiar.ejecutar();
      state.periodId = "";state.search = "";state.statusFilter = "ACTIVO";
      if(el("bl-filter-search")){el("bl-filter-search").value = "";}if(el("bl-filter-estado")){el("bl-filter-estado").value = "ACTIVO";}
      if(window.BaseLocalAPI && typeof window.BaseLocalAPI.clearSnapshotCache === "function"){window.BaseLocalAPI.clearSnapshotCache();}
      render();
      status((result && result.mensaje) || "Firebase y Base Local reparados.", result && result.errores && result.errores.length ? "bl-status-warn" : "bl-status-ok");
    }catch(error){console.error("[BaseLocal Limpiar]", error);status("Base Local sigue activa. Error al limpiar base: " + (error.message || String(error)), "bl-status-warn");}
    finally{setBusy(false);}
  }

  function parentOwnsDailySync(){
    try{return !!(window.parent && window.parent !== window && window.parent.MAQ_BASELOCAL_BACKGROUND_SYNC);}
    catch(error){return false;}
  }

  function runDailySync(){
    if(parentOwnsDailySync()){state.dailyStarted = true;return;}
    if(state.dailyStarted){return;}state.dailyStarted = true;
    setTimeout(async function(){
      try{
        if(!window.BaseLocalFirebase || typeof window.BaseLocalFirebase.runDailyIfNeeded !== "function"){return;}
        var result = await window.BaseLocalFirebase.runDailyIfNeeded(false, {mode:"daily_from_bl", background:true});
        if(result && result.ok){
          if(window.RequisitosBL && typeof window.RequisitosBL.mirrorSnapshotToCollections === "function"){window.RequisitosBL.mirrorSnapshotToCollections({silent:true});}
          if(window.BaseLocalAPI && typeof window.BaseLocalAPI.clearSnapshotCache === "function"){window.BaseLocalAPI.clearSnapshotCache();}
          render();
          status(result.message || "Sincronización diaria completada en segundo plano.", "bl-status-ok");
        }else if(result && result.skipped){
          return;
        }else if(result && result.message){
          status("Base Local activa. Firebase queda pendiente: " + result.message, "bl-status-warn");
        }
      }catch(error){
        console.warn("[BaseLocal Daily Sync]", error);
        status("Base Local activa. Firebase queda pendiente: " + (error.message || error), "bl-status-warn");
      }
    }, 2200);
  }

  function bindGlobalErrors(){
    window.addEventListener("error", function(event){var msg = event && event.message ? event.message : "Error de pantalla Base Local";console.error("[BaseLocal Global Error]", event.error || event);state.lastRenderError = msg;status("Base Local protegida. Error controlado: " + msg, "bl-status-warn");});
    window.addEventListener("unhandledrejection", function(event){var reason = event && event.reason ? event.reason : "Promesa rechazada";var msg = reason && reason.message ? reason.message : String(reason);console.error("[BaseLocal Promise Error]", reason);state.lastRenderError = msg;status("Base Local protegida. Error de sincronización controlado: " + msg, "bl-status-warn");});
  }

  function bindCrossWindowEvents(){
    window.addEventListener("storage", function(event){if(event.key === "REQ_BL_SIGNAL_V1"){scheduleRender("storage");}});
    window.addEventListener("message", function(event){var data = event.data || {};var type = String(data.type || "");if(type.indexOf("requisitos:bl:") === 0){scheduleRender(type);}});
    ["requisitos:bl:changed","requisitos:bl:snapshot-changed","requisitos:bl:sync-complete","baselocal:sync-complete","baselocal:firebase-pull-finished","requisitos:bl:mirror-complete","requisitos:bl:limpieza-complete","requisitos:bl:periodo-borrado","baselocal:periodo-borrado","requisitos:bl:periodo-borrado-historial-purgado"].forEach(function(name){window.addEventListener(name, function(){scheduleRender(name);});});
  }

  window.BaseLocalApp = {render:render,scheduleRender:scheduleRender,status:status,setBusy:setBusy,getState:function(){return Object.assign({}, state);}};

  function boot(){
    bindGlobalErrors();
    safeCall("ExcelLocalBridge.ensureReady", function(){if(window.ExcelLocalBridge && typeof window.ExcelLocalBridge.ensureReady === "function"){window.ExcelLocalBridge.ensureReady();}}, null);
    document.querySelectorAll(".bl-tabs button").forEach(function(button){button.addEventListener("click", function(){setTab(button.dataset.tab);});});
    if(el("bl-filter-period")){el("bl-filter-period").addEventListener("change", function(event){state.periodId = event.target.value;scheduleRender("period-filter");});}
    if(el("bl-filter-estado")){el("bl-filter-estado").addEventListener("change", function(event){state.statusFilter = event.target.value;scheduleRender("estado-filter");});}
    if(el("bl-filter-search")){el("bl-filter-search").addEventListener("input", function(event){state.search = event.target.value;scheduleRender("search");});}
    if(el("bl-btn-refresh")){el("bl-btn-refresh").addEventListener("click", render);}
    if(el("bl-btn-pull-firebase")){el("bl-btn-pull-firebase").addEventListener("click", pullFromFirebase);}
    if(el("bl-btn-sync-now")){el("bl-btn-sync-now").addEventListener("click", function(){syncNow("manual");});}
    if(el("bl-btn-clean-base")){el("bl-btn-clean-base").addEventListener("click", limpiarBase);}
    if(el("bl-btn-export")){el("bl-btn-export").addEventListener("click", exportJson);}
    if(el("bl-btn-copy-refs")){el("bl-btn-copy-refs").addEventListener("click", copyRefs);}
    bindCrossWindowEvents();render();
    try{window.dispatchEvent(new CustomEvent("bl:ready", {detail:{module:"BaseLocal", ready:true, at:new Date().toISOString()}}));if(window.parent && window.parent !== window){window.parent.postMessage({type:"requisitos:bl:ready", payload:{module:"BaseLocal", ready:true, at:new Date().toISOString()}}, "*");}}catch(error){}
    runDailySync();
  }

  if(document.readyState === "loading"){document.addEventListener("DOMContentLoaded", boot);}else{boot();}
})(window,document);