/* =========================================================
Nombre completo: infor.excel.js
Ruta o ubicación: /Requisitos/Infor/core/infor.excel.js
Función o funciones:
- Mantener la entrada local del lector Excel de Infor.
- Cargar temporalmente la implementación vigente desde /Requisitos/Titulacion/core.
- Permitir que titulacion.html dependa de /Requisitos/Infor/core.
Con qué se conecta:
- ../frontend/titulacion.html
- ../../Titulacion/core/infor.excel.js
========================================================= */
(function(document){
  "use strict";
  document.write('<script src="../../Titulacion/core/infor.excel.js"><\/script>');
})(document);
