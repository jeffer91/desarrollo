/*
=========================================================
Nombre completo: inc-menu.routes.js
Ruta o ubicación: /incorporaciones/menu/inc-menu.routes.js

Función o funciones:
1. Definir las rutas reales de las pantallas internas de Incorporaciones.
2. Organizar el menú superior con accesos directos y submenús.
3. Establecer Distribución como pantalla inicial.
4. Centralizar nombres, etiquetas y rutas para evitar errores de navegación.
5. Mantener Certificados fuera de Incorporaciones porque ahora es un módulo independiente.

Con qué se une:
- /incorporaciones/index.html
- /incorporaciones/menu/inc-menu.app.js
- /incorporaciones/menu/inc-menu.memory.js
- /incorporaciones/distribucion/distribucion.index.html
- /incorporaciones/guiones/guiones.index.html
- /incorporaciones/falt/falt.html
- /incorporaciones/sedes/admin.html
- /incorporaciones/sedes/estudiante.html
- /incorporaciones/sedes/estadisticas/index.html
- /incorporaciones/sedes/mensaje/mjs-index.html
=========================================================
*/

(function attachIncMenuRoutes(window) {
  "use strict";

  var DEFAULT_ROUTE_ID = "distribucion";

  var routes = [
    {
      id: "distribucion",
      type: "route",
      label: "Distribución",
      shortLabel: "Distribución",
      description: "Distribución de carreras y estudiantes por jornada.",
      path: "./distribucion/distribucion.index.html",
      group: "Principal",
      initial: true
    },
    {
      id: "guiones",
      type: "route",
      label: "Guiones",
      shortLabel: "Guiones",
      description: "Generación de guiones y programas de ceremonia.",
      path: "./guiones/guiones.index.html",
      group: "Principal"
    },
    {
      id: "faltantes",
      type: "route",
      label: "Faltantes",
      shortLabel: "Faltantes",
      description: "Mensajes para estudiantes con pagos o registros pendientes.",
      path: "./falt/falt.html",
      group: "Principal"
    },
    {
      id: "sedes",
      type: "group",
      label: "Sedes",
      shortLabel: "Sedes",
      description: "Pantallas antiguas del módulo de sedes.",
      children: [
        {
          id: "sedes-admin",
          type: "route",
          label: "Administrador",
          shortLabel: "Administrador",
          description: "Administración de sedes e incorporaciones.",
          path: "./sedes/admin.html",
          group: "Sedes"
        },
        {
          id: "sedes-estudiante",
          type: "route",
          label: "Estudiante",
          shortLabel: "Estudiante",
          description: "Vista de consulta para estudiantes.",
          path: "./sedes/estudiante.html",
          group: "Sedes"
        },
        {
          id: "sedes-estadisticas",
          type: "route",
          label: "Estadísticas",
          shortLabel: "Estadísticas",
          description: "Estadísticas antiguas del módulo de sedes.",
          path: "./sedes/estadisticas/index.html",
          group: "Sedes"
        },
        {
          id: "sedes-mensajes",
          type: "route",
          label: "Mensajes",
          shortLabel: "Mensajes",
          description: "Pantalla antigua de mensajes por WhatsApp.",
          path: "./sedes/mensaje/mjs-index.html",
          group: "Sedes"
        }
      ]
    }
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function flattenRoutes(list) {
    var result = [];

    (list || []).forEach(function eachRoute(item) {
      if (!item) return;

      if (item.type === "group") {
        (item.children || []).forEach(function eachChild(child) {
          var copy = Object.assign({}, child);
          copy.parentId = item.id;
          copy.parentLabel = item.label;
          result.push(copy);
        });
        return;
      }

      result.push(Object.assign({}, item));
    });

    return result;
  }

  function getMenuItems() {
    return clone(routes);
  }

  function getFlatRoutes() {
    return flattenRoutes(routes);
  }

  function getRouteIds() {
    return getFlatRoutes().map(function mapId(route) {
      return route.id;
    });
  }

  function findRouteById(routeId) {
    var normalizedId = String(routeId || "").trim();
    var list = getFlatRoutes();

    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === normalizedId) {
        return list[i];
      }
    }

    return null;
  }

  function isValidRoute(routeId) {
    return Boolean(findRouteById(routeId));
  }

  function getDefaultRouteId() {
    return DEFAULT_ROUTE_ID;
  }

  function getDefaultRoute() {
    return findRouteById(DEFAULT_ROUTE_ID);
  }

  window.IncMenuRoutes = {
    getMenuItems: getMenuItems,
    getFlatRoutes: getFlatRoutes,
    getRouteIds: getRouteIds,
    findRouteById: findRouteById,
    isValidRoute: isValidRoute,
    getDefaultRouteId: getDefaultRouteId,
    getDefaultRoute: getDefaultRoute
  };
})(window);
