/* =========================================================
Nombre del archivo: menu.config.js
Ubicación: /menu/menu.config.js
Función o funciones:
- Define la configuración del menú superior
- Define la ruta de inicio del dashboard
- Centraliza títulos y descripciones de módulos
========================================================= */
(function(){
  "use strict";

  const homeRoute = "menu/menu.index.html";

  const items = [
    {
      id: "forms",
      title: "Forms",
      desc: "Registro de eventos y pendientes.",
      routeFromRoot: "forms/forms.index.html"
    },
    {
      id: "prioridad",
      title: "Prioridad",
      desc: "Tablero de seguimiento con enfoque operativo.",
      routeFromRoot: "prioridad/prioridad.index.html"
    },
    {
      id: "cale",
      title: "Calendario",
      desc: "Vista por fecha para agenda y control.",
      routeFromRoot: "cale/cale.index.html"
    }
  ];

  window.MenuConfig = {
    brandTitle: "Eventos",
    brandHint: "Arquitectura modular",
    homeRoute,
    items
  };
})();