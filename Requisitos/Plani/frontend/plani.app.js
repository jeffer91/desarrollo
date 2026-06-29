/* =========================================================
Nombre completo: plani.app.js
Ruta o ubicación: /Requisitos/Plani/frontend/plani.app.js
Función o funciones:
- Orquestar la pantalla inicial de Plani.
- Mantener estado temporal del bloque 1.
- Conectar constantes, UI y eventos.
Con qué se conecta:
- plani.html
- plani.ui.js
- plani.events.js
- ../core/plani.constants.js
========================================================= */
(function(window, document){
  "use strict";

  var state = null;

  function cfg(){return window.PlaniConstants || {};}
  function ui(){return window.PlaniUI || null;}
  function ev(){return window.PlaniEvents || null;}
  function text(value){return String(value == null ? "" : value).trim();}
  function clone(value){return JSON.parse(JSON.stringify(value == null ? null : value));}

  function baseState(){
    return clone(cfg().EMPTY_STATE || {
      periodId:"",
      periodLabel:"",
      periodType:null,
      documentType:"",
      cronogramaRaw:"",
      cronogramaFileName:"",
      sectionAssets:{},
      previewReady:false,
      exportReady:false,
      diagnostics:[]
    });
  }

  function addDiagnostic(kind, message){
    state.diagnostics = Array.isArray(state.diagnostics) ? state.diagnostics : [];
    state.diagnostics.unshift({kind:kind, message:message, at:new Date().toISOString()});
    state.diagnostics = state.diagnostics.slice(0, 30);
  }

  function classifyPeriod(label){
    var raw = text(label);
    if(!raw){return null;}
    var source = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    var regular = (source.indexOf("octubre") >= 0 && source.indexOf("marzo") >= 0) || (source.indexOf("abril") >= 0 && source.indexOf("septiembre") >= 0);
    return {id:regular ? "REGULAR" : "PVC", label:regular ? "Regular" : "PVC", raw:raw};
  }

  function refresh(){
    state.previewReady = !!(text(state.documentType) || text(state.cronogramaRaw));
    state.exportReady = false;
    return state;
  }

  function render(message, cls){
    refresh();
    if(ui()){ui().renderAll(getState(), message, cls);}
  }

  function onPeriodChange(periodId, periodLabel){
    state.periodId = text(periodId);
    state.periodLabel = text(periodLabel || periodId);
    state.periodType = classifyPeriod(state.periodLabel || state.periodId);
    addDiagnostic("periodo", "Período actualizado.");
    render(state.periodLabel ? "Período registrado para Plani." : "Selecciona un período para continuar.", state.periodLabel ? "ok" : "warn");
  }

  function onDocumentTypeChange(documentType){
    state.documentType = text(documentType).toUpperCase();
    addDiagnostic("documento", "Tipo de planificación actualizado.");
    render(state.documentType ? "Tipo de planificación seleccionado." : "Selecciona el tipo de planificación.", state.documentType ? "ok" : "warn");
  }

  function onCronogramaInput(value, fileName){
    state.cronogramaRaw = text(value);
    if(fileName !== undefined){state.cronogramaFileName = text(fileName);}
    addDiagnostic("cronograma", "Cronograma actualizado.");
    render(state.cronogramaRaw ? "Cronograma registrado en Plani." : "Cronograma vacío.", state.cronogramaRaw ? "ok" : "warn");
  }

  function onPrepareBase(){
    var missing = [];
    if(!text(state.documentType)){missing.push("tipo de planificación");}
    if(!text(state.cronogramaRaw)){missing.push("cronograma");}
    var message = missing.length ? "Falta: " + missing.join(", ") + "." : "Base preparada para el siguiente bloque.";
    addDiagnostic("preparar", message);
    render(message, missing.length ? "warn" : "ok");
  }

  function boot(){
    try{
      state = baseState();
      if(ui()){ui().fillDocumentTypes(state.documentType);}
      if(ev()){
        ev().bind({
          onPeriodChange:onPeriodChange,
          onDocumentTypeChange:onDocumentTypeChange,
          onCronogramaInput:onCronogramaInput,
          onPrepareBase:onPrepareBase
        });
      }
      addDiagnostic("boot", "Plani bloque 1 iniciado.");
      render("Plani listo. Bloque 1 cargado correctamente.", "ok");
    }catch(error){
      console.error("[Plani boot]", error);
      if(ui()){ui().status(error.message || String(error), "bad");}
    }
  }

  function getState(){return clone(state || {});}

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", boot);
  }else{
    boot();
  }

  window.PlaniApp = {
    getState:getState,
    render:render,
    onPeriodChange:onPeriodChange,
    onDocumentTypeChange:onDocumentTypeChange,
    onCronogramaInput:onCronogramaInput,
    onPrepareBase:onPrepareBase
  };
})(window, document);
