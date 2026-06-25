/* =========================================================
Nombre completo: maq-utils.js
Ruta o ubicación: /Requisitos/Maqueta/maq-utils.js
Función o funciones:
- Centralizar utilidades de texto, localStorage y navegación.
- Guardar memoria rápida de la pantalla activa sin tocar Firebase.
Con qué se conecta:
- maq-core.js
- maq-menu.js
========================================================= */
(function(window){"use strict";var NAV_KEYS={ultimoModuloId:"REQ_MAQ_ULTIMO_MODULO",anteriorModuloId:"REQ_MAQ_ANTERIOR_MODULO",historial:"REQ_MAQ_HISTORIAL"};function text(v){return String(v==null?"":v).trim();}function save(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch(e){console.warn("[MAQ_UTILS] No se pudo guardar",key,e);}}function read(key,fallback){try{var raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}}function escapeHtml(v){return text(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");}function saveNavState(state){save(NAV_KEYS.historial,Object.assign({actualizadoEn:new Date().toISOString()},state||{}));}function readNavState(){return read(NAV_KEYS.historial,null);}window.MAQ_UTILS={NAV_KEYS:NAV_KEYS,text:text,save:save,read:read,escapeHtml:escapeHtml,saveNavState:saveNavState,readNavState:readNavState};})(window);
