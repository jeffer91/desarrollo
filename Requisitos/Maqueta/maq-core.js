/* =========================================================
Nombre completo: maq-core.js
Ruta o ubicación: /Requisitos/Maqueta/maq-core.js
Función o funciones:
- Cargar pantallas internas por iframe.
- Mantener caché de iframes para que filtros, scroll y formularios no se pierdan al cambiar de pantalla.
- Abrir siempre Requisito/Excel al entrar a Maqueta.
- Evitar error visual cuando un módulo todavía no fue recuperado.
Con qué se conecta:
- maq-modulos-registry.js
- maq-utils.js
- maq-menu.js
========================================================= */
(function(window,document){
  "use strict";
  var U=window.MAQ_UTILS||{};
  var Registry=window.MAQ_MODULOS_REGISTRY||{};
  var state={moduloActivoId:null,moduloAnteriorId:null,moduloInicialId:"carga_excel"};
  var pool=Object.create(null);var listeners=Object.create(null);
  function on(evt,fn){if(!listeners[evt])listeners[evt]=[];listeners[evt].push(fn);} 
  function emit(evt,payload){(listeners[evt]||[]).forEach(function(fn){try{fn(payload);}catch(e){console.error("[MAQ_CORE] Error",evt,e);}});} 
  function host(){return document.getElementById("maq-main-frame-host");}
  function label(text){var el=document.getElementById("maq-current-module-label");if(el)el.textContent=text||"Sin módulo";}
  function hideAll(){Object.keys(pool).forEach(function(id){if(pool[id]&&pool[id].iframe)pool[id].iframe.classList.add("maq-frame-hidden");});}
  function routeFor(modulo){if(!modulo)return "maq-pendiente.html";if(modulo.estado&&modulo.estado!=="activo")return U.buildPendingUrl?U.buildPendingUrl(modulo):"maq-pendiente.html";return modulo.ruta;}
  function makeFrame(modulo){var h=host();if(!h)return null;var iframe=document.createElement("iframe");iframe.className="maq-frame maq-frame-hidden";iframe.title="Módulo: "+modulo.nombre;iframe.src=routeFor(modulo);iframe.dataset.moduleId=modulo.id;iframe.addEventListener("load",function(){if(U.status)U.status("Pantalla activa: "+modulo.nombre);});h.appendChild(iframe);return iframe;}
  function saveNav(current,previous){if(!U.save||!U.NAV_KEYS)return;U.save(U.NAV_KEYS.ultimoModuloId,current||null);U.save(U.NAV_KEYS.anteriorModuloId,previous||null);if(U.saveNavState)U.saveNavState({ultimoModuloId:current||null,anteriorModuloId:previous||null});}
  function navegarPorModuloId(moduloId){var modulo=Registry.buscarPorId?Registry.buscarPorId(moduloId):null;if(!modulo){console.error("[MAQ_CORE] Módulo no registrado:",moduloId);if(U.status)U.status("Módulo no registrado: "+moduloId);return;}if(state.moduloActivoId===moduloId){label(modulo.nombre);return;}state.moduloAnteriorId=state.moduloActivoId;state.moduloActivoId=moduloId;saveNav(state.moduloActivoId,state.moduloAnteriorId);if(!pool[moduloId]){pool[moduloId]={iframe:makeFrame(modulo),rutaBase:routeFor(modulo),nombre:modulo.nombre,estado:modulo.estado};}hideAll();if(pool[moduloId]&&pool[moduloId].iframe)pool[moduloId].iframe.classList.remove("maq-frame-hidden");label(modulo.nombre);if(U.memory)U.memory("En memoria: "+Object.keys(pool).length+" pantalla(s)");emit("modulo:cambiado",{moduloId:moduloId,modulo:modulo,anteriorModuloId:state.moduloAnteriorId});}
  function pantallaAnterior(){if(state.moduloAnteriorId){var prev=state.moduloAnteriorId;state.moduloAnteriorId=state.moduloActivoId;navegarPorModuloId(prev);return;}navegarPorModuloId(state.moduloInicialId);}
  function refrescarModuloActivo(){var id=state.moduloActivoId;var item=id?pool[id]:null;if(!item||!item.iframe)return;var sep=item.rutaBase.indexOf("?")>=0?"&":"?";item.iframe.src=item.rutaBase+sep+"_refresh="+Date.now();}
  function boot(){var btn=document.getElementById("maq-btn-refresh");if(btn)btn.addEventListener("click",refrescarModuloActivo);var prev=document.getElementById("maq-btn-prev");if(prev)prev.addEventListener("click",pantallaAnterior);} 
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
  window.MAQ_CORE={state:state,bus:{on:on,emit:emit},router:{navegarPorModuloId:navegarPorModuloId,pantallaAnterior:pantallaAnterior},actions:{refrescarModuloActivo:refrescarModuloActivo}};
})(window,document);
