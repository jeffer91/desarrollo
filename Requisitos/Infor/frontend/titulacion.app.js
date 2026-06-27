/* =========================================================
Nombre completo: titulacion.app.js
Ruta o ubicación: /Requisitos/Infor/frontend/titulacion.app.js
Función o funciones:
- Mantener el archivo orquestador propio del módulo Infor desde la carpeta definitiva /Requisitos/Infor.
- Cargar temporalmente el orquestador vigente desde /Requisitos/Titulacion mientras se completa la migración interna.
- Preservar el orden de carga de scripts para no romper QA, Gemini, Word, PDF, BaseLocal ni cronogramas.
Con qué se conecta:
- titulacion.html
- ../../Titulacion/frontend/titulacion.app.js
========================================================= */
(function(document){
  "use strict";
  var legacy = "../../Titulacion/frontend/titulacion.app.js";
  if(document.currentScript){
    document.write('<script src="' + legacy + '"><\/script>');
  }
})(document);
