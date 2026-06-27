/* =========================================================
Nombre completo: infor.gemini.js
Ruta o ubicación: /Requisitos/Infor/core/infor.gemini.js
Función o funciones:
- Mantener la entrada local de Gemini para Infor.
- Cargar temporalmente la implementación vigente desde /Requisitos/Titulacion/core.
- Permitir que titulacion.html dependa de /Requisitos/Infor/core.
Con qué se conecta:
- ../frontend/titulacion.html
- ../../Titulacion/core/infor.gemini.js
========================================================= */
(function(document){
  "use strict";
  document.write('<script src="../../Titulacion/core/infor.gemini.js"><\/script>');
})(document);
