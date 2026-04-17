/* =========================================================
Nombre del archivo: menu.routes.js
Ruta - Ubicación: /menu/menu.routes.js
Función o funciones:
- Lista única de rutas para el menú superior
- Controla el orden, etiquetas y rutas
- Define la pantalla inicial por defecto

✅ CORRECCIÓN APLICADA:
- Se mantiene eliminada la opción "Listado docente".
- Se agrega la opción "Formación" apuntando al módulo:
  /formacion/frontend/for.index.html
- Se conserva la opción "Documentos" apuntando al módulo:
  /control/ctr.docs/frontend/ctr.index.html
- Se conserva la opción "Estadísticas" apuntando a:
  /stats/frontend/stats.index.html
========================================================= */

export const MENU_ROUTES = [
  {
    id: "regDocentes",
    label: "Registro docentes",
    // Ruta real del módulo de registro de docentes
    // menu.shell.html vive en /menu por lo que se usa ../
    href: "../registro.manage/regman.index.html",
    // Pantalla inicial al abrir la aplicación
    default: true
  },
  {
    id: "regCapacitacion",
    label: "Registro capacitación",
    // Ruta correcta del módulo de gestión de capacitaciones
    href: "../cap.manage/cap.manage.index.html"
  },
  {
    id: "asigDocente",
    label: "Asignación docente",
    // Ruta correcta del módulo de asignación
    href: "../cap.assign/cap.assign.index.html"
  },
  {
    id: "formacion",
    label: "Formación",
    // Ruta correcta del módulo de formación docente
    href: "../formacion/frontend/for.index.html"
  },
  {
    id: "ctrDocs",
    label: "Documentos",
    // Pantalla independiente de documentos
    href: "../control/ctr.docs/frontend/ctr.index.html"
  },
  {
    id: "estadisticas",
    label: "Estadísticas",
    // Ruta correcta del módulo de estadísticas
    href: "../stats/frontend/stats.index.html"
  }
];