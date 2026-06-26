/* =========================================================
Nombre completo: baselocal.app.js
Ruta o ubicación: /Requisitos/BaseLocal/baselocal.app.js
Función o funciones:
- Renderizar la pantalla BL.
- Mostrar períodos, estudiantes, historial y diagnóstico local.
- Ejecutar sincronización Base Local ↔ Firebase una vez al día sin bloquear la pantalla.
- Permitir sincronización manual y bajada manual desde Firebase.
- Evitar pantalla blanca por eventos repetidos durante la sincronización.
Con qué se conecta:
- baselocal.core.js
- baselocal.firebase.js
- baselocal.connector.js
- baselocal.manual.js
========================================================= */
(function(window,document){
  "use strict";

  var state = {
    tab:"periodos",
    periodId:"",
    search:"",
    loading:false,
    dailyStarted:false,
    renderPending:false,
    renderTimer:null,
    lastRenderError:null
  };

  function el(id){
    return document.getElementById(id);
  }

  function text(value){
    return String(value == null ? "" : value).trim();
  }

  function esc(value){
    return text(value)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/\"/g,"&quot;");
  }

  function status(message, className){
    var box = el("bl-status");
    if(box){
      box.textContent = message;
      box.className = "bl-status " + (className || "bl-status-info");
    }
  }

  function safeCall(label, fn, fallback){
    try{
      return typeof fn === "function" ? fn() : fallback;
    }catch(error){
      console.warn("[BaseLocal " + label + "]", error);
      state.lastRenderError = error && error.message ? error.message : String(error);
      return fallback;
    }
  }

  function setBusy(isBusy, message, mode){
    state.loading = !!isBusy;
    var pullBtn = el("bl-btn-pull-firebase");
    var syncBtn = el("bl-btn-sync-now");

    if(pullBtn){
      pullBtn.disabled = !!isBusy;
      pullBtn.textContent = isBusy && mode === "pull" ? "Bajando..." : "Solo bajar Firebase";
    }

    if(syncBtn){
      syncBtn.disabled = !!isBusy;
      syncBtn.textContent = isBusy && mode === "sync" ? "Sincronizando..." : "Sincronizar ahora";
    }

    if(message){
      status(message, "bl-status-info");
    }
  }

  function table(headers, rows){
    if(!rows || !rows.length){
      return '<p class="bl-help">Sin datos todavía. Primero analiza un Excel en Requisito, baja datos desde Firebase o sincroniza BL.</p>';
    }

    var head = '<table><thead><tr>' + headers.map(function(header){
      return '<th>' + esc(header.label) + '</th>';
    }).join("") + '</tr></thead><tbody>';

    head += rows.map(function(row){
      return '<tr>' + headers.map(function(header){
        var value = typeof header.value === "function" ? header.value(row) : row[header.key];
        return '<td>' + esc(value) + '</td>';
      }).join("") + '</tr>';
    }).join("");

    return head + '</tbody></table>';
  }

  function renderPeriods(view){
    var target = el("bl-periodos-table");
    if(!target) return;
    target.innerHTML = table([
      {label:"Período", key:"label"},
      {label:"ID", key:"id"},
      {label:"Actualizado", key:"updatedAt"}
    ], view.periods || []);
  }

  function renderStudents(view){
    var target = el("bl-estudiantes-table");
    if(!target) return;
    var rows = (view.students || []).slice(0, 300);
    target.innerHTML = table([
      {label:"Cédula", key:"cedula"},
      {label:"Nombre", key:"nombres"},
      {label:"Carrera", key:"nombrecarrera"},
      {label:"Período", key:"periodoLabel"}
    ], rows);
  }

  function renderHistory(view){
    var target = el("bl-history-table");
    if(!target) return;
    target.innerHTML = table([
      {label:"Fecha", key:"createdAt"},
      {label:"Acción", value:function(row){return row.action || "análisis";}},
      {label:"Período", key:"periodoLabel"},
      {label:"Origen", key:"fileName"},
      {label:"Filas", key:"totalRows"}
    ], view.history || []);
  }

  function renderDiagnostics(view){
    var box = el("bl-diagnostics-box");
    if(!box) return;

    var diagnostics = view.diagnostics || {};
    var firebaseStatus = safeCall("firebaseStatus", function(){
      return window.BaseLocalFirebase && typeof window.BaseLocalFirebase.getLastStatus === "function"
        ? window.BaseLocalFirebase.getLastStatus()
        : {ok:false, mode:"sin_firebase"};
    }, {ok:false, mode:"sin_firebase"});
    var syncStatus = safeCall("syncStatus", function(){
      return window.BaseLocalFirebase && typeof window.BaseLocalFirebase.getSyncStatus === "function"
        ? window.BaseLocalFirebase.getSyncStatus()
        : {ok:false, mode:"sin_sync"};
    }, {ok:false, mode:"sin_sync"});
    var bridgeCounts = safeCall("bridgeCounts", function(){
      return window.BaseLocalBridge && typeof window.BaseLocalBridge.counts === "function"
        ? window.BaseLocalBridge.counts()
        : null;
    }, null);

    box.textContent = JSON.stringify({
      local:diagnostics,
      firebase:firebaseStatus,
      sync:syncStatus,
      bridge:bridgeCounts,
      ultimoErrorVista:state.lastRenderError || ""
    }, null, 2);
  }

  function renderSelectors(view){
    var selector = el("bl-filter-period");
    if(!selector){
      return;
    }

    var current = state.periodId || selector.value;
    selector.innerHTML = '<option value="">Todos los períodos</option>' + (view.periods || []).map(function(period){
      return '<option value="' + esc(period.id) + '">' + esc(period.label || period.id) + '</option>';
    }).join("");
    selector.value = current;
  }

  function emptyView(message){
    return {
      periods:[],
      students:[],
      history:[{createdAt:new Date().toISOString(), action:"error", periodoLabel:"BL", fileName:message || "Error", totalRows:0}],
      diagnostics:{ok:false, error:message || "BaseLocal no disponible"},
      careersCount:0,
      snapshot:null
    };
  }

  function render(){
    state.renderPending = false;
    try{
      if(!window.BaseLocalAPI || typeof window.BaseLocalAPI.buildView !== "function"){
        throw new Error("BaseLocalAPI no está disponible. Revisa que baselocal.core.js haya cargado correctamente.");
      }

      var view = window.BaseLocalAPI.buildView(state.periodId, state.search);
      var firebaseStatus = safeCall("firebaseStatus", function(){
        return window.BaseLocalFirebase && typeof window.BaseLocalFirebase.getLastStatus === "function"
          ? window.BaseLocalFirebase.getLastStatus()
          : null;
      }, null);
      var syncStatus = safeCall("syncStatus", function(){
        return window.BaseLocalFirebase && typeof window.BaseLocalFirebase.getSyncStatus === "function"
          ? window.BaseLocalFirebase.getSyncStatus()
          : null;
      }, null);

      renderSelectors(view);
      if(el("bl-kpi-periodos")) el("bl-kpi-periodos").textContent = (view.periods || []).length;
      if(el("bl-kpi-estudiantes")) el("bl-kpi-estudiantes").textContent = (view.students || []).length;
      if(el("bl-kpi-historial")) el("bl-kpi-historial").textContent = (view.history || []).length;
      if(el("bl-kpi-carreras")) el("bl-kpi-carreras").textContent = view.careersCount || 0;
      if(el("bl-kpi-estado")) el("bl-kpi-estado").textContent = syncStatus && syncStatus.ok ? "Sincronizada" : (firebaseStatus && firebaseStatus.ok ? "Firebase" : "Local");

      renderPeriods(view);
      renderStudents(view);
      renderHistory(view);
      renderDiagnostics(view);

      var manual = el("bl-manual-text");
      if(manual && window.BaseLocalManual){
        manual.value = window.BaseLocalManual.getManual();
      }

      if(!state.loading){
        status("BaseLocal cargada correctamente.", "bl-status-ok");
      }
    }catch(error){
      console.error("[BaseLocal Render]", error);
      state.lastRenderError = error.message || String(error);
      var fallback = emptyView(state.lastRenderError);
      renderSelectors(fallback);
      renderPeriods(fallback);
      renderStudents(fallback);
      renderHistory(fallback);
      renderDiagnostics(fallback);
      status("BL no se cayó. Error controlado: " + state.lastRenderError, "bl-status-warn");
    }
  }

  function scheduleRender(reason){
    if(state.renderTimer){
      clearTimeout(state.renderTimer);
    }
    state.renderPending = true;
    state.renderTimer = setTimeout(function(){
      state.renderTimer = null;
      render(reason || "programado");
    }, 180);
  }

  function setTab(tab){
    state.tab = tab;
    document.querySelectorAll(".bl-tabs button").forEach(function(button){
      button.classList.toggle("is-active", button.dataset.tab === tab);
    });
    document.querySelectorAll(".bl-panel").forEach(function(panel){
      panel.classList.toggle("is-active", panel.id === "bl-tab-" + tab);
    });
  }

  function exportJson(){
    try{
      var data = window.BaseLocalAPI.getSnapshot();
      var blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
      var link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "baselocal-requisitos.json";
      link.click();
      setTimeout(function(){
        URL.revokeObjectURL(link.href);
      }, 1000);
    }catch(error){
      status("No se pudo exportar BL: " + (error.message || error), "bl-status-warn");
    }
  }

  function copyRefs(){
    var content = window.BaseLocalManual ? window.BaseLocalManual.getManual() : "";

    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(content).then(function(){
        status("Referencias copiadas.", "bl-status-ok");
      }).catch(function(){
        var manual = el("bl-manual-text");
        if(manual){
          manual.focus();
          manual.select();
        }
        status("Copia manualmente desde la pestaña Manual.", "bl-status-warn");
      });
      return;
    }

    var manualFallback = el("bl-manual-text");
    if(manualFallback){
      manualFallback.focus();
      manualFallback.select();
    }
    status("Copia manualmente desde la pestaña Manual.", "bl-status-warn");
  }

  async function pullFromFirebase(){
    if(state.loading){
      return;
    }

    try{
      if(!window.BaseLocalFirebase || typeof window.BaseLocalFirebase.pull !== "function"){
        throw new Error("BaseLocalFirebase no está disponible.");
      }

      setBusy(true, "Bajando datos desde Firebase hacia la base local...", "pull");
      var result = await window.BaseLocalFirebase.pull();

      state.periodId = "";
      state.search = "";
      if(el("bl-filter-search")){
        el("bl-filter-search").value = "";
      }

      render();
      status(
        "Datos bajados correctamente desde Firebase. Estudiantes: " + (result.totalStudents || 0) + ". Períodos: " + (result.totalPeriods || 0) + ".",
        "bl-status-ok"
      );
    }catch(error){
      console.error("[BaseLocal Firebase Pull]", error);
      status("Base Local sigue activa. Error al bajar Firebase: " + (error.message || String(error)), "bl-status-warn");
    }finally{
      setBusy(false);
    }
  }

  async function syncNow(mode){
    if(state.loading){
      return;
    }

    try{
      if(!window.BaseLocalFirebase || typeof window.BaseLocalFirebase.sync !== "function"){
        throw new Error("BaseLocalFirebase.sync no está disponible.");
      }

      setBusy(true, "Sincronizando Base Local con Firebase...", "sync");
      var result = await window.BaseLocalFirebase.sync({mode:mode || "manual"});
      render();

      if(result && result.ok){
        status(result.message || "Sincronización finalizada correctamente.", "bl-status-ok");
      }else{
        status((result && result.message) || "No se pudo sincronizar. Base Local sigue funcionando.", "bl-status-warn");
      }
    }catch(error){
      console.error("[BaseLocal Sync]", error);
      status("Base Local sigue activa. Error de sincronización: " + (error.message || String(error)), "bl-status-warn");
    }finally{
      setBusy(false);
    }
  }

  function runDailySync(){
    if(state.dailyStarted){
      return;
    }

    state.dailyStarted = true;

    setTimeout(async function(){
      try{
        if(!window.BaseLocalFirebase || typeof window.BaseLocalFirebase.runDailyIfNeeded !== "function"){
          return;
        }
        setBusy(true, "Revisando sincronización diaria BL ↔ Firebase...", "sync");
        var result = await window.BaseLocalFirebase.runDailyIfNeeded();
        render();
        if(result && result.skipped){
          status(result.message || "La sincronización diaria ya estaba hecha.", "bl-status-ok");
        }else if(result && result.ok){
          status(result.message || "Sincronización diaria completada.", "bl-status-ok");
        }else if(result && result.message){
          status(result.message, "bl-status-warn");
        }
      }catch(error){
        console.warn("[BaseLocal Daily Sync]", error);
        status("Base Local queda activa. Sincronización diaria pendiente: " + (error.message || error), "bl-status-warn");
      }finally{
        setBusy(false);
      }
    }, 1600);
  }

  function bindGlobalErrors(){
    window.addEventListener("error", function(event){
      var msg = event && event.message ? event.message : "Error de pantalla BL";
      console.error("[BaseLocal Global Error]", event.error || event);
      state.lastRenderError = msg;
      status("BL protegida. Error controlado: " + msg, "bl-status-warn");
    });

    window.addEventListener("unhandledrejection", function(event){
      var reason = event && event.reason ? event.reason : "Promesa rechazada";
      var msg = reason && reason.message ? reason.message : String(reason);
      console.error("[BaseLocal Promise Error]", reason);
      state.lastRenderError = msg;
      status("BL protegida. Error de sincronización controlado: " + msg, "bl-status-warn");
    });
  }

  function bindCrossWindowEvents(){
    window.addEventListener("storage", function(event){
      if(event.key === "REQ_BL_SIGNAL_V1"){
        scheduleRender("storage");
      }
    });

    window.addEventListener("message", function(event){
      var data = event.data || {};
      var type = String(data.type || "");
      if(type.indexOf("requisitos:bl:") === 0){
        scheduleRender(type);
      }
    });

    ["requisitos:bl:changed", "requisitos:bl:snapshot-changed", "requisitos:bl:sync-complete", "baselocal:sync-complete", "baselocal:firebase-pull-finished", "requisitos:bl:mirror-complete"].forEach(function(name){
      window.addEventListener(name, function(){
        scheduleRender(name);
      });
    });
  }

  function boot(){
    bindGlobalErrors();

    safeCall("ExcelLocalBridge.ensureReady", function(){
      if(window.ExcelLocalBridge && typeof window.ExcelLocalBridge.ensureReady === "function"){
        window.ExcelLocalBridge.ensureReady();
      }
    }, null);

    document.querySelectorAll(".bl-tabs button").forEach(function(button){
      button.addEventListener("click", function(){
        setTab(button.dataset.tab);
      });
    });

    if(el("bl-filter-period")){
      el("bl-filter-period").addEventListener("change", function(event){
        state.periodId = event.target.value;
        scheduleRender("period-filter");
      });
    }

    if(el("bl-filter-search")){
      el("bl-filter-search").addEventListener("input", function(event){
        state.search = event.target.value;
        scheduleRender("search");
      });
    }

    if(el("bl-btn-refresh")){
      el("bl-btn-refresh").addEventListener("click", render);
    }
    if(el("bl-btn-pull-firebase")){
      el("bl-btn-pull-firebase").addEventListener("click", pullFromFirebase);
    }
    if(el("bl-btn-sync-now")){
      el("bl-btn-sync-now").addEventListener("click", function(){
        syncNow("manual");
      });
    }
    if(el("bl-btn-export")){
      el("bl-btn-export").addEventListener("click", exportJson);
    }
    if(el("bl-btn-copy-refs")){
      el("bl-btn-copy-refs").addEventListener("click", copyRefs);
    }

    bindCrossWindowEvents();
    render();

    try{
      window.dispatchEvent(new CustomEvent("bl:ready", {detail:{module:"BaseLocal", ready:true, at:new Date().toISOString()}}));
      if(window.parent && window.parent !== window){
        window.parent.postMessage({type:"requisitos:bl:ready", payload:{module:"BaseLocal", ready:true, at:new Date().toISOString()}}, "*");
      }
    }catch(error){}

    runDailySync();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})(window,document);
