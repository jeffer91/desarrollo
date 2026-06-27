/* =========================================================
Nombre completo: infor.periodo.js
Ruta o ubicación: /Requisitos/Infor/core/infor.periodo.js
Función o funciones:
- Mantener la entrada local del módulo de períodos de Infor.
- Cargar temporalmente la implementación vigente desde /Requisitos/Titulacion/core.
- Permitir que titulacion.html dependa de /Requisitos/Infor/core.
Con qué se conecta:
- ../frontend/titulacion.html
- ../../Titulacion/core/infor.periodo.js
========================================================= */
(function(document){
  "use strict";
  document.write('<script src="../../Titulacion/core/infor.periodo.js"><\/script>');
})(document);
