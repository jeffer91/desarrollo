/* =========================================================
Nombre completo: infor.state.js
Ruta o ubicación: /Requisitos/Infor/core/infor.state.js
Función o funciones:
- Mantener la entrada local de estado de Infor.
- Cargar temporalmente la implementación vigente desde /Requisitos/Titulacion/core.
- Permitir que titulacion.html dependa de /Requisitos/Infor/core.
Con qué se conecta:
- ../frontend/titulacion.html
- ../../Titulacion/core/infor.state.js
========================================================= */
(function(document){
  "use strict";
  document.write('<script src="../../Titulacion/core/infor.state.js"><\/script>');
})(document);
