/* =========================================================
Nombre completo: infor.match.js
Ruta o ubicación: /Requisitos/Infor/core/infor.match.js
Función o funciones:
- Mantener la entrada local de unión Excel/BaseLocal de Infor.
- Cargar temporalmente la implementación vigente desde /Requisitos/Titulacion/core.
- Permitir que titulacion.html dependa de /Requisitos/Infor/core.
Con qué se conecta:
- ../frontend/titulacion.html
- ../../Titulacion/core/infor.match.js
========================================================= */
(function(document){
  "use strict";
  document.write('<script src="../../Titulacion/core/infor.match.js"><\/script>');
})(document);
