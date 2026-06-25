/* =========================================================
Nombre completo: maq-modulos-registry.js
Ruta o ubicación: /Requisitos/Maqueta/maq-modulos-registry.js
Función o funciones:
- Definir rutas internas reales del menú de Requisitos.
- Activar Requisito, BL, tabla, Ficha y Stats.
- Dejar módulos no recuperados como pendientes para evitar pantalla rota.
- Mantener Títulos solo como enlace preparado, sin modificar sus archivos.
Con qué se conecta:
- maq-config-service.js
- maq-core.js
========================================================= */
(function(window){
  "use strict";
  var base="..";
  var modules={
    carga_excel:{id:"carga_excel",nombre:"Requisito",ruta:base+"/Gestion/Excel/excel.html",estado:"activo"},
    baselocal:{id:"baselocal",nombre:"Bl",ruta:base+"/BaseLocal/baselocal.html",estado:"activo"},
    tabla_principal:{id:"tabla_principal",nombre:"tabla",ruta:base+"/Gestion/Tabla/tabla.html",estado:"activo"},
    ficha_estudiante:{id:"ficha_estudiante",nombre:"Ficha",ruta:base+"/Ficha/ficha.html",estado:"activo"},
    stat_main:{id:"stat_main",nombre:"Stats",ruta:base+"/Stats/stats.html",estado:"activo"},
    coordi:{id:"coordi",nombre:"Coordi",ruta:base+"/Coordi/coordi.html",estado:"pendiente",bloque:"Bloque 8"},
    modulo_reporte:{id:"modulo_reporte",nombre:"Repor",ruta:base+"/Reportes/repo.html",estado:"pendiente",bloque:"Bloque 9"},
    defart:{id:"defart",nombre:"Defensas",ruta:base+"/defart/defart.html",estado:"pendiente",bloque:"Bloque 10"},
    titulos_estudiante:{id:"titulos_estudiante",nombre:"Estudiantes",ruta:base+"/titulos/public/ta-titulo-articulo-estudiante.html",estado:"pendiente",bloque:"Títulos no tocado"},
    titulos_admin:{id:"titulos_admin",nombre:"Administrador",ruta:base+"/titulos/electron/admin/ta-titulo-articulo-administrador.html",estado:"pendiente",bloque:"Títulos no tocado"},
    titulos_coordinador:{id:"titulos_coordinador",nombre:"Coordinador",ruta:base+"/titulos/public/ta-titulo-articulo-coordinador.html",estado:"pendiente",bloque:"Títulos no tocado"},
    titulacion:{id:"titulacion",nombre:"Infor",ruta:base+"/Titulacion/frontend/titulacion.html",estado:"pendiente",bloque:"Bloque 11"}
  };
  function buscarPorId(id){return modules[String(id||"").trim()]||null;}
  function listar(){return Object.keys(modules).map(function(k){return modules[k];});}
  window.MAQ_MODULOS_REGISTRY={buscarPorId:buscarPorId,listar:listar};
})(window);
