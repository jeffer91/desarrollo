/* =========================================================
Nombre completo: menu.config.js
Ruta o ubicación: /Curriculo/menu/menu.config.js
Función o funciones:
- Definir la configuración central del menú Currículo
- Registrar Inicio, Base local, Carreras, Materias, PEA, Fichas, Actas y Control
- Centralizar rutas, títulos, descripciones y orden del menú
- Evitar rutas dispersas dentro del resto de archivos del menú
========================================================= */
(function attachCurriculoMenuConfig(window) {
  "use strict";

  var items = [
    {
      id: "inicio",
      title: "Inicio",
      shortTitle: "Inicio",
      icon: "⌂",
      hint: "Pantalla inicial de Currículo",
      description: "Acceso rápido a los módulos principales del área Currículo.",
      routeFromMenu: "internal:home",
      type: "internal"
    },
    {
      id: "base-local",
      title: "Base local",
      shortTitle: "Base local",
      icon: "BL",
      hint: "Centro de control local de Currículo",
      description: "Guardar, comparar, diagnosticar, respaldar y sincronizar la información local de Currículo.",
      routeFromMenu: "../Base%20local/bl.index.html",
      type: "frame"
    },
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
      id: "actas",
      title: "Actas",
      shortTitle: "Actas",
      icon: "A",
      hint: "Gestión de actas curriculares",
      description: "Construir y guardar actas de análisis curricular.",
      routeFromMenu: "../actas/act.index.html",
      type: "frame"
    },
    {
      id: "control",
      title: "Control",
      shortTitle: "Control",
      icon: "✓",
      hint: "Control general de PEA, fichas y actas",
      description: "Revisar el estado general de la información curricular.",
      routeFromMenu: "../control/ctl.index.html",
      type: "frame"
    }
  ];

  window.CurriculoMenuConfig = {
    appId: "curriculo",
    appTitle: "Currículo",
    appSubtitle: "Menú principal",
    defaultItemId: "inicio",
    storageKey: "curriculo_menu_last_id",
    items: items
  };
})(window);
