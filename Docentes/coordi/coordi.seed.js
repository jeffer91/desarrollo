/*
=========================================================
Nombre completo: coordi.seed.js
Ruta o ubicación: /Docentes/coordi/coordi.seed.js
Función o funciones:
- Mantener la tabla base precargada de Carrera, Coordinador, Programa y Telegram.
- Servir como datos iniciales para la pantalla Coordi.
- Permitir restaurar la configuración base cuando sea necesario.
Con qué se une:
- coordi.app.js
- coordi.repo.js
- coordi.table.js
=========================================================
*/

(function () {
  "use strict";

  const BASE_ROWS = [
    {
      carrera: "Enfermería",
      coordinador: "Ana Emilia Guzman",
      programa: "Técnico Superior",
      telegram: "@emiliaguzmant"
    },
    {
      carrera: "Mecánica Automotriz",
      coordinador: "Dario Torres",
      programa: "Tecnología Superior",
      telegram: "@INGEDARIOTORRES"
    },
    {
      carrera: "Mecánica de Motos",
      coordinador: "Dario Torres",
      programa: "Tecnología Superior",
      telegram: "@INGEDARIOTORRES"
    },
    {
      carrera: "Diseño Multimedia",
      coordinador: "Javier Tapia",
      programa: "Tecnología Superior",
      telegram: "@JAVIERTAPIA28"
    },
    {
      carrera: "Marketing Digital y Comercio Electrónico",
      coordinador: "Javier Tapia",
      programa: "Tecnología Superior",
      telegram: "@JAVIERTAPIA28"
    },
    {
      carrera: "Marketing Digital y Comercio Electrónico TSU",
      coordinador: "Javier Tapia",
      programa: "Tecnología Universitaria",
      telegram: "@JAVIERTAPIA28"
    },
    {
      carrera: "Ventas",
      coordinador: "Javier Tapia",
      programa: "Tecnología Superior",
      telegram: "@JAVIERTAPIA28"
    },
    {
      carrera: "Desarrollo de Software",
      coordinador: "Juan Carlos Pazmiño",
      programa: "Tecnología Superior",
      telegram: "@JUANPAZMINO"
    },
    {
      carrera: "Desarrollo de Software y Ciberseguridad",
      coordinador: "Juan Carlos Pazmiño",
      programa: "Tecnología Universitaria",
      telegram: "@JUANPAZMINO"
    },
    {
      carrera: "Redes y Telecomunicaciones",
      coordinador: "Juan Carlos Pazmiño",
      programa: "Tecnología Superior",
      telegram: "@JUANPAZMINO"
    },
    {
      carrera: "Redes y Telecomunicaciones TSU",
      coordinador: "Juan Carlos Pazmiño",
      programa: "Tecnología Universitaria",
      telegram: "@JUANPAZMINO"
    },
    {
      carrera: "Estética Integral",
      coordinador: "Katherine Chamba",
      programa: "Tecnología Superior",
      telegram: "@Katherine_Chamba_21"
    },
    {
      carrera: "Educación Básica",
      coordinador: "Maria Eugenio Barre",
      programa: "Tecnología Superior",
      telegram: "@MBARREAVILA"
    },
    {
      carrera: "Educación Inicial",
      coordinador: "Maria Eugenio Barre",
      programa: "Tecnología Superior",
      telegram: "@MBARREAVILA"
    },
    {
      carrera: "Educación Inicial TSU",
      coordinador: "Maria Eugenio Barre",
      programa: "Tecnología Universitaria",
      telegram: "@MBARREAVILA"
    },
    {
      carrera: "Pedagogía",
      coordinador: "Maria Eugenio Barre",
      programa: "Tecnología Universitaria",
      telegram: "@MBARREAVILA"
    },
    {
      carrera: "Procesamiento de Alimentos",
      coordinador: "Mayra Molina",
      programa: "Tecnología Superior",
      telegram: "@may8605"
    },
    {
      carrera: "Administración",
      coordinador: "Rodrigo Espinoza",
      programa: "Tecnología Superior",
      telegram: "@RODRIGOESPINOZAITSQMET"
    },
    {
      carrera: "Administración de Empresas e inteligencia de negocios",
      coordinador: "Rodrigo Espinoza",
      programa: "Tecnología Universitaria",
      telegram: "@RODRIGOESPINOZAITSQMET"
    },
    {
      carrera: "Administración del Talento Humano",
      coordinador: "Rodrigo Espinoza",
      programa: "Tecnología Universitaria",
      telegram: ""
    },
    {
      carrera: "Contabilidad",
      coordinador: "Rodrigo Espinoza",
      programa: "Tecnología Superior",
      telegram: "@RODRIGOESPINOZAITSQMET"
    },
    {
      carrera: "Contabilidad y Tributación TSU",
      coordinador: "Rodrigo Espinoza",
      programa: "Tecnología Universitaria",
      telegram: "@RODRIGOESPINOZAITSQMET"
    },
    {
      carrera: "Gestión del Talento Humano",
      coordinador: "Rodrigo Espinoza",
      programa: "Tecnología Superior",
      telegram: ""
    },
    {
      carrera: "Seguridad y Prevención de Riesgos Laborales",
      coordinador: "Rodrigo Espinoza",
      programa: "Tecnología Superior",
      telegram: "@RODRIGOESPINOZAITSQMET"
    },
    {
      carrera: "Rehabilitación Física",
      coordinador: "Andrea Moreano",
      programa: "Tecnología Superior",
      telegram: ""
    },
    {
      carrera: "Seguridad Ciudadana y Orden Publico",
      coordinador: "Sonia Moreno",
      programa: "Tecnología Superior",
      telegram: "@Smoreno1"
    },
    {
      carrera: "Gastronomia",
      coordinador: "Amado Chiluisa",
      programa: "Tecnología Superior",
      telegram: ""
    }
  ];

  function getRows() {
    return BASE_ROWS.map((row, index) => ({
      id: `coordi_seed_${index + 1}`,
      carrera: row.carrera,
      coordinador: row.coordinador,
      programa: row.programa,
      telegram: row.telegram,
      updatedAt: new Date().toISOString()
    }));
  }

  window.CoordiSeed = {
    getRows
  };
})();