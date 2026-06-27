/* =========================================================
Nombre completo: baselocal.divisiones.js
Ruta o ubicación: /Requisitos/BaseLocal/baselocal.divisiones.js
Función o funciones:
- Mostrar modal Crear división en Base Local.
- Cargar carreras disponibles según el período seleccionado.
- Ocultar carreras ya usadas en otra división del mismo período.
- Guardar divisiones: ["Nombre"] en estudiantes activos y retirados.
- Evitar que el modal se congele por sincronización Firebase pesada.
- Sincronizar Firebase en segundo plano después de guardar localmente.
Con qué se conecta:
- services/bl-divisiones.service.js
- baselocal.core.js
- baselocal.firebase.js
- baselocal.connector.js
- baselocal.app.js
========================================================= */
(function(window, document){
  "use strict";

  function el(id){return document.getElementById(id);}
  function text(value){return String(value == null ? "" : value).trim();}
  function esc(value){return text(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;");}

  var state = {periodId:"", careers:[], saving:false, lastResult:null};

  function getSelectedPeriod(){
    var selector = el("bl-filter-period");
    var value = selector ? text(selector.value) : "";
    if(value){return value;}
    return state.periodId || "";
  }

  function periodLabel(periodId){
    var periods = window.BaseLocalAPI && typeof window.BaseLocalAPI.getPeriods === "function" ? window.BaseLocalAPI.getPeriods() : [];
    var found = periods.find(function(period){return text(period.id || period.periodoId) === text(periodId);});
    return found ? text(found.label || found.periodoLabel || found.id) : text(periodId);
  }

  function status(message, type){
    var box = el("bl-status");
    if(box){box.textContent = message;box.className = "bl-status " + (type || "bl-status-info");}
  }

  function setModalOpen(open){
    var modal = el("bl-division-modal");
    if(!modal){return;}
    modal.classList.toggle("is-open", !!open);
    modal.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function setBusy(on){
    state.saving = !!on;
    var save = el("bl-division-save");
    var cancel = el("bl-division-cancel");
    var close = el("bl-division-close");
    if(save){save.disabled = !!on;save.textContent = on ? "Guardando..." : "Guardar división";}
    if(cancel){cancel.disabled = !!on;}
    if(close){close.disabled = !!on;}
  }

  function selectedCareers(){
    var selected = [];
    document.querySelectorAll("#bl-division-careers input[type='checkbox']:checked").forEach(function(input){selected.push(input.value);});
    return selected;
  }

  function emitChange(kind, payload){
    var detail = Object.assign({source:"baselocal.divisiones", at:new Date().toISOString()}, payload || {});
    [kind, "requisitos:bl:changed", "requisitos:bl:snapshot-changed"].forEach(function(name){
      try{window.dispatchEvent(new CustomEvent(name, {detail:detail}));}catch(error){}
    });
    try{
      if(window.parent && window.parent !== window){
        window.parent.postMessage({type:"requisitos:bl:snapshot-changed", payload:detail}, "*");
      }
    }catch(error){}
    try{window.localStorage.setItem("REQ_BL_SIGNAL_V1", JSON.stringify(Object.assign({id:"division-" + Date.now()}, detail)));}catch(error){}
  }

  function refreshBaseLocalView(result){
    try{if(window.BaseLocalAPI && typeof window.BaseLocalAPI.clearSnapshotCache === "function"){window.BaseLocalAPI.clearSnapshotCache();}}catch(error){}
    try{if(window.BaseLocalApp && typeof window.BaseLocalApp.scheduleRender === "function"){window.BaseLocalApp.scheduleRender("division-created");}}catch(error){}
    emitChange("requisitos:bl:division-created", result || {});
  }

  function syncDivisionInBackground(result){
    setTimeout(function(){
      if(!window.BaseLocalFirebase || typeof window.BaseLocalFirebase.push !== "function"){
        status("División guardada localmente. Firebase queda pendiente porque el conector no está disponible.", "bl-status-warn");
        return;
      }
      if(window.navigator && window.navigator.onLine === false){
        status("División guardada localmente. Firebase se sincronizará cuando haya internet.", "bl-status-warn");
        return;
      }
      window.BaseLocalFirebase.push()
        .then(function(summary){
          status("División guardada y sincronización Firebase finalizada.", "bl-status-ok");
          refreshBaseLocalView(Object.assign({}, result || {}, {firebase:summary || null}));
        })
        .catch(function(error){
          console.warn("[BaseLocal Divisiones Firebase background]", error);
          status("División guardada localmente. Firebase quedó pendiente: " + (error.message || String(error)), "bl-status-warn");
        });
    }, 300);
  }

  function renderCareers(periodId){
    var wrap = el("bl-division-careers");
    var help = el("bl-division-help");
    if(!wrap){return;}
    var careers = [];
    if(window.BaseLocalAPI && typeof window.BaseLocalAPI.getAvailableDivisionCareers === "function"){
      careers = window.BaseLocalAPI.getAvailableDivisionCareers(periodId);
    }
    state.careers = careers;
    if(help){
      var divisions = window.BaseLocalAPI && typeof window.BaseLocalAPI.getDivisions === "function" ? window.BaseLocalAPI.getDivisions(periodId) : [];
      help.textContent = divisions.length ? "Ya existen divisiones: " + divisions.join(", ") + ". Las carreras usadas no aparecen aquí." : "Selecciona las carreras que entrarán en esta división.";
    }
    if(!careers.length){
      wrap.innerHTML = '<p class="bl-help">No hay carreras disponibles. Todas las carreras de este período ya tienen división o no hay estudiantes.</p>';
      return;
    }
    wrap.innerHTML = careers.map(function(career){
      var id = "bl-div-career-" + career.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]+/g,"_");
      return '<label class="bl-check-row" for="'+esc(id)+'"><input id="'+esc(id)+'" type="checkbox" value="'+esc(career)+'" /> <span>'+esc(career)+'</span></label>';
    }).join("");
  }

  function openModal(){
    var periodId = getSelectedPeriod();
    if(!periodId){
      status("Selecciona primero un período para crear la división.", "bl-status-warn");
      return;
    }
    state.periodId = periodId;
    var periodBox = el("bl-division-period-label");
    var name = el("bl-division-name");
    if(periodBox){periodBox.textContent = periodLabel(periodId);}
    if(name){name.value = "";}
    renderCareers(periodId);
    setModalOpen(true);
    setTimeout(function(){if(name){name.focus();}}, 60);
  }

  function closeModal(){
    if(state.saving){return;}
    setModalOpen(false);
  }

  async function saveDivision(){
    if(state.saving){return;}
    var name = text(el("bl-division-name") && el("bl-division-name").value);
    var periodId = state.periodId || getSelectedPeriod();
    var careers = selectedCareers();
    if(!periodId){status("Selecciona un período.", "bl-status-warn");return;}
    if(!name){status("Escribe el nombre de la división.", "bl-status-warn");return;}
    if(!careers.length){status("Selecciona al menos una carrera.", "bl-status-warn");return;}

    try{
      if(!window.BaseLocalAPI || typeof window.BaseLocalAPI.applyDivisionToCareers !== "function"){
        throw new Error("La API de divisiones no está disponible.");
      }
      setBusy(true);

      var result = window.BaseLocalAPI.applyDivisionToCareers(periodId, name, careers);
      state.lastResult = result;

      setBusy(false);
      setModalOpen(false);
      refreshBaseLocalView(result);
      status("División creada localmente: " + name + ". Estudiantes actualizados: " + (result.updated || 0) + ". Firebase se sincroniza en segundo plano.", "bl-status-ok");
      syncDivisionInBackground(result);
    }catch(error){
      console.error("[BaseLocal Divisiones]", error);
      status("No se pudo crear la división: " + (error.message || String(error)), "bl-status-warn");
      setBusy(false);
    }
  }

  function bind(){
    if(el("bl-btn-create-division")){el("bl-btn-create-division").addEventListener("click", openModal);}
    if(el("bl-division-cancel")){el("bl-division-cancel").addEventListener("click", closeModal);}
    if(el("bl-division-close")){el("bl-division-close").addEventListener("click", closeModal);}
    if(el("bl-division-save")){el("bl-division-save").addEventListener("click", saveDivision);}
    if(el("bl-division-modal")){
      el("bl-division-modal").addEventListener("click", function(event){if(event.target === el("bl-division-modal")){closeModal();}});
    }
    document.addEventListener("keydown", function(event){if(event.key === "Escape" && el("bl-division-modal") && el("bl-division-modal").classList.contains("is-open")){closeModal();}});
  }

  window.BaseLocalDivisionesUI = {open:openModal, close:closeModal, save:saveDivision, renderCareers:renderCareers, lastResult:function(){return state.lastResult;}};

  if(document.readyState === "loading"){document.addEventListener("DOMContentLoaded", bind);}else{bind();}
})(window, document);
