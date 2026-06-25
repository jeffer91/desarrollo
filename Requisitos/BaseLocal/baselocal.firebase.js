/* =========================================================
Nombre completo: baselocal.firebase.js
Ruta o ubicación: /Requisitos/BaseLocal/baselocal.firebase.js
Función o funciones:
- Dejar una capa segura para Firebase sin activar sincronización todavía.
- Evitar errores mientras el bloque de sincronización no se recupera.
Con qué se conecta:
- baselocal.app.js
========================================================= */
(function(window){
  "use strict";
  async function pending(){return {ok:false,skipped:true,message:"Firebase se recupera en el bloque de sincronización."};}
  window.BaseLocalFirebase={push:pending,pull:pending,compare:pending,getLastStatus:function(){return {ok:false,mode:"pendiente"};}};
})(window);
