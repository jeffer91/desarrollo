/* =========================================================
Nombre completo: infor.state.js
Ruta o ubicación: /Requisitos/Titulacion/core/infor.state.js
Función o funciones:
- Mantener el estado interno del nuevo módulo Infor.
- Guardar configuración mínima por período en almacenamiento local.
- Clasificar períodos como REGULAR o PVC usando StatsRules cuando esté disponible.
- Guardar la clave de Gemini en BaseLocal local de Infor.
Con qué se conecta:
- frontend/titulacion.app.js
- Stats/stats.rules.js
========================================================= */
(function(window){
  "use strict";

  var STORAGE_KEY = "requisitos.infor.v1";
  var GEMINI_KEY = "requisitos.infor.gemini.key";

  var state = {
    periodId:"",
    periodLabel:"",
    periodType:null,
    excel:{fileName:"",sheetCount:0,ignoredSheets:0,loaded:false},
    cronogramas:{complexivo:"",trabajoTitulacion:"",pvc:""},
    anexos:[],
    gemini:{hasKey:false},
    lastProcess:null,
    diagnostics:[]
  };

  function text(value){return String(value == null ? "" : value).trim();}
  function clone(value){return JSON.parse(JSON.stringify(value == null ? null : value));}
  function now(){return new Date().toISOString();}

  function safeParse(raw, fallback){
    try{return raw ? JSON.parse(raw) : fallback;}catch(error){return fallback;}
  }

  function loadRoot(){
    return safeParse(localStorage.getItem(STORAGE_KEY), {periods:{}, updatedAt:null});
  }

  function saveRoot(root){
    root.updatedAt = now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(root));
    return root;
  }

  function defaultPeriodData(){
    return {
      cronogramas:{complexivo:"",trabajoTitulacion:"",pvc:""},
      anexos:[],
      lastProcess:null,
      updatedAt:null
    };
  }

  function periodKey(periodId, periodLabel){
    return text(periodId || periodLabel || "SIN_PERIODO");
  }

  function emptyPeriodType(){
    return {id:"", label:"Sin período", isRegular:false, isPVC:false, pattern:"SIN_PERIODO", raw:""};
  }

  function classifyPeriod(value){
    var raw = text(value);
    if(!raw){return emptyPeriodType();}
    if(window.StatsRules && typeof window.StatsRules.classifyPeriod === "function"){
      return window.StatsRules.classifyPeriod(raw);
    }
    var source = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    var regular = (source.indexOf("octubre") >= 0 && source.indexOf("marzo") >= 0) || (source.indexOf("abril") >= 0 && source.indexOf("septiembre") >= 0);
    return {id:regular ? "REGULAR" : "PVC", label:regular ? "Regular" : "PVC", isRegular:regular, isPVC:!regular, pattern:regular ? "REGULAR" : "PVC", raw:raw};
  }

  function refreshGeminiFlag(){
    state.gemini.hasKey = !!text(localStorage.getItem(GEMINI_KEY));
    return state.gemini.hasKey;
  }

  function setGeminiKey(key){
    key = text(key);
    if(!key){localStorage.removeItem(GEMINI_KEY);}else{localStorage.setItem(GEMINI_KEY, key);}
    refreshGeminiFlag();
    return state.gemini.hasKey;
  }

  function getGeminiKey(){return text(localStorage.getItem(GEMINI_KEY));}

  function loadPeriod(periodId, periodLabel){
    var key = periodKey(periodId, periodLabel);
    var root = loadRoot();
    var saved = Object.assign(defaultPeriodData(), root.periods[key] || {});
    state.periodId = text(periodId);
    state.periodLabel = text(periodLabel || periodId || "");
    state.periodType = classifyPeriod(state.periodLabel || state.periodId);
    state.cronogramas = Object.assign({complexivo:"",trabajoTitulacion:"",pvc:""}, saved.cronogramas || {});
    state.anexos = Array.isArray(saved.anexos) ? saved.anexos.slice() : [];
    state.lastProcess = saved.lastProcess || null;
    refreshGeminiFlag();
    pushDiagnostic("periodo", "Período cargado en Infor.");
    return getState();
  }

  function savePeriod(){
    var key = periodKey(state.periodId, state.periodLabel);
    var root = loadRoot();
    root.periods = root.periods || {};
    root.periods[key] = {
      periodId:state.periodId,
      periodLabel:state.periodLabel,
      periodType:state.periodType,
      cronogramas:clone(state.cronogramas),
      anexos:clone(state.anexos),
      lastProcess:clone(state.lastProcess),
      updatedAt:now()
    };
    saveRoot(root);
    return getState();
  }

  function setExcelInfo(info){
    state.excel = Object.assign({fileName:"",sheetCount:0,ignoredSheets:0,loaded:false}, info || {});
    pushDiagnostic("excel", "Excel registrado en estado interno.");
    return savePeriod();
  }

  function setCronograma(kind, value){
    if(!state.cronogramas){state.cronogramas = {complexivo:"",trabajoTitulacion:"",pvc:""};}
    state.cronogramas[kind] = text(value);
    return savePeriod();
  }

  function setAnexos(list){
    state.anexos = Array.isArray(list) ? list.slice() : [];
    return savePeriod();
  }

  function processDraft(){
    state.lastProcess = {
      at:now(),
      periodId:state.periodId,
      periodLabel:state.periodLabel,
      periodType:state.periodType,
      excel:clone(state.excel),
      cronogramas:clone(state.cronogramas),
      anexosCount:state.anexos.length,
      readyForNextBlock:true
    };
    pushDiagnostic("procesar", "Bloque 1 guardó insumos y estado. La generación Word/PDF se implementa en los siguientes bloques.");
    return savePeriod();
  }

  function pushDiagnostic(kind, message){
    state.diagnostics.unshift({kind:kind, message:message, at:now()});
    state.diagnostics = state.diagnostics.slice(0, 30);
  }

  function getState(){
    return clone(state);
  }

  window.InforState = {
    loadPeriod:loadPeriod,
    savePeriod:savePeriod,
    getState:getState,
    setExcelInfo:setExcelInfo,
    setCronograma:setCronograma,
    setAnexos:setAnexos,
    processDraft:processDraft,
    classifyPeriod:classifyPeriod,
    getGeminiKey:getGeminiKey,
    setGeminiKey:setGeminiKey,
    refreshGeminiFlag:refreshGeminiFlag,
    pushDiagnostic:pushDiagnostic
  };
})(window);
