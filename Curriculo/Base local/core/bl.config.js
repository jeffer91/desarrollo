/*
  Base local BL - Curriculo
  Archivo: bl.config.js
  Funcion: configuracion central del motor local.
*/
(function (window) {
  'use strict';

  const BL = window.CurriculoBL = window.CurriculoBL || {};

  const CONFIG = {
    version: '1.0.0',
    nombre: 'Base local',
    moduloPadre: 'Curriculo',
    descripcion: 'Centro de control local para guardar, comparar y sincronizar informacion de Curriculo.',
    basePath: 'Curriculo/Base local',
    tipoBaseInicial: 'JSON',
    tipoBaseFutura: 'SQLite',

    reglas: {
      cargarUnaVezAlDia: true,
      sincronizarUnaVezAlDia: true,
      compararPorFechaYHora: true,
      localFaltanteEnFirebase: 'subir-a-firebase',
      firebaseMasNuevo: 'actualizar-base-local',
      campoNuevoDetectado: 'guardar-y-marcar-para-revision',
      estadoSincronizacionVisible: 'consola'
    },

    estadosRegistro: Object.freeze({
      ACTIVO: 'activo',
      PENDIENTE: 'pendiente',
      SINCRONIZADO: 'sincronizado',
      CONFLICTO: 'conflicto',
      ERROR: 'error'
    }),

    archivos: Object.freeze({
      registros: 'data/bl.registros.json',
      historial: 'data/bl.historial.json',
      errores: 'data/bl.errores.json',
      conflictos: 'data/bl.conflictos.json',
      estado: 'data/bl.estado.json',
      camposNuevos: 'data/bl.campos-nuevos.json',
      logs: 'logs/bl.log.json'
    }),

    storageKeys: Object.freeze({
      registros: 'curriculo_bl_registros',
      historial: 'curriculo_bl_historial',
      errores: 'curriculo_bl_errores',
      conflictos: 'curriculo_bl_conflictos',
      estado: 'curriculo_bl_estado',
      camposNuevos: 'curriculo_bl_campos_nuevos',
      logs: 'curriculo_bl_logs',
      ultimoArranque: 'curriculo_bl_ultimo_arranque',
      ultimaSincronizacion: 'curriculo_bl_ultima_sincronizacion'
    }),

    modulos: Object.freeze([
      'carreras',
      'materias',
      'fichas',
      'actas',
      'pea_documentos',
      'control',
      'menu'
    ]),

    identificadoresRegistro: Object.freeze([
      'idLocal',
      'idFirebase',
      'nombre',
      'modulo',
      'ruta'
    ]),

    tiempos: Object.freeze({
      unDiaMs: 24 * 60 * 60 * 1000
    })
  };

  BL.config = Object.freeze(CONFIG);

  BL.obtenerConfig = function obtenerConfig() {
    return JSON.parse(JSON.stringify(CONFIG));
  };

  if (window.console && typeof window.console.info === 'function') {
    window.console.info('[BL Curriculo] Configuracion cargada:', CONFIG.nombre, CONFIG.version);
  }
})(window);
