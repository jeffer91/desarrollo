/* =========================================================
Nombre del archivo: menu.config.js
Ruta o ubicación: /Curriculo/menu/menu.config.js
Función o funciones:
- Define la configuración del menú Currículo
- Registra las opciones Carrera y Materias
- Marca la ruta por defecto del módulo
- Centraliza títulos, ids y rutas del menú
========================================================= */

(function attachCurriculoMenuConfig(window) {
  "use strict";

  var items = [
    {
      id: "carrera",
      title: "Carrera",
      hint: "Gestión de carreras",
      routeFromMenu: "../carreras/frontend/carr.index.html"
    },
    {
      id: "materias",
      title: "Materias",
      hint: "Gestión de materias",
      routeFromMenu: "../materias/mat.index.html"
    }
  ];

  window.CurriculoMenuConfig = {
    appTitle: "Currículo",
    defaultItemId: "carrera",
    items: items
  };
})(window);