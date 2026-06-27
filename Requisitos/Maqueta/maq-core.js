/* =========================================================
Nombre completo: maq-core.js
Ruta o ubicación: /Requisitos/Maqueta/maq-core.js
Función o funciones:
- Cargar pantallas internas por iframe.
- Preparar Base Local una sola vez antes de abrir pantallas internas.
- Mantener caché de iframes para que filtros, scroll y formularios no se pierdan al cambiar de pantalla.
- Precargar pantallas principales en segundo plano para que el cambio entre módulos sea casi inmediato.
- Abrir siempre Requisito/Excel al entrar a Maqueta.
- Evitar error visual cuando un módulo todavía no fue recuperado.
Con qué se conecta:
- maq-baselocal-session.js
- maq-modulos-registry.js
- maq-utils.js
- maq-menu.js
========================================================= */
(function(window,document){
  "use strict";
  var U=window.MAQ_UTILS||{};
  var Registry=window.MAQ_MODULOS_REGISTRY||{};
  var state={moduloActivoId:null,moduloAnteriorId:null,moduloInicialId:"carga_excel",baseLocalReady:false,preloadStarted:false,preloadFinished:false};
  var pool=Object.create(null);var listeners=Object.create(null);
  var PRELOAD_ORDER=["baselocal","tabla_principal","ficha_estudiante","stat_main","coordi","modulo_reporte","defart","titulacion"];
  var PRELOAD_DELAY_MS=1800;
  var PRELOAD_STEP_MS=900;

  function on(evt,fn){if(!listeners[evt])listeners[evt]=[];listeners[evt].push(fn);} 
  function emit(evt,payload){(listeners[evt]||[]).forEach(function(fn){try{fn(payload);}catch(e){console.error("[MAQ_CORE] Error",evt,e);}});} 
  function host(){return document.getElementById("maq-main-frame-host");}
  function label(text){var el=document.getElementById("maq-current-module-label");if(el)el.textContent=text||"Sin módulo";}
  function hideAll(){Object.keys(pool).forEach(function(id){if(pool[id]&&pool[id].iframe)pool[id].iframe.classList.add("maq-frame-hidden");});}
  function routeFor(modulo){if(!modulo)return "maq-pendiente.html";if(modulo.estado&&modulo.estado!=="activo")return U.buildPendingUrl?U.buildPendingUrl(modulo):"maq-pendiente.html";return modulo.ruta;}

  function ensureBaseLocalReady(){
    if(state.baseLocalReady){return true;}
    try{
      if(window.MAQ_BASELOCAL_SESSION&&typeof window.MAQ_BASELOCAL_SESSION.ensureReady==="function"){
        var status=window.MAQ_BASELOCAL_SESSION.ensureReady();
        state.baseLocalReady=true;
        if(U.status){U.status("Base Local preparada en memoria: "+(status.students||0)+" estudiante(s).");}
        if(U.memory){U.memory("Base Local en memoria · "+(status.periods||0)+" período(s)");}
        return true;
      }
    }catch(error){console.warn("[MAQ_CORE] Base Local no se pudo preparar",error);if(U.status)U.status("Base Local local disponible con modo seguro.");}
    state.baseLocalReady=true;
    return true;
  }

  function makeFrame(modulo, options){
    options=options||{};
    ensureBaseLocalReady();
    var h=host();if(!h)return null;
    var iframe=document.createElement("iframe");
    iframe.className="maq-frame maq-frame-hidden";
    iframe.title="Módulo: "+modulo.nombre;
    iframe.src=routeFor(modulo);
    iframe.dataset.moduleId=modulo.id;
    if(options.preload===true){iframe.dataset.preloaded="true";}
    iframe.addEventListener("load",function(){
      if(state.moduloActivoId===modulo.id){if(U.status)U.status("Pantalla activa: "+modulo.nombre);}
      else if(options.preload===true){if(U.memory)U.memory("Precargada: "+modulo.nombre+" · "+Object.keys(pool).length+" pantalla(s)");}
    });
    h.appendChild(iframe);
    return iframe;
  }

  function ensureFrame(moduloId, options){
    var modulo=Registry.buscarPorId?Registry.buscarPorId(moduloId):null;
    if(!modulo){return null;}
    if(!pool[moduloId]){pool[moduloId]={iframe:makeFrame(modulo,options||{}),rutaBase:routeFor(modulo),nombre:modulo.nombre,estado:modulo.estado,preloaded:!!(options&&options.preload)};}
    return pool[moduloId];
  }

  function preloadNext(queue,index){
    if(index>=queue.length){state.preloadFinished=true;if(U.memory)U.memory("Pantallas listas en memoria: "+Object.keys(pool).length);emit("preload:finished",{total:Object.keys(pool).length});return;}
    var id=queue[index];
    if(id&&id!==state.moduloActivoId&&!pool[id]){
      var item=ensureFrame(id,{preload:true});
      if(item&&item.iframe){item.iframe.classList.add("maq-frame-hidden");}
    }
    setTimeout(function(){preloadNext(queue,index+1);},PRELOAD_STEP_MS);
  }

  function schedulePreload(){
    if(state.preloadStarted){return;}
    state.preloadStarted=true;
    setTimeout(function(){
      try{
        var available=PRELOAD_ORDER.filter(function(id){return !!(Registry.buscarPorId&&Registry.buscarPorId(id));});
        preloadNext(available,0);
      }catch(error){console.warn("[MAQ_CORE] Precarga detenida",error);}
    },PRELOAD_DELAY_MS);
  }

  function saveNav(current,previous){if(!U.save||!U.NAV_KEYS)return;U.save(U.NAV_KEYS.ultimoModuloId,current||null);U.save(U.NAV_KEYS.anteriorModuloId,previous||null);if(U.saveNavState)U.saveNavState({ultimoModuloId:current||null,anteriorModuloId:previous||null});}
  function navegarPorModuloId(moduloId){var modulo=Registry.buscarPorId?Registry.buscarPorId(moduloId):null;if(!modulo){console.error("[MAQ_CORE] Módulo no registrado:",moduloId);if(U.status)U.status("Módulo no registrado: "+moduloId);return;}ensureBaseLocalReady();if(state.moduloActivoId===moduloId){label(modulo.nombre);schedulePreload();return;}state.moduloAnteriorId=state.moduloActivoId;state.moduloActivoId=moduloId;saveNav(state.moduloActivoId,state.moduloAnteriorId);ensureFrame(moduloId,{preload:false});hideAll();if(pool[moduloId]&&pool[moduloId].iframe)pool[moduloId].iframe.classList.remove("maq-frame-hidden");label(modulo.nombre);if(U.memory)U.memory("En memoria: "+Object.keys(pool).length+" pantalla(s) + Base Local");emit("modulo:cambiado",{moduloId:moduloId,modulo:modulo,anteriorModuloId:state.moduloAnteriorId});schedulePreload();}
  function pantallaAnterior(){if(state.moduloAnteriorId){var prev=state.moduloAnteriorId;state.moduloAnteriorId=state.moduloActivoId;navegarPorModuloId(prev);return;}navegarPorModuloId(state.moduloInicialId);}
  function refrescarModuloActivo(){var id=state.moduloActivoId;var item=id?pool[id]:null;if(!item||!item.iframe)return;var sep=item.rutaBase.indexOf("?")>=0?"&":"?";item.iframe.src=item.rutaBase+sep+"_refresh="+Date.now();}
  function boot(){ensureBaseLocalReady();var btn=document.getElementById("maq-btn-refresh");if(btn)btn.addEventListener("click",refrescarModuloActivo);var prev=document.getElementById("maq-btn-prev");if(prev)prev.addEventListener("click",pantallaAnterior);} 
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot);else boot();
  window.MAQ_CORE={state:state,bus:{on:on,emit:emit},router:{navegarPorModuloId:navegarPorModuloId,pantallaAnterior:pantallaAnterior},actions:{refrescarModuloActivo:refrescarModuloActivo,ensureBaseLocalReady:ensureBaseLocalReady,schedulePreload:schedulePreload}};
})(window,document);
