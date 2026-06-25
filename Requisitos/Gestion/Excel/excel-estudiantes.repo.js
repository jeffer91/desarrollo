/* =========================================================
Nombre completo: excel-estudiantes.repo.js
Ruta o ubicación: /Requisitos/Gestion/Excel/excel-estudiantes.repo.js
Función o funciones:
- Repositorio de estudiantes local para compatibilidad.
- Lee estudiantes desde ExcelLocalRepo.
Con qué se conecta:
- excel-local.repo.js
========================================================= */
(function(window){
  "use strict";
  function listAll(){return window.ExcelLocalRepo&&window.ExcelLocalRepo.listAllStudents?window.ExcelLocalRepo.listAllStudents():[];}
  function listByPeriod(periodId){return window.ExcelLocalRepo&&window.ExcelLocalRepo.listStudentsByPeriod?window.ExcelLocalRepo.listStudentsByPeriod(periodId):[];}
  window.ExcelEstudiantesRepo={listAll:listAll,listByPeriod:listByPeriod};
})(window);
