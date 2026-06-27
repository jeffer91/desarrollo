/* =========================================================
Nombre completo: word.export.js
Ruta o ubicación: /Requisitos/Infor/export/word/word.export.js
Función o funciones:
- Mantener la entrada local de exportación Word de Infor.
- Cargar temporalmente la implementación vigente desde /Requisitos/Titulacion/export/word.
- Permitir que la pantalla Infor dependa de /Requisitos/Infor/export.
Con qué se conecta:
- ../../frontend/titulacion.html
- ../../../Titulacion/export/word/word.export.js
========================================================= */
(function(document){
  "use strict";
  document.write('<script src="../../../Titulacion/export/word/word.export.js"><\/script>');
})(document);
