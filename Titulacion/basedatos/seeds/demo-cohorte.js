/* ============================================================
  Nombre completo: demo-cohorte.js
  Ruta: Titulacion/basedatos/seeds/demo-cohorte.js

  Funcion:
  - Proveer datos demo de cohorte.
  - Separar informacion academica de los modulos principales.
  - Mantener carga directa por script clasico.
============================================================ */

(function () {
  'use strict';

  window.TITULACION_SEED_COHORTE = {
    nombreCompleto: 'demo-cohorte.js',
    ruta: 'Titulacion/basedatos/seeds/demo-cohorte.js',

    cohorte: {
      institucion: 'Instituto Superior Tecnológico',
      carrera: 'Carrera demostrativa',
      periodo: 'Periodo académico demo',
      modalidad: 'Titulación',
      responsable: 'Coordinación académica'
    },

    secciones: [
      {
        id: 'informe-cohorte',
        titulo: 'Informe de cohorte',
        contenido: [
          'Esta sección consolida información general de la cohorte académica.',
          'Los datos aquí mostrados son demostrativos y pueden reemplazarse por información real del proceso de titulación.'
        ]
      },
      {
        id: 'resumen-cohorte',
        titulo: 'Resumen de cohorte',
        contenido: [
          'La cohorte agrupa estudiantes, resultados, observaciones y avances del proceso.',
          'Esta información sirve como base para generar reportes posteriores.'
        ]
      }
    ]
  };
})();