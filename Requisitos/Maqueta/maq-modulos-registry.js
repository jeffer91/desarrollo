/* =========================================================
Nombre completo: maq-modulos-registry.js
Ruta o ubicación: /Requisitos/Maqueta/maq-modulos-registry.js
Función o funciones:
- Definir las rutas internas reales del menú de Requisitos.
- Mantener Títulos solo como enlace, sin modificar sus archivos.
- Llamar Titulación como Infor dentro del menú.
Con qué se conecta:
- maq-config-service.js
- maq-core.js
========================================================= */
(function(window){
  "use strict";
  var base="..";
  var modules={
    carga_excel:{id:"carga_excel",nombre:"Requisito",ruta:base+"/Gestion/Excel/excel.html"},
    baselocal:{id:"baselocal",nombre:"Bl",ruta:base+"/BaseLocal/baselocal.html"},
    tabla_principal:{id:"tabla_principal",nombre:"tabla",ruta:base+"/Gestion/Tabla/tabla.html"},
    ficha_estudiante:{id:"ficha_estudiante",nombre:"Ficha",ruta:base+"/Ficha/ficha.html"},
    stat_main:{id:"stat_main",nombre:"Stats",ruta:base+"/Stats/stats.html"},
    coordi:{id:"coordi",nombre:"Coordi",ruta:base+"/Coordi/coordi.html"},
    modulo_reporte:{id:"modulo_reporte",nombre:"Repor",ruta:base+"/Reportes/repo.html"},
    defart:{id:"defart",nombre:"Defensas",ruta:base+"/defart/defart.html"},
    titulos_estudiante:{id:"titulos_estudiante",nombre:"Estudiantes",ruta:base+"/titulos/public/ta-titulo-articulo-estudiante.html"},
    titulos_admin:{id:"titulos_admin",nombre:"Administrador",ruta:base+"/titulos/electron/admin/ta-titulo-articulo-administrador.html"},
    titulos_coordinador:{id:"titulos_coordinador",nombre:"Coordinador",ruta:base+"/titulos/public/ta-titulo-articulo-coordinador.html"},
    titulacion:{id:"titulacion",nombre:"Infor",ruta:base+"/Titulacion/frontend/titulacion.html"}
  };
  function buscarPorId(id){return modules[String(id||"").trim()]||null;}
  function listar(){return Object.keys(modules).map(function(k){return modules[k];});}
  window.MAQ_MODULOS_REGISTRY={buscarPorId:buscarPorId,listar:listar};
})(window);
