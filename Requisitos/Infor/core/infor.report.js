/* =========================================================
Nombre completo: infor.report.js
Ruta o ubicación: /Requisitos/Infor/core/infor.report.js
Función o funciones:
- Mantener la entrada local del motor de informe de Infor.
- Cargar temporalmente la implementación vigente desde /Requisitos/Titulacion/core.
- Permitir que titulacion.html dependa de /Requisitos/Infor/core.
Con qué se conecta:
- ../frontend/titulacion.html
- ../../Titulacion/core/infor.report.js
========================================================= */
(function(document){
  "use strict";
  document.write('<script src="../../Titulacion/core/infor.report.js"><\/script>');
})(document);
