/* =========================================================
Nombre completo: baselocal.app.js
Ruta o ubicación: /Requisitos/BaseLocal/baselocal.app.js
Función o funciones:
- Renderizar la pantalla BL.
- Mostrar períodos, estudiantes, historial y diagnóstico local.
- Ejecutar la bajada manual desde Firebase hacia la base local.
Con qué se conecta:
- baselocal.core.js
- baselocal.firebase.js
- baselocal.manual.js
========================================================= */
(function(window,document){
  "use strict";

  var state = {tab:"periodos", periodId:"", search:"", loading:false};

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

  function setBusy(isBusy, message){
    state.loading = !!isBusy;
    var btn = el("bl-btn-pull-firebase");
    if(btn){
      btn.disabled = !!isBusy;
      btn.textContent = isBusy ? "Bajando..." : "Bajar desde Firebase";
    }
    if(message){
      status(message, "bl-status-info");
    }
  }

  function table(headers, rows){
    if(!rows || !rows.length){
      return '<p class="bl-help">Sin datos todavía. Primero analiza un Excel en Requisito o baja los datos desde Firebase.</p>';
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
    el("bl-periodos-table").innerHTML = table([
      {label:"Período", key:"label"},
      {label:"ID", key:"id"},
      {label:"Actualizado", key:"updatedAt"}
    ], view.periods);
  }

  function renderStudents(view){
    var rows = view.students.slice(0, 300);
    el("bl-estudiantes-table").innerHTML = table([
      {label:"Cédula", key:"cedula"},
      {label:"Nombre", key:"nombres"},
      {label:"Carrera", key:"nombrecarrera"},
      {label:"Período", key:"periodoLabel"}
    ], rows);
  }

  function renderHistory(view){
    el("bl-history-table").innerHTML = table([
      {label:"Fecha", key:"createdAt"},
      {label:"Acción", value:function(row){return row.action || "análisis";}},
      {label:"Período", key:"periodoLabel"},
      {label:"Origen", key:"fileName"},
      {label:"Filas", key:"totalRows"}
    ], view.history);
  }

  function renderDiagnostics(view){
    var diagnostics = view.diagnostics || {};
    var firebaseStatus = window.BaseLocalFirebase && typeof window.BaseLocalFirebase.getLastStatus === "function"
      ? window.BaseLocalFirebase.getLastStatus()
      : {ok:false, mode:"sin_firebase"};

    el("bl-diagnostics-box").textContent = JSON.stringify({
      local:diagnostics,
      firebase:firebaseStatus
    }, null, 2);
  }

  function renderSelectors(view){
    var selector = el("bl-filter-period");
    if(!selector){
      return;
    }

    var current = state.periodId || selector.value;
    selector.innerHTML = '<option value="">Todos los períodos</option>' + view.periods.map(function(period){
      return '<option value="' + esc(period.id) + '">' + esc(period.label || period.id) + '</option>';
    }).join("");
    selector.value = current;
  }

  function render(){
    try{
      var view = window.BaseLocalAPI.buildView(state.periodId, state.search);
      var firebaseStatus = window.BaseLocalFirebase && typeof window.BaseLocalFirebase.getLastStatus === "function"
        ? window.BaseLocalFirebase.getLastStatus()
        : null;

      renderSelectors(view);
      el("bl-kpi-periodos").textContent = view.periods.length;
      el("bl-kpi-estudiantes").textContent = view.students.length;
      el("bl-kpi-historial").textContent = view.history.length;
      el("bl-kpi-carreras").textContent = view.careersCount;
      el("bl-kpi-estado").textContent = firebaseStatus && firebaseStatus.ok ? "Firebase" : "Local";

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
      console.error("[BaseLocal]", error);
      status(error.message || String(error), "bl-status-warn");
    }
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
    var data = window.BaseLocalAPI.getSnapshot();
    var blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
    var link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "baselocal-requisitos.json";
    link.click();
    setTimeout(function(){
      URL.revokeObjectURL(link.href);
    }, 1000);
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

      setBusy(true, "Bajando datos desde Firebase hacia la base local...");
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
      status(error.message || String(error), "bl-status-warn");
    }finally{
      setBusy(false);
    }
  }

  function boot(){
    if(window.ExcelLocalBridge){
      window.ExcelLocalBridge.ensureReady();
    }

    document.querySelectorAll(".bl-tabs button").forEach(function(button){
      button.addEventListener("click", function(){
        setTab(button.dataset.tab);
      });
    });

    if(el("bl-filter-period")){
      el("bl-filter-period").addEventListener("change", function(event){
        state.periodId = event.target.value;
        render();
      });
    }

    if(el("bl-filter-search")){
      el("bl-filter-search").addEventListener("input", function(event){
        state.search = event.target.value;
        render();
      });
    }

    if(el("bl-btn-refresh")){
      el("bl-btn-refresh").addEventListener("click", render);
    }
    if(el("bl-btn-pull-firebase")){
      el("bl-btn-pull-firebase").addEventListener("click", pullFromFirebase);
    }
    if(el("bl-btn-export")){
      el("bl-btn-export").addEventListener("click", exportJson);
    }
    if(el("bl-btn-copy-refs")){
      el("bl-btn-copy-refs").addEventListener("click", copyRefs);
    }

    render();
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})(window,document);