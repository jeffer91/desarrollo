/* =========================================================
Nombre completo: plani.app.js
Ruta o ubicación: /Requisitos/Plani/frontend/plani.app.js
Función o funciones:
- Orquestar la pantalla Plani con estado interno robusto.
- Conectar período, tipo de documento, almacenamiento, validación y QA.
- Mantener Plani separado de Infor y del menú principal hasta la integración final.
Con qué se conecta:
- plani.html
- plani.ui.js
- plani.events.js
- ../core/plani.constants.js
- ../core/plani.periodo.js
- ../core/plani.tipo-documento.js
- ../core/plani.state.js
- ../core/plani.validator.js
- ../core/plani.qa.js
========================================================= */
(function(window, document){
  "use strict";

  function ui(){return window.PlaniUI || null;}
  function ev(){return window.PlaniEvents || null;}
  function st(){return window.PlaniState || null;}
  function periodo(){return window.PlaniPeriodo || null;}
  function validator(){return window.PlaniValidator || null;}
  function qa(){return window.PlaniQA || null;}
  function text(value){return String(value == null ? "" : value).trim();}
  function el(id){return document.getElementById(id);}
  function esc(value){return text(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");}

  function option(value, label, selected){
    return '<option value="' + esc(value) + '" ' + (selected ? 'selected' : '') + '>' + esc(label) + '</option>';
  }

  function fillPeriods(current){
    var select = el("plani-periodo");
    if(!select){return;}
    var list = periodo() && typeof periodo().list === "function" ? periodo().list() : [];
    select.innerHTML = option("", "Selecciona un período", !current) + list.map(function(item){
      return option(item.id, item.label, current === item.id);
    }).join("");
  }

  function render(message, cls){
    var snapshot = st() ? st().getState() : {};
    if(ui()){ui().renderAll(snapshot, message, cls);}
    if(qa()){qa().render(qa().run());}
  }

  function syncReadiness(){
    var node = el("plani-readiness");
    var snapshot = st() ? st().getState() : {};
    var result = validator() ? validator().validate(snapshot) : {ok:false,message:"Validador no disponible."};
    if(node){
      node.textContent = result.message;
      node.className = "plani-muted " + (result.ok ? "ok" : "warn");
    }
    return result;
  }

  function onPeriodChange(periodId, periodLabel){
    if(st()){st().setPeriod(periodId, periodLabel);}
    var snapshot = st() ? st().getState() : {};
    var selectDoc = el("plani-document-type");
    if(selectDoc && snapshot.documentType){selectDoc.value = snapshot.documentType;}
    syncReadiness();
    render(snapshot.periodLabel ? "Período registrado para Plani." : "Selecciona un período para continuar.", snapshot.periodLabel ? "ok" : "warn");
  }

  function onDocumentTypeChange(documentType){
    if(st()){st().setDocumentType(documentType);}
    syncReadiness();
    render(documentType ? "Tipo de planificación seleccionado." : "Selecciona el tipo de planificación.", documentType ? "ok" : "warn");
  }

  function onCronogramaInput(value, fileName){
    if(st()){st().setCronograma(value, fileName);}
    syncReadiness();
    render(text(value) ? "Cronograma registrado en Plani." : "Cronograma vacío.", text(value) ? "ok" : "warn");
  }

  function onPrepareBase(){
    var snapshot = st() ? st().getState() : {};
    var result = validator() ? validator().validate(snapshot) : {ok:false,message:"Validador no disponible."};
    if(st()){st().pushDiagnostic("validacion", result.message);st().save();}
    syncReadiness();
    render(result.message, result.ok ? "ok" : "warn");
  }

  function boot(){
    try{
      if(st()){st().init();}
      var snapshot = st() ? st().getState() : {};
      fillPeriods(snapshot.periodId);
      if(ui()){ui().fillDocumentTypes(snapshot.documentType);}
      if(ev()){
        ev().bind({
          onPeriodChange:onPeriodChange,
          onDocumentTypeChange:onDocumentTypeChange,
          onCronogramaInput:onCronogramaInput,
          onPrepareBase:onPrepareBase
        });
      }
      syncReadiness();
      render("Plani listo. Bloque 2 cargado correctamente.", "ok");
    }catch(error){
      console.error("[Plani boot]", error);
      if(ui()){ui().status(error.message || String(error), "bad");}
    }
  }

  function getState(){return st() ? st().getState() : {};}

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
