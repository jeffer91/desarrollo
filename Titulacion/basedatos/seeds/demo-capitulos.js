/* ============================================================
  Nombre completo: demo-capitulos.js
  Ruta: Titulacion/basedatos/seeds/demo-capitulos.js

  Funcion:
  - Proveer secciones demo para capitulos.
  - Preparar la integracion con frontend/js/capitulos.
  - Mantener datos separados de la logica de renderizado.
============================================================ */

(function () {
  'use strict';

  window.TITULACION_SEED_CAPITULOS = {
    nombreCompleto: 'demo-capitulos.js',
    ruta: 'Titulacion/basedatos/seeds/demo-capitulos.js',

    secciones: [
      {
        id: 'marco-legal',
        titulo: 'Marco legal',
        contenido: [
          'Esta sección contiene la base normativa aplicable al proceso de titulación.',
          'El contenido definitivo deberá alimentarse desde el módulo correspondiente.'
        ]
      },
      {
        id: 'reglamento-complexivo',
        titulo: 'Reglamento complexivo',
        contenido: [
          'Esta sección resume lineamientos relacionados con el examen complexivo.',
          'El módulo específico podrá reemplazar este contenido demo.'
        ]
      },
      {
        id: 'metodologia-nucleos',
        titulo: 'Metodología por núcleos',
        contenido: [
          'Esta sección describe la metodología de organización por núcleos temáticos.',
          'El contenido real podrá integrarse desde los archivos de capítulos.'
        ]
      },
      {
        id: 'resultados',
        titulo: 'Resultados',
        contenido: [
          'Esta sección presentará resultados académicos y datos relevantes del proceso.',
          'Los gráficos y tablas se integrarán en una etapa posterior.'
        ]
      }
    ]
  };
})();