/* =========================================================
Nombre completo: menu.routes.js
Ruta o ubicación: /audit/menu/menu.routes.js
Función o funciones:
- Registrar las opciones visibles del menú superior de Audit.
- Definir rutas y archivos de comprobación de SCAN y BL.
- Mantener el catálogo separado de la lógica visual del menú.
- Permitir agregar futuros módulos sin modificar menu.js.
========================================================= */

(function registerAuditMenuRoutes(window) {
  "use strict";

  var routes = [
    {
      id: "scan",
      label: "SCAN",
      badge: "01",
      title: "Escaneo de archivos comprimidos",
      description: "Carga, analiza y documenta la estructura completa de archivos ZIP.",
      href: "../scan/scan.index.html",
      probe: "../scan/scan.manifest.js",
      default: true
    },
    {
      id: "bl",
      label: "BL",
      badge: "02",
      title: "Base local",
      description: "Almacena, consulta y conecta la información procesada por los módulos de Audit.",
      href: "../bl/bl.index.html",
      probe: "../bl/bl.manifest.js"
    }
  ];

  window.AUDIT_MENU_ROUTES = routes.map(function cloneRoute(route) {
    return Object.freeze(Object.assign({}, route));
  });
})(window);
