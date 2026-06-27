/* =========================================================
Nombre completo: pdf.from-word.js
Ruta o ubicación: /Requisitos/Infor/export/pdf/pdf.from-word.js
Función o funciones:
- Mantener la entrada local de exportación PDF de Infor.
- Cargar temporalmente la implementación vigente desde /Requisitos/Titulacion/export/pdf.
- Permitir que la pantalla Infor dependa de /Requisitos/Infor/export.
Con qué se conecta:
- ../../frontend/titulacion.html
- ../../../Titulacion/export/pdf/pdf.from-word.js
========================================================= */
(function(document){
  "use strict";
  document.write('<script src="../../../Titulacion/export/pdf/pdf.from-word.js"><\/script>');
})(document);
