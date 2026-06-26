/* =========================================================
Nombre completo: defart.app.js
Ruta o ubicación: /Requisitos/defart/defart.app.js
Función o funciones:
- Renderizar tabla inteligente de Defensas.
- Manejar filtros por período, carrera, estado, sede y búsqueda.
- Editar N-ART y N-DEF directamente en tabla.
- Guardado automático y botón Guardar todo con barra pequeña de progreso.
- Ordenar al hacer clic en encabezados.
- Descargar Excel visible.
Con qué se conecta:
- defart.core.js
- defart.export.js
========================================================= */
(function(window, document){
  "use strict";

  var state = {
    periodId:"",
    career:"",
    status:"",
    sede:"",
    search:"",
    sortKey:"_nombre",
    sortDir:"asc",
    data:null,
    changes:{},
    autoTimer:null,
    rendering:false
  };

  var HEADERS = [
    {key:"_cedula", label:"Cédula", className:"col-cedula"},
    {key:"_nombre", label:"Nombre", className:"col-nombre"},
    {key:"_carrera", label:"Carrera", className:"col-carrera"},
    {key:"_nart", label:"N-ART", className:"col-nota"},
    {key:"_ndef", label:"N-DEF", className:"col-nota"},
    {key:"_nfin", label:"N-FIN", className:"col-nota"}
  ];

  function el(id){
    return document.getElementById(id);
  }

  function text(value){
    return String(value == null ? "" : value).trim();
  }

  function esc(value){
    return text(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function status(message, type){
    var box = el("def-status");
    if(box){
      box.textContent = message;
      box.className = "def-status " + (type || "");
    }
  }

  function saveState(message){
    var box = el("def-save-state");
    if(box){
      box.textContent = message || "Listo";
    }
  }

  function setProgress(percent, message){
    var bar = el("def-progress-bar");
    var txt = el("def-progress-text");
    if(bar){
      bar.style.width = Math.max(0, Math.min(100, percent || 0)) + "%";
    }
    if(txt){
      txt.textContent = message || "";
    }
  }

  function noteText(value){
    if(window.DefartCore && typeof window.DefartCore.noteToText === "function"){
      return window.DefartCore.noteToText(value);
    }
    return value == null ? "" : String(value);
  }

  function option(value, label, selected){
    return '<option value="' + esc(value) + '" ' + (selected ? "selected" : "") + '>' + esc(label) + '</option>';
  }

  function fillFilters(data){
    data = data || {};
    var periodo = el("def-filter-periodo");
    var carrera = el("def-filter-carrera");
    var sede = el("def-filter-sede");

    if(periodo){
      periodo.innerHTML = option("", "Todos", !state.periodId) + (data.periodList || []).map(function(item){
        return option(item.id, item.label || item.id, state.periodId === item.id);
      }).join("");
    }

    if(carrera){
      carrera.innerHTML = option("", "Todas", !state.career) + (data.careerList || []).map(function(item){
        return option(item, item, state.career === item);
      }).join("");
    }

    if(sede){
      sede.innerHTML = option("", "Todas", !state.sede) + (data.sedeList || []).map(function(item){
        return option(item, item, state.sede === item);
      }).join("");
    }
  }

  function kpi(id, value){
    var box = el(id);
    if(box){
      box.textContent = value || 0;
    }
  }

  function renderKpis(data){
    var k = data.kpis || {};
    kpi("def-kpi-total", k.total);
    kpi("def-kpi-sin-req", k["Sin requisitos"]);
    kpi("def-kpi-pend-art", k["Pendiente Art"]);
    kpi("def-kpi-sup-art", k["Supletorio Art"]);
    kpi("def-kpi-pend-def", k["Pendiente Def"]);
    kpi("def-kpi-sup-def", k["Supletorio Def"]);
    kpi("def-kpi-completo", k["Completo"]);
  }

  function stateClass(row){
    var value = row._estadoDefensa;
    if(value === "Completo") return "estado-completo";
    if(value === "Sin requisitos") return "estado-sin-requisitos";
    if(value === "Supletorio Art" || value === "Supletorio Def") return "estado-supletorio";
    return "estado-pendiente";
  }

  function statePill(row){
    return '<span class="def-pill ' + stateClass(row) + '">' + esc(row._estadoDefensa) + '</span>';
  }

  function inputHtml(row, field){
    var isArt = field === "nart";
    var value = isArt ? row._nart : row._ndef;
    var enabled = isArt ? row._canArt : row._canDef;
    var title = "";

    if(!enabled && isArt){
      title = "Bloqueado por requisitos.";
    }
    if(!enabled && !isArt){
      title = "Bloqueado hasta tener N-ART igual o mayor a 7.";
    }

    return '<input class="def-note-input" type="number" min="0" max="10" step="0.01" inputmode="decimal" data-id="' + esc(row._defId) + '" data-field="' + field + '" value="' + esc(noteText(value)) + '" ' + (enabled ? "" : "disabled") + ' title="' + esc(title) + '" />';
  }

  function sortIcon(key){
    if(state.sortKey !== key){
      return "";
    }
    return state.sortDir === "asc" ? " ▲" : " ▼";
  }

  function tableHtml(rows){
    if(!rows || !rows.length){
      return '<div class="def-empty">Sin estudiantes con los filtros seleccionados.</div>';
    }

    var head = '<table class="def-table"><thead><tr>' + HEADERS.map(function(header){
      return '<th class="' + esc(header.className || "") + '" data-sort="' + esc(header.key) + '">' + esc(header.label) + sortIcon(header.key) + '</th>';
    }).join("") + '<th data-sort="_estadoDefensa">Estado' + sortIcon("_estadoDefensa") + '</th></tr></thead><tbody>';

    var body = rows.map(function(row){
      return '<tr class="' + esc(stateClass(row)) + '" data-id="' + esc(row._defId) + '">' +
        '<td class="col-cedula nowrap">' + esc(row._cedula) + '</td>' +
        '<td class="col-nombre">' + esc(row._nombre || "Sin nombre") + '</td>' +
        '<td class="col-carrera">' + esc(row._carrera) + '</td>' +
        '<td class="col-nota">' + inputHtml(row, "nart") + '</td>' +
        '<td class="col-nota">' + inputHtml(row, "ndef") + '</td>' +
        '<td class="col-nota"><strong id="def-nfin-' + esc(row._defId) + '">' + esc(noteText(row._nfin)) + '</strong></td>' +
        '<td class="col-estado">' + statePill(row) + '</td>' +
      '</tr>';
    }).join("");

    return head + body + '</tbody></table>';
  }

  function collectOptions(){
    return {
      periodId:state.periodId,
      career:state.career,
      status:state.status,
      sede:state.sede,
      search:state.search,
      sortKey:state.sortKey,
      sortDir:state.sortDir
    };
  }

  function render(){
    if(state.rendering){
      return;
    }
    state.rendering = true;
    try{
      state.data = window.DefartCore.summary(collectOptions());
      fillFilters(state.data);
      renderKpis(state.data);

      var wrap = el("def-table-wrap");
      if(wrap){
        wrap.innerHTML = tableHtml(state.data.rows || []);
      }
      if(el("def-visible-count")){
        el("def-visible-count").textContent = (state.data.rows || []).length + " visibles";
      }
      if(el("def-diagnostics")){
        el("def-diagnostics").textContent = JSON.stringify(state.data.diagnostics || {}, null, 2);
      }

      bindTableEvents();
      updatePendingMessage();
      status("Defensas cargado correctamente desde BaseLocal.", "ok");
    }catch(error){
      console.error("[Defensas]", error);
      status(error.message || String(error), "warn");
    }finally{
      state.rendering = false;
    }
  }

  function getRowById(id){
    var rows = state.data && Array.isArray(state.data.rows) ? state.data.rows : [];
    return rows.find(function(row){return row._defId === id;}) || null;
  }

  function getInputValue(id, field){
    var input = document.querySelector('.def-note-input[data-id="' + CSS.escape(id) + '"][data-field="' + CSS.escape(field) + '"]');
    return input ? input.value : "";
  }

  function setChange(id, field, value){
    if(!state.changes[id]){
      state.changes[id] = {id:id};
    }
    state.changes[id][field] = value;
    updatePendingMessage();
  }

  function updatePendingMessage(){
    var total = Object.keys(state.changes).length;
    if(total){
      setProgress(12, total + " estudiante(s) con cambios pendientes.");
      saveState("Cambios pendientes");
    }else{
      setProgress(0, "Sin cambios pendientes.");
      saveState("Listo");
    }
  }

  function validateInput(input){
    var value = text(input.value);
    if(!value){
      input.classList.remove("is-invalid");
      return true;
    }
    var num = Number(value.replace(",", "."));
    var ok = Number.isFinite(num) && num >= 0 && num <= 10;
    input.classList.toggle("is-invalid", !ok);
    if(!ok){
      status("La nota debe estar entre 0 y 10, máximo 2 decimales.", "warn");
    }
    return ok;
  }

  function onNoteInput(input){
    if(!validateInput(input)){
      return;
    }
    var id = input.getAttribute("data-id");
    var field = input.getAttribute("data-field");
    setChange(id, field, input.value);

    if(field === "nart"){
      var row = getRowById(id);
      var nart = Number(text(input.value).replace(",", "."));
      var ndefInput = document.querySelector('.def-note-input[data-id="' + CSS.escape(id) + '"][data-field="ndef"]');
      if(ndefInput){
        ndefInput.disabled = !(row && row._canArt && Number.isFinite(nart) && nart >= 7);
      }
    }

    scheduleAutoSave();
  }

  function bindTableEvents(){
    document.querySelectorAll("#def-table-wrap th[data-sort]").forEach(function(th){
      th.addEventListener("click", function(){
        var key = th.getAttribute("data-sort");
        if(state.sortKey === key){
          state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        }else{
          state.sortKey = key;
          state.sortDir = "asc";
        }
        render();
      });
    });

    document.querySelectorAll(".def-note-input").forEach(function(input){
      input.addEventListener("input", function(){onNoteInput(input);});
      input.addEventListener("change", function(){onNoteInput(input);});
    });
  }

  function changesArray(){
    return Object.keys(state.changes).map(function(key){return state.changes[key];});
  }

  function scheduleAutoSave(){
    if(state.autoTimer){
      clearTimeout(state.autoTimer);
    }
    state.autoTimer = setTimeout(function(){
      saveAll("auto");
    }, 900);
  }

  function saveAll(mode){
    var changes = changesArray();
    if(!changes.length){
      updatePendingMessage();
      return;
    }

    try{
      setProgress(45, "Guardando notas en BaseLocal...");
      saveState(mode === "auto" ? "Guardado automático..." : "Guardando...");
      var result = window.DefartCore.saveNotes(changes);
      state.changes = {};
      setProgress(100, result.message || "Notas guardadas.");
      saveState("Guardado");
      status((result.message || "Notas guardadas en BaseLocal.") + " BL sincronizará Firebase.", result.ok ? "ok" : "warn");
      setTimeout(function(){
        setProgress(0, "Sin cambios pendientes.");
        saveState("Listo");
      }, 1200);
      render();
    }catch(error){
      console.error("[Defensas Guardar]", error);
      setProgress(0, "No se pudo guardar.");
      saveState("Error");
      status(error.message || String(error), "warn");
    }
  }

  function exportExcel(){
    try{
      var result = window.DefartExport.exportExcel((state.data && state.data.rows) || [], {
        periodId:state.periodId || "TODOS",
        periodLabel:state.periodId || "TODOS"
      });
      status("Excel descargado: " + result.fileName, "ok");
    }catch(error){
      console.error("[Defensas Export]", error);
      status(error.message || String(error), "warn");
    }
  }

  function bind(){
    if(el("def-filter-periodo")) el("def-filter-periodo").addEventListener("change", function(event){state.periodId = event.target.value; render();});
    if(el("def-filter-carrera")) el("def-filter-carrera").addEventListener("change", function(event){state.career = event.target.value; render();});
    if(el("def-filter-estado")) el("def-filter-estado").addEventListener("change", function(event){state.status = event.target.value; render();});
    if(el("def-filter-sede")) el("def-filter-sede").addEventListener("change", function(event){state.sede = event.target.value; render();});
    if(el("def-filter-search")) el("def-filter-search").addEventListener("input", function(event){state.search = event.target.value; render();});
    if(el("def-btn-refresh")) el("def-btn-refresh").addEventListener("click", render);
    if(el("def-btn-save")) el("def-btn-save").addEventListener("click", function(){saveAll("manual");});
    if(el("def-btn-export")) el("def-btn-export").addEventListener("click", exportExcel);

    window.addEventListener("storage", function(event){
      if(event.key === "REQ_BL_SIGNAL_V1" || event.key === "REQ_EXCEL_LOCAL_V1:snapshot"){
        render();
      }
    });
  }

  function boot(){
    try{
      if(window.ExcelLocalBridge && typeof window.ExcelLocalBridge.ensureReady === "function"){
        window.ExcelLocalBridge.ensureReady();
      }
      bind();
      render();
    }catch(error){
      console.error("[Defensas Boot]", error);
      status(error.message || String(error), "warn");
    }
  }

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }
})(window, document);
