/* ============================================================
  Nombre completo: titulacion-data-demo.js
  Ruta: Titulacion/basedatos/titulacion-data-demo.js

  Funcion:
  - Proveer datos iniciales de demostracion.
  - Evitar lectura por fetch para funcionar en file://.
  - Exponer datos en window.TITULACION_DATA_DEMO.
============================================================ */

(function () {
  'use strict';

  window.TITULACION_DATA_DEMO = {
    nombreCompleto: 'titulacion-data-demo.js',
    ruta: 'Titulacion/basedatos/titulacion-data-demo.js',

    titulo: 'Documento de Titulación',
    subtitulo: 'Base demo inicial del sistema',

    secciones: [
      {
        id: 'portada',
        titulo: 'Portada',
        contenido: [
          'Instituto Superior Tecnológico.',
          'Sistema de apoyo para generación de documentos de titulación.',
          'Documento base compatible con ejecución local, Live Server y Electron.'
        ]
      },
      {
        id: 'introduccion',
        titulo: 'Introducción',
        contenido: [
          'La aplicación se estructura en tres capas: frontend, backend y basedatos.',
          'El frontend funciona de forma autónoma y no depende de un servidor para iniciar.',
          'El backend se utiliza únicamente cuando la aplicación se ejecuta en Electron.'
        ]
      },
      {
        id: 'objetivo-general',
        titulo: 'Objetivo general',
        contenido: [
          'Organizar y generar documentos de titulación mediante una aplicación local compatible con distintos modos de ejecución.'
        ]
      },
      {
        id: 'objetivos-especificos',
        titulo: 'Objetivos específicos',
        contenido: [
          'Mantener una estructura clara y separada por responsabilidades.',
          'Permitir ejecución directa desde archivo local.',
          'Permitir ejecución desde Live Server.',
          'Permitir ejecución en modo escritorio mediante Electron.'
        ]
      }
    ]
  };
})();