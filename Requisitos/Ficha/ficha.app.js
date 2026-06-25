/* =========================================================
Nombre completo: ficha.app.js
Ruta o ubicación: /Requisitos/Ficha/ficha.app.js
Función o funciones:
- Renderizar lista y ficha individual de estudiantes.
- Manejar búsqueda, selección, copia y exportación.
Con qué se conecta:
- ficha.core.js
- ficha.export.js
========================================================= */
(function(window,document){
  "use strict";
  var state={periodId:"",search:"",rows:[],selectedId:""};
  function el(id){return document.getElementById(id);}function text(v){return String(v==null?"":v).trim();}
  function esc(v){return text(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");}
  function status(msg,cls){var s=el("ficha-status");if(s){s.textContent=msg;s.className="ficha-status "+(cls||"");}}
  function option(value,label,selected){return '<option value="'+esc(value)+'" '+(selected?'selected':'')+'>'+esc(label)+'</option>';}
  function fillPeriods(){var sel=el("ficha-periodo");if(!sel)return;var list=window.FichaCore.periods();sel.innerHTML=option("","Todos",!state.periodId)+list.map(function(p){return option(p.id,p.label||p.id,state.periodId===p.id);}).join("");}
  function estadoClass(e){return e&&e.id==="cumple"?"ficha-pill-ok":e&&e.id==="no_cumple"?"ficha-pill-bad":"ficha-pill-warn";}
  function renderList(){var box=el("ficha-list");el("ficha-count").textContent=String(state.rows.length);if(!state.rows.length){box.innerHTML='<div class="empty-list">Sin estudiantes. Primero carga un Excel en Requisito.</div>';return;}box.innerHTML=state.rows.slice(0,400).map(function(s){var active=s._id===state.selectedId?' is-active':'';return '<button type="button" class="ficha-item'+active+'" data-id="'+esc(s._id)+'"><strong>'+esc(s._nombres||'Sin nombre')+'</strong><span>'+esc(s._cedula)+' · '+esc(s._carrera)+'</span></button>';}).join('');box.querySelectorAll('[data-id]').forEach(function(btn){btn.addEventListener('click',function(){select(btn.getAttribute('data-id'));});});}
  function reqClass(r){return r.estado==="cumple"?"ficha-pill-ok":r.estado==="no_cumple"?"ficha-pill-bad":"ficha-pill-warn";}
  function renderReqs(row){var reqs=window.FichaCore.requisitos(row);el("ficha-requisitos").innerHTML=reqs.map(function(r){return '<div class="ficha-req"><span class="ficha-req-name">'+esc(r.label)+'</span><span class="ficha-req-value '+reqClass(r)+'">'+esc(r.value)+'</span></div>';}).join('');}
  function renderDetail(row){if(!row){el("ficha-empty").classList.remove("is-hidden");el("ficha-detail").classList.add("is-hidden");return;}el("ficha-empty").classList.add("is-hidden");el("ficha-detail").classList.remove("is-hidden");el("ficha-nombre").textContent=row._nombres||"Sin nombre";el("ficha-identidad").textContent="Cédula: "+(row._cedula||"—");el("ficha-estado").textContent=row._estado.label;el("ficha-estado").className="ficha-pill "+estadoClass(row._estado);el("ficha-carrera").textContent=row._carrera||"—";el("ficha-periodo-label").textContent=row._periodo||"—";el("ficha-sede").textContent=row._sede||"—";el("ficha-horario").textContent=row._horario||"—";el("ficha-correo").textContent=row._correo||"—";el("ficha-celular").textContent=row._celular||"—";var w=window.FichaCore.whatsappUrl(row);var wa=el("ficha-whatsapp");wa.href=w||"#";wa.classList.toggle("is-disabled",!w);renderReqs(row);el("ficha-json").textContent=JSON.stringify(row,null,2);}
  function selected(){return window.FichaCore.getById(state.selectedId);}
  function select(id){state.selectedId=id||"";renderList();renderDetail(selected());}
  function render(){try{fillPeriods();state.rows=window.FichaCore.filter({periodId:state.periodId,search:state.search});if(!state.rows.some(function(x){return x._id===state.selectedId;})){state.selectedId=state.rows[0]?state.rows[0]._id:"";}renderList();renderDetail(selected());status("Ficha cargada correctamente.","ok");}catch(e){console.error("[Ficha]",e);status(e.message||String(e),"warn");}}
  function bind(){el("ficha-periodo").addEventListener("change",function(e){state.periodId=e.target.value;render();});el("ficha-search").addEventListener("input",function(e){state.search=e.target.value;render();});el("ficha-btn-refresh").addEventListener("click",render);el("ficha-btn-copy").addEventListener("click",function(){var row=selected();if(!row)return;window.FichaExport.copyText(window.FichaCore.toText(row)).then(function(){status("Ficha copiada.","ok");});});el("ficha-btn-json").addEventListener("click",function(){window.FichaExport.exportJson(selected());});el("ficha-copy-cedula").addEventListener("click",function(){var row=selected();if(row)window.FichaExport.copyText(row._cedula).then(function(){status("Cédula copiada.","ok");});});el("ficha-copy-correo").addEventListener("click",function(){var row=selected();if(row)window.FichaExport.copyText(row._correo).then(function(){status("Correo copiado.","ok");});});}
  function boot(){if(window.ExcelLocalBridge)window.ExcelLocalBridge.ensureReady();bind();render();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
})(window,document);
