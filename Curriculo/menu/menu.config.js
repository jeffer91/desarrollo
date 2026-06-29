/* =========================================================
Nombre completo: menu.config.js
Ruta o ubicación: /Curriculo/menu/menu.config.js
Función o funciones:
- Definir la configuración central del menú Currículo
- Registrar solo los módulos activos del menú superior
- Iniciar Currículo directamente en Carreras
- Mantener Base al final del menú
========================================================= */
(function attachCurriculoMenuConfig(window) {
  "use strict";

  var items = [
    {
      id: "carreras",
      title: "Carreras",
      shortTitle: "Carreras",
      icon: "C",
      hint: "Gestión de carreras",
      description: "Crear, revisar y actualizar carreras activas del currículo.",
      routeFromMenu: "../carreras/frontend/carr.index.html",
      type: "frame"
    },
    {
      id: "materias",
      title: "Materias",
      shortTitle: "Materias",
      icon: "M",
      hint: "Gestión de materias",
      description: "Administrar materias por carrera, nivel y tipo de carga.",
      routeFromMenu: "../materias/mat.index.html",
      type: "frame"
    },
    {
      id: "pea",
      title: "PEA",
      shortTitle: "PEA",
      icon: "P",
      hint: "Gestión de PEA y versiones",
      description: "Cargar, comparar, revisar y exportar documentos PEA.",
      routeFromMenu: "../pea_documentos/pea.index.html",
      type: "frame"
    },
    {
      id: "fichas",
      title: "Fichas",
      shortTitle: "Fichas",
      icon: "F",
      hint: "Gestión de fichas curriculares",
      description: "Generar fichas curriculares desde carrera, materia y PEA.",
      routeFromMenu: "../fichas/fch.index.html",
      type: "frame"
    },
    {
      id: "base-local",
      title: "Base local",
      shortTitle: "Base",
      icon: "B",
      hint: "Centro de control local de Currículo",
      description: "Guardar, comparar, diagnosticar, respaldar y sincronizar la información local de Currículo.",
      routeFromMenu: "../Base%20local/bl.index.html",
      type: "frame"
    }
  ];

  window.CurriculoMenuConfig = {
    appId: "curriculo",
    appTitle: "Currículo",
    appSubtitle: "",
    defaultItemId: "carreras",
    storageKey: "curriculo_menu_last_id",
    items: items
  };
})(window);
