/* =========================================================
Nombre completo: excel-ui.cargar.js
Ruta o ubicación: /Requisitos/Gestion/Excel/excel-ui.cargar.js
Función o funciones:
- Controlar selección de archivo Excel.
- Leer, validar y consolidar datos del archivo cargado.
- Guardar el resultado en BaseLocal para BL, Tabla, Ficha y Stats.
Con qué se conecta:
- excel-reader.js
- excel-logic.js
- excel-state.js
- excel-local.repo.js
========================================================= */
(function(window,document){
  "use strict";
  var booted=false;
  function id(x){return document.getElementById(x);} 
  function selectedPeriod(){var s=id("excel-cargar-period-select");if(!s)return {id:"",label:""};var opt=s.options[s.selectedIndex];return {id:s.value,label:opt?opt.textContent:s.value};}
  function setBusy(on){var b=id("excel-analyze-save-btn");if(b){b.disabled=!!on;b.textContent=on?"Analizando...":"Analizar";}}
  async function analyze(){
    var input=id("excel-file-input");var file=input&&input.files?input.files[0]:null;if(!file)throw new Error("Selecciona un archivo Excel.");
    var period=selectedPeriod();if(!period.id)throw new Error("Selecciona un período antes de analizar.");
    setBusy(true);var perf=window.ExcelPerformance?window.ExcelPerformance.start("analizar-excel"):null;
    try{
      var read=await window.ExcelReader.readFile(file);var result=window.ExcelLogic.procesar(read);
      window.ExcelState.set({periodoId:period.id,periodoLabel:period.label,fileName:read.fileName,headers:result.headers,rows:result.rows,schema:result.schema,analisis:result.analisis,consolidado:result.consolidado,lastAction:"analizar",lastError:null},"excel:analizado");
      if(window.ExcelLocalRepo&&typeof window.ExcelLocalRepo.saveAnalysis==="function"){
        window.ExcelLocalRepo.saveAnalysis({periodoId:period.id,periodoLabel:period.label,fileName:read.fileName,rows:result.rows,schema:result.schema,analisis:result.analisis,consolidado:result.consolidado});
      }
      try{localStorage.setItem("REQ_EXCEL_LAST_ANALYSIS",JSON.stringify({periodoId:period.id,periodoLabel:period.label,fileName:read.fileName,schema:result.schema,analisis:result.analisis,consolidado:result.consolidado,updatedAt:new Date().toISOString()}));}catch(e){}
      if(window.ExcelMonitor)window.ExcelMonitor.log("excel-ui.cargar","Análisis guardado en BaseLocal",{rows:result.rows.length,periodoId:period.id});
      if(perf)perf.end({rows:result.rows.length});
    }catch(e){window.ExcelState.set({lastError:e.message||String(e)},"excel:error");throw e;}finally{setBusy(false);}
  }
  function boot(){if(booted)return;booted=true;var btn=id("excel-analyze-save-btn");if(btn)btn.addEventListener("click",function(){analyze().then(function(){alert("Excel analizado y guardado en BaseLocal.");}).catch(function(e){alert(e.message||e);});});}
  window.ExcelUICargar={boot:boot,analyze:analyze};
})(window,document);
