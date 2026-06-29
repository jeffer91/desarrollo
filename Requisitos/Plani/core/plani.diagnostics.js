/* =========================================================
Nombre completo: plani.diagnostics.js
Ruta o ubicación: /Requisitos/Plani/core/plani.diagnostics.js
Función o funciones:
- Construir un diagnóstico técnico legible del módulo Plani.
- Revisar módulos cargados, estado actual y validación base.
- Servir como apoyo para detectar errores en bloques posteriores.
Con qué se conecta:
- plani.state.js
- plani.validator.js
- plani.qa.js
- ../frontend/plani.ui.js
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
    {name:"PlaniUI", value:"PlaniUI", required:true},
    {name:"PlaniEvents", value:"PlaniEvents", required:true}
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
    return checks;
  }

  function run(state){
    var checks = moduleChecks().concat(stateChecks(state));
    var errors = checks.filter(function(x){return x.type === "error";}).length;
    var warnings = checks.filter(function(x){return x.type === "warn";}).length;
    return {
      ok:errors === 0,
      errors:errors,
      warnings:warnings,
      checks:checks,
      generatedAt:new Date().toISOString()
    };
  }

  window.PlaniDiagnostics = {
    run:run,
    moduleChecks:moduleChecks,
    stateChecks:stateChecks
  };
})(window);
