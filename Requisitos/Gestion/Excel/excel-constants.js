/* =========================================================
Nombre completo: excel-constants.js
Ruta o ubicación: /Requisitos/Gestion/Excel/excel-constants.js
Función o funciones:
- Definir encabezados esperados, campos críticos y requisitos académicos.
- Centralizar alias para leer Excel con nombres de columnas variables.
Con qué se conecta:
- excel-reader.js
- excel-logic.js
- excel-estados.js
========================================================= */
(function(window){
  "use strict";
  var EXPECTED_HEADERS=[
    "numeroidentificacion","nombres","codigocarrera","nombrecarrera","sede","horariocomplexivo",
    "academico","documentacion","financiero","titulacion","practicasvinculacion","vinculacion",
    "seguimientograduados","ingles","actualizaciondatos","correopersonal","correoinstitucional",
    "celular","aprobaciontitulacion","aprobacioncomplexivoproyecto"
  ];
  var CRITICAL_HEADERS=["numeroidentificacion","nombres","codigocarrera","nombrecarrera"];
  var REQUISITOS=[
    "academico","documentacion","financiero","titulacion","practicasvinculacion","vinculacion",
    "seguimientograduados","ingles","actualizaciondatos","aprobaciontitulacion","aprobacioncomplexivoproyecto"
  ];
  var FIELD_ALIASES={
    numeroidentificacion:["numeroidentificacion","numero identificacion","número identificación","cedula","cédula","ci","identificacion","identificación"],
    nombres:["nombres","nombre","estudiante","apellidosynombres","apellidos y nombres","nombres completos"],
    codigocarrera:["codigocarrera","codigo carrera","código carrera","cod carrera"],
    nombrecarrera:["nombrecarrera","nombre carrera","carrera","programa"],
    sede:["sede","campus"],
    horariocomplexivo:["horariocomplexivo","horario complexivo","horario"],
    academico:["academico","académico"],
    documentacion:["documentacion","documentación","documentos"],
    financiero:["financiero","finanzas"],
    titulacion:["titulacion","titulación"],
    practicasvinculacion:["practicasvinculacion","prácticasvinculación","practicas vinculacion","prácticas vinculación","practicas/vinculacion"],
    vinculacion:["vinculacion","vinculación"],
    seguimientograduados:["seguimientograduados","seguimiento graduados","seguimiento a graduados"],
    ingles:["ingles","inglés","segunda lengua"],
    actualizaciondatos:["actualizaciondatos","actualización datos","actualizacion datos","actualización de datos"],
    correopersonal:["correopersonal","correo personal","email personal"],
    correoinstitucional:["correoinstitucional","correo institucional","email institucional"],
    celular:["celular","telefono","teléfono","whatsapp"],
    aprobaciontitulacion:["aprobaciontitulacion","aprobación titulación","aprobacion titulacion"],
    aprobacioncomplexivoproyecto:["aprobacioncomplexivoproyecto","aprobación complexivo proyecto","aprobacion complexivo proyecto","aprobacion complexivo/proyecto"]
  };
  window.ExcelConstants={EXPECTED_HEADERS:EXPECTED_HEADERS,CRITICAL_HEADERS:CRITICAL_HEADERS,REQUISITOS:REQUISITOS,FIELD_ALIASES:FIELD_ALIASES};
})(window);
