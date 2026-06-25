/* =========================================================
Nombre completo: excel-ui.periodo.js
Ruta o ubicación: /Requisitos/Gestion/Excel/excel-ui.periodo.js
Función o funciones:
- Crear períodos desde la pantalla Excel.
- Actualizar selectores de período usados por carga y futuras secciones.
Con qué se conecta:
- excel-periodos.js
- excel-state.js
========================================================= */
(function(window,document){
  "use strict";
  var booted=false;
  function id(x){return document.getElementById(x);} 
  function selects(){return [id("excel-cargar-period-select"),id("excel-delete-period-select"),id("excel-force-period-select")].filter(Boolean);}
  async function refresh(selected){var list=await window.ExcelPeriodos.asegurarDemo();selects().forEach(function(sel){var current=selected||sel.value||"";sel.innerHTML="";var empty=document.createElement("option");empty.value="";empty.textContent="Selecciona un período";sel.appendChild(empty);list.forEach(function(p){var o=document.createElement("option");o.value=p.id;o.textContent=p.label||p.id;if(p.id===current)o.selected=true;sel.appendChild(o);});});}
  async function create(){var p=await window.ExcelPeriodos.crearDesdePartes(id("inicioAnio").value,id("inicioMes").value,id("finAnio").value,id("finMes").value);window.ExcelState.set({periodoId:p.id,periodoLabel:p.label},"periodo:creado");await refresh(p.id);alert("Período creado: "+p.label);}
  function boot(){if(booted)return;booted=true;var y=new Date().getFullYear();if(id("inicioAnio")&&!id("inicioAnio").value)id("inicioAnio").value=y;if(id("finAnio")&&!id("finAnio").value)id("finAnio").value=y;var btn=id("excel-add-period-btn");if(btn)btn.addEventListener("click",function(){create().catch(function(e){alert(e.message||e);});});refresh().catch(console.error);}
  window.ExcelUIPeriodo={boot:boot,refresh:refresh};
})(window,document);
