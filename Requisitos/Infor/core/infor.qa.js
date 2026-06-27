/* =========================================================
Nombre completo: infor.qa.js
Ruta o ubicación: /Requisitos/Infor/core/infor.qa.js
Función o funciones:
- Mantener la entrada local de revisión rápida QA de Infor.
- Cargar temporalmente la implementación vigente desde /Requisitos/Titulacion/core.
- Permitir que titulacion.html dependa de /Requisitos/Infor/core.
Con qué se conecta:
- ../frontend/titulacion.html
- ../../Titulacion/core/infor.qa.js
========================================================= */
(function(document){
  "use strict";
  document.write('<script src="../../Titulacion/core/infor.qa.js"><\/script>');
})(document);
