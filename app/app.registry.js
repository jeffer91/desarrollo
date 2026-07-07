/*
=========================================================
Nombre completo: app.registry.js
Ruta o ubicación: /desarrollo/app/app.registry.js
Función o funciones:
1. Define el catálogo central de módulos del proyecto desarrollo.
2. Guarda título, grupo, descripción y ruta HTML real de cada módulo.
3. Expone funciones para listar, buscar y validar visibilidad.
4. Mantiene Certificados como apartado independiente del módulo Incorporaciones.
5. Mantiene los módulos principales separados para evitar sobrecargar el launcher.
6. Agrega el módulo Libro como entorno independiente por bloques.
=========================================================
*/

(function attachAppRegistry(window) {
  "use strict";

  window.DESARROLLO = window.DESARROLLO || {};

  var modules = [
    {
      id: "curriculo",
      title: "Currículo",
      group: "Currículo",
      description: "Menú principal del módulo Currículo con acceso a Carrera y Materias.",
      path: "./Curriculo/menu/menu.index.html"
    },
    {
      id: "docentes",
      title: "Docentes",
      group: "Docentes",
      description: "Menú principal del bloque Docentes.",
      path: "./Docentes/menu/menu.shell.html"
    },
    {
      id: "documentos",
      title: "Documentos",
      group: "Documentos",
      description: "Entrada principal del bloque Documentos.",
      path: "./Documentos/index.html"
    },
    {
      id: "libro",
      title: "Libro",
      group: "Libro",
      description: "Carga de la materia con carrera, materia, información base, contenidos y actividades.",
      path: "./libro/index.html"
    },
    {
      id: "certificados",
      title: "Certificados",
      group: "Certificados",
      description: "Generación independiente de certificados institucionales, reconocimientos y capacitaciones.",
      path: "./incorporaciones/certificados/certi.index.html"
    },
    {
      id: "incorporaciones",
      title: "Incorporaciones",
      group: "Titulación",
      description: "Entorno para distribución, guiones, faltantes, sedes y gestión de incorporación.",
      path: "./incorporaciones/index.html"
    }
  ];

  function normalize(value) {
    return String(value == null ? "" : value)
      .trim()
      .toLowerCase();
  }

  function buildSearchText(moduleItem) {
    return normalize([
      moduleItem.id,
      moduleItem.title,
      moduleItem.group,
      moduleItem.description,
      moduleItem.path
    ].join(" "));
  }

  function all() {
    return modules.slice();
  }

  function getById(id) {
    var wanted = normalize(id);

    return modules.find(function findModule(moduleItem) {
      return normalize(moduleItem.id) === wanted;
    }) || null;
  }

  function search(term) {
    var wanted = normalize(term);

    if (!wanted) {
      return all();
    }

    return modules.filter(function filterModule(moduleItem) {
      return buildSearchText(moduleItem).indexOf(wanted) >= 0;
    });
  }

  function isVisible(moduleId, searchTerm) {
    var wantedId = normalize(moduleId);

    return search(searchTerm).some(function someModule(moduleItem) {
      return normalize(moduleItem.id) === wantedId;
    });
  }

  window.DESARROLLO.Registry = {
    all: all,
    getById: getById,
    search: search,
    isVisible: isVisible
  };
})(window);
