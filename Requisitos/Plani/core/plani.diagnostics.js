/* =========================================================
Nombre completo: plani.diagnostics.js
Ruta o ubicación: /Requisitos/Plani/core/plani.diagnostics.js
Función o funciones:
- Construir un diagnóstico técnico legible del módulo Plani.
- Revisar módulos cargados, estado actual, validación base, cronograma, recursos y motor documental.
- Servir como apoyo para detectar errores en bloques posteriores.
========================================================= */
(function(window){
  "use strict";

  var MODULES = [
    {name:"PlaniConstants", value:"PlaniConstants", required:true},
    {name:"PlaniStorage", value:"PlaniStorage", required:true},
    {name:"PlaniPeriodo", value:"PlaniPeriodo", required:true},
    {name:"PlaniTipoDocumento", value:"PlaniTipoDocumento", required:true},
    {name:"PlaniState", value:"PlaniState", required:true},
    {name:"PlaniValidator", value:"PlaniValidator", required:true},
    {name:"PlaniCronogramaParser", value:"PlaniCronogramaParser", required:true},
    {name:"PlaniCronogramaMapper", value:"PlaniCronogramaMapper", required:true},
    {name:"PlaniAssets", value:"PlaniAssets", required:true},
    {name:"PlaniSectionAssets", value:"PlaniSectionAssets", required:true},
    {name:"PlaniImages", value:"PlaniImages", required:true},
    {name:"PlaniCharts", value:"PlaniCharts", required:true},
    {name:"PlaniNumbering", value:"PlaniNumbering", required:true},
    {name:"PlaniIndexBuilder", value:"PlaniIndexBuilder", required:true},
    {name:"PlaniSectionBuilder", value:"PlaniSectionBuilder", required:true},
    {name:"PlaniDocumentModel", value:"PlaniDocumentModel", required:true},
    {name:"PlaniBuilder", value:"PlaniBuilder", required:true},
    {name:"PlaniPreview", value:"PlaniPreview", required:true},
    {name:"PlaniUI", value:"PlaniUI", required:true},
    {name:"PlaniEvents", value:"PlaniEvents", required:true},
    {name:"PlaniAssetsUI", value:"PlaniAssetsUI", required:true},
    {name:"PlaniPreviewUI", value:"PlaniPreviewUI", required:true}
  ];

  function moduleChecks(){
    return MODULES.map(function(item){
      var ok = !!window[item.value];
      return {type:ok ? "ok" : (item.required ? "error" : "warn"), label:item.name, message:ok ? "Disponible" : "No cargado"};
    });
  }

  function stateChecks(state){
    state = state || {};
    var validation = window.PlaniValidator && window.PlaniValidator.validate ? window.PlaniValidator.validate(state) : {errors:[],warnings:[],info:[]};
    var checks = [];
    (validation.info || []).forEach(function(item){checks.push({type:"ok", label:item.field, message:item.message});});
    (validation.warnings || []).forEach(function(item){checks.push({type:"warn", label:item.field, message:item.message});});
    (validation.errors || []).forEach(function(item){checks.push({type:"error", label:item.field, message:item.message});});
    if(state.cronogramaParsed){
      checks.push({type:state.cronogramaParsed.ok ? "ok" : "warn", label:"cronogramaParsed", message:"Filas detectadas: " + (state.cronogramaParsed.total || 0)});
    }
    if(state.sectionAssets && window.PlaniSectionAssets){
      checks.push({type:"ok", label:"sectionAssets", message:"Secciones con recursos: " + window.PlaniSectionAssets.summary(state.sectionAssets).length});
    }
    if(window.PlaniBuilder){
      checks.push({type:"ok", label:"builder", message:"Motor documental disponible."});
    }
    return checks;
  }

  function run(state){
    var checks = moduleChecks().concat(stateChecks(state));
    var errors = checks.filter(function(x){return x.type === "error";}).length;
    var warnings = checks.filter(function(x){return x.type === "warn";}).length;
    return {ok:errors === 0, errors:errors, warnings:warnings, checks:checks, generatedAt:new Date().toISOString()};
  }

  window.PlaniDiagnostics = {run:run, moduleChecks:moduleChecks, stateChecks:stateChecks};
})(window);
