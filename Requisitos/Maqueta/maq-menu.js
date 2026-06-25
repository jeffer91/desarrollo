/* =========================================================
Nombre completo: maq-menu.js
Ruta o ubicación: /Requisitos/Maqueta/maq-menu.js
Función o funciones:
- Renderizar menú superior fijo.
- Manejar desplegable de Títulos.
- Abrir por defecto Excel/Requisito.
Con qué se conecta:
- maq-config-service.js
- maq-core.js
========================================================= */
(function(window,document){
  "use strict";
  var Config=window.MAQ_CONFIG_SERVICE||{};var Core=window.MAQ_CORE||{};var Registry=window.MAQ_MODULOS_REGISTRY||{};
  var state={items:[],initial:"carga_excel"};var floating=null,owner=null;
  function closeSub(){if(floating&&floating.parentNode)floating.parentNode.removeChild(floating);floating=null;owner=null;}
  function posSub(btn){if(!floating||!btn)return;var r=btn.getBoundingClientRect();floating.style.left=Math.round(r.left)+"px";floating.style.top=Math.round(r.bottom+8)+"px";}
  function findMenuIdByModule(moduleId){var target=String(moduleId||"");function walk(items){for(var i=0;i<items.length;i++){var it=items[i];if(it.tipo==="modulo"&&it.moduloId===target)return "menu_"+target;if(it.tipo==="grupo"){var f=walk(it.hijos||[]);if(f)return f;}}return null;}return walk(state.items);}
  function activeByMenuId(id){document.querySelectorAll(".maq-menu-item").forEach(function(btn){btn.classList.toggle("maq-active",btn.dataset.menuId===id);});}
  function moduleInfo(item){return Registry.buscarPorId?Registry.buscarPorId(item&&item.moduloId):null;}
  function openModule(item){if(!item||item.tipo!=="modulo"||!item.moduloId)return;Core.router.navegarPorModuloId(item.moduloId);activeByMenuId("menu_"+item.moduloId);}
  function submenu(group,btn){closeSub();var box=document.createElement("div");box.className="maq-submenu";(group.hijos||[]).forEach(function(child){var mod=moduleInfo(child);var opt=document.createElement("div");opt.className="maq-submenu-item";opt.innerHTML='<span>'+child.etiqueta+'</span>'+(mod&&mod.estado!=="activo"?'<span class="maq-submenu-pill">pendiente</span>':'');opt.addEventListener("click",function(ev){ev.stopPropagation();openModule(child);closeSub();});box.appendChild(opt);});box.addEventListener("mouseleave",closeSub);document.body.appendChild(box);floating=box;owner=btn;posSub(btn);} 
  function button(item){var btn=document.createElement("button");btn.type="button";btn.className="maq-menu-item";btn.textContent=item.etiqueta||item.moduloId||item.id;btn.dataset.menuId=item.tipo==="grupo"?"grp_"+item.id:"menu_"+item.moduloId;var mod=moduleInfo(item);if(mod&&mod.estado!=="activo")btn.classList.add("maq-pending");if(item.tipo==="grupo"){btn.classList.add("maq-menu-item-has-sub");btn.addEventListener("mouseenter",function(){submenu(item,btn);});btn.addEventListener("click",function(ev){ev.stopPropagation();submenu(item,btn);});}else{btn.addEventListener("click",function(){closeSub();openModule(item);});}return btn;}
  function render(items){var nav=document.getElementById("maq-main-menu");if(!nav)return;state.items=items||[];nav.innerHTML="";state.items.forEach(function(item){nav.appendChild(button(item));});}
  function init(){if(!Config.obtenerConfigEfectiva||!Core.router)return;Config.obtenerConfigEfectiva().then(function(cfg){var items=Config.construirItemsMenu(cfg);state.initial=cfg.moduloInicial||"carga_excel";render(items);Core.bus.on("modulo:cambiado",function(payload){activeByMenuId(findMenuIdByModule(payload&&payload.moduloId));});Core.router.navegarPorModuloId(state.initial);activeByMenuId("menu_"+state.initial);});}
  document.addEventListener("click",closeSub);window.addEventListener("resize",function(){if(floating&&owner)posSub(owner);});if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init);else init();window.MAQ_MENU={inicializarMenu:init};
})(window,document);
