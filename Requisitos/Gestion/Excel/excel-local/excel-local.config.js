/* =========================================================
Nombre completo: excel-local.config.js
Ruta o ubicación: /Requisitos/Gestion/Excel/excel-local/excel-local.config.js
Función o funciones:
- Configurar la base local del módulo Excel.
- Definir claves de localStorage para períodos, estudiantes, historial y snapshot.
Con qué se conecta:
- excel-local.storage.js
- excel-local.bridge.js
- excel-local.repo.js
========================================================= */
(function(window){
  "use strict";
  var CONFIG={
    version:"3.0.0",
    app:"Requisitos",
    module:"ExcelLocal",
    keys:{
      db:"REQ_EXCEL_LOCAL_DB_V3",
      snapshot:"REQ_EXCEL_LOCAL_SNAPSHOT_V3",
      meta:"REQ_EXCEL_LOCAL_META_V3"
    },
    defaults:{
      db:{periodos:{},estudiantes:{},historial:{},snapshots:{}},
      meta:{createdAt:"",updatedAt:"",version:"3.0.0"}
    }
  };
  function clone(v){return JSON.parse(JSON.stringify(v));}
  function getKey(name){return CONFIG.keys[name]||"";}
  window.ExcelLocalConfig={data:CONFIG,getKey:getKey,clone:clone};
})(window);
