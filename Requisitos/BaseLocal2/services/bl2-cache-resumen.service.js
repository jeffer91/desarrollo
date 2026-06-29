/* =========================================================
Nombre completo: bl2-cache-resumen.service.js
Ruta o ubicación: /Requisitos/BaseLocal2/services/bl2-cache-resumen.service.js
Función o funciones:
- Guardar resultados calculados de Stats, Coordi y Reportes por filtros.
- Evitar recalcular la misma vista varias veces al cambiar pantallas.
- Mantener caché liviano en memoria y copia opcional en localStorage.
- Permitir invalidar también la copia persistente cuando Base Local cambia.
Con qué se conecta:
- repositories/bl2-stats.repo.js
- repositories/bl2-reportes.repo.js
- Stats, Coordi y Reportes
========================================================= */
(function(window){
  "use strict";

  var PREFIX = "REQ_BL2_CACHE_RESUMEN::";
  var memory = Object.create(null);
  var DEFAULT_TTL = 2500;

  function now(){return Date.now();}
  function iso(){return new Date().toISOString();}
  function stable(value){
    try{
      if(value == null){return "";}
      if(typeof value !== "object"){return String(value);}
      var out = {};
      Object.keys(value).sort().forEach(function(key){out[key]=value[key];});
      return JSON.stringify(out);
    }catch(error){return String(value || "");}
  }
  function key(scope, filters){return String(scope || "general") + "::" + stable(filters || {});}
  function readStorage(cacheKey){try{var raw=window.localStorage.getItem(PREFIX + cacheKey);return raw?JSON.parse(raw):null;}catch(error){return null;}}
  function writeStorage(cacheKey, payload){try{window.localStorage.setItem(PREFIX + cacheKey, JSON.stringify(payload));}catch(error){}return payload;}

  function removeStorage(scope){
    try{
      for(var i = window.localStorage.length - 1; i >= 0; i -= 1){
        var k = window.localStorage.key(i) || "";
        if(k.indexOf(PREFIX) !== 0){continue;}
        if(!scope || k.indexOf(PREFIX + scope + "::") === 0){window.localStorage.removeItem(k);}
      }
    }catch(error){}
  }

  function get(scope, filters, options){
    options = options || {};
    var cacheKey = key(scope, filters);
    var ttl = Number(options.ttl || DEFAULT_TTL) || DEFAULT_TTL;
    var item = memory[cacheKey] || readStorage(cacheKey);
    if(!item || !item.createdAtMs){return null;}
    if(options.force === true){return null;}
    if(now() - item.createdAtMs > ttl){return null;}
    return item.value || null;
  }

  function set(scope, filters, value, options){
    options = options || {};
    var cacheKey = key(scope, filters);
    var payload = {key:cacheKey, scope:scope, filters:filters || {}, value:value, createdAtMs:now(), createdAt:iso()};
    memory[cacheKey] = payload;
    if(options.persist !== false){writeStorage(cacheKey, payload);}
    return value;
  }

  function getOrSet(scope, filters, factory, options){
    var existing = get(scope, filters, options || {});
    if(existing){return existing;}
    var value = typeof factory === "function" ? factory() : null;
    return set(scope, filters, value, options || {});
  }

  function invalidate(scope){
    if(!scope){memory = Object.create(null);removeStorage("");return;}
    Object.keys(memory).forEach(function(k){if(k.indexOf(scope + "::") === 0){delete memory[k];}});
    removeStorage(scope);
  }

  function status(){return {ok:true, mode:"bl2_cache_resumen", items:Object.keys(memory).length, updatedAt:iso()};}

  window.BL2CacheResumen = {version:"2.0.0-alpha.2-invalidate-storage",key:key,get:get,set:set,getOrSet:getOrSet,invalidate:invalidate,status:status};
})(window);
