/* ============================================================
  Nombre completo: demo-pvc.js
  Ruta: Titulacion/basedatos/seeds/demo-pvc.js

  Funcion:
  - Proveer datos demo para PVC.
  - Preparar integracion con frontend/js/pvc.
  - Mantener datos PVC separados del core principal.
============================================================ */

(function () {
  'use strict';

  window.TITULACION_SEED_PVC = {
    nombreCompleto: 'demo-pvc.js',
    ruta: 'Titulacion/basedatos/seeds/demo-pvc.js',

    secciones: [
      {
        id: 'pvc-aspectos-generales',
        titulo: 'PVC - Aspectos generales',
        contenido: [
          'Esta sección presenta los aspectos generales del plan de validación curricular.',
          'El contenido definitivo será provisto por el módulo PVC correspondiente.'
        ]
      },
      {
        id: 'pvc-marco-normativo',
        titulo: 'PVC - Marco normativo',
        contenido: [
          'Esta sección contiene referencias normativas relacionadas con PVC.',
          'La información puede ajustarse según los lineamientos institucionales.'
        ]
      },
      {
        id: 'pvc-fases',
        titulo: 'PVC - Fases',
        contenido: [
          'Esta sección describe las fases del proceso PVC.',
          'Cada fase podrá ampliarse desde los archivos especializados de PVC.'
        ]
      },
      {
        id: 'pvc-resultados',
        titulo: 'PVC - Resultados',
        contenido: [
          'Esta sección presentará resultados del proceso PVC.',
          'Los datos finales podrán conectarse con importación o almacenamiento local.'
        ]
      }
    ]
  };
})();