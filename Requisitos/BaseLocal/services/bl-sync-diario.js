/* =========================================================
Nombre completo: bl-sync-diario.js
Ruta o ubicación: /Requisitos/BaseLocal/services/bl-sync-diario.js
Función o funciones:
- Controlar la sincronización automática una vez al día.
- Evitar consultas repetidas a Firebase en el mismo día.
- Guardar estado diario en localStorage.
Con qué se conecta:
- baselocal.firebase.js
- baselocal.app.js
========================================================= */
(function(window){
  "use strict";

  var KEY = "REQ_BL_LAST_DAILY_SYNC";

  function now(){return new Date().toISOString();}
  function today(){return now().slice(0, 10);}

  function read(){
    try{
      var raw = window.localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : {date:"", lastRunAt:"", ok:false};
    }catch(error){
      return {date:"", lastRunAt:"", ok:false};
    }
  }

  function save(payload){
    var data = Object.assign({}, read(), payload || {}, {updatedAt:now()});
    try{
      window.localStorage.setItem(KEY, JSON.stringify(data));
    }catch(error){
      console.warn("[BLSyncDiario] Estado diario no guardado", error);
    }
    return data;
  }

  function shouldRun(forceRun){
    if(forceRun){return true;}
    var state = read();
    return state.date !== today() || state.ok !== true;
  }

  function markStarted(mode){
    return save({date:today(), mode:mode || "daily", startedAt:now(), ok:false, running:true, message:"Sincronización diaria iniciada."});
  }

  function markSuccess(summary){
    return save(Object.assign({}, summary || {}, {date:today(), lastRunAt:now(), ok:true, running:false, message:(summary && summary.message) || "Sincronización diaria completada."}));
  }

  function markError(error){
    var msg = error && error.message ? error.message : String(error || "Error desconocido");
    return save({date:today(), lastRunAt:now(), ok:false, running:false, errorMessage:msg, message:msg});
  }

  function skipped(){
    var state = read();
    return Object.assign({}, state, {ok:true, skipped:true, message:"La sincronización diaria ya se ejecutó hoy."});
  }

  window.BLSyncDiario = {key:KEY, today:today, read:read, save:save, shouldRun:shouldRun, markStarted:markStarted, markSuccess:markSuccess, markError:markError, skipped:skipped};
})(window);
