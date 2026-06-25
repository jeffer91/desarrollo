/* =========================================================
Nombre completo: excel-periodos.js
Ruta o ubicación: /Requisitos/Gestion/Excel/excel-periodos.js
Función o funciones:
- Crear y listar períodos desde memoria local rápida.
- Mantener selección de período para analizar Excel sin depender aún de Firebase.
Con qué se conecta:
- excel-ui.periodo.js
- excel-ui.cargar.js
========================================================= */
(function(window){
  "use strict";
  var KEY="REQ_EXCEL_PERIODOS";
  function n(value){var x=parseInt(String(value==null?"":value).trim(),10);return Number.isFinite(x)?x:null;}
  function pad2(x){return String(x).padStart(2,"0");}
  function meses(m){return ["","Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][m]||String(m);}
  function read(){try{return JSON.parse(localStorage.getItem(KEY)||"[]");}catch(e){return [];} }
  function write(list){localStorage.setItem(KEY,JSON.stringify(Array.isArray(list)?list:[]));}
  function idFromParts(ia,im,fa,fm){return ia+"-"+pad2(im)+"__"+fa+"-"+pad2(fm);}
  function labelFromParts(ia,im,fa,fm){return meses(im)+" "+ia+" a "+meses(fm)+" "+fa;}
  function validate(ia,im,fa,fm){
    ia=n(ia);im=n(im);fa=n(fa);fm=n(fm);
    if(!ia||!fa)throw new Error("El año inicial y final son obligatorios.");
    if(im<1||im>12||fm<1||fm>12)throw new Error("Los meses deben estar entre 1 y 12.");
    if((ia*100+im)>(fa*100+fm))throw new Error("El período inicial no puede ser posterior al final.");
    return {inicioAnio:ia,inicioMes:im,finAnio:fa,finMes:fm,id:idFromParts(ia,im,fa,fm),label:labelFromParts(ia,im,fa,fm)};
  }
  async function crearDesdePartes(ia,im,fa,fm){
    var p=validate(ia,im,fa,fm);var list=read();
    if(!list.some(function(x){return x.id===p.id;})){p.createdAt=new Date().toISOString();list.push(p);write(list);} 
    return p;
  }
  async function listarTodos(){return read().sort(function(a,b){return String(a.id).localeCompare(String(b.id),"es");});}
  async function asegurarDemo(){var list=read();if(!list.length){var y=new Date().getFullYear();await crearDesdePartes(y,1,y,6);}return listarTodos();}
  window.ExcelPeriodos={crearDesdePartes:crearDesdePartes,listarTodos:listarTodos,asegurarDemo:asegurarDemo,validate:validate};
})(window);
