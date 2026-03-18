/*
=========================================================
Nombre del archivo: app.registry.js
Ruta o ubicación: /desarrollo/app/app.registry.js
Función o funciones:
- Define el catálogo central de módulos del proyecto
- Guarda título, grupo, descripción y ruta HTML real de cada módulo
- Expone funciones para listar, buscar y validar visibilidad
- Mantiene una sola entrada para Currículo apuntando a su menú principal
=========================================================
*/
(function attachAppRegistry(window) {
  "use strict";

  window.DESARROLLO = window.DESARROLLO || {};

  var modules = [
    {
      id: "audit",
      title: "Audit",
      group: "Auditoría",
      description: "Entrada principal del módulo de auditoría y escaneo UGPA.",
      path: "./audit/screens/shell/index.html"
    },
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
      id: "eventos",
      title: "Eventos",
      group: "Eventos",
      description: "Menú principal del sistema de eventos.",
      path: "./eventos/menu/menu.index.html"
    },
    {
      id: "requisitos",
      title: "Requisitos",
      group: "Requisitos",
      description: "Maqueta principal del bloque Requisitos.",
      path: "./Requisitos/Maqueta/maq-index.html"
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