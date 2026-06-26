/*
  Base local BL - Curriculo
  Archivo: bl.storage.js
  Funcion: lectura y escritura local inicial usando localStorage, compatible con futura migracion a SQLite.
*/
(function (window) {
  'use strict';

  const BL = window.CurriculoBL = window.CurriculoBL || {};

  const DEFAULTS = {
    registros: {
      version: '1.0.0',
      moduloPadre: 'Curriculo',
      nombre: 'Base local - registros',
      ultimaActualizacion: null,
      registros: []
    },
    historial: {
      version: '1.0.0',
      moduloPadre: 'Curriculo',
      nombre: 'Base local - historial',
      historial: []
    },
    errores: {
      version: '1.0.0',
      moduloPadre: 'Curriculo',
      nombre: 'Base local - errores',
      errores: []
    },
    conflictos: {
      version: '1.0.0',
      moduloPadre: 'Curriculo',
      nombre: 'Base local - conflictos',
      conflictos: []
    },
    estado: {
      version: '1.0.0',
      moduloPadre: 'Curriculo',
      nombre: 'Base local - estado',
      cargaAutomatica: {
        activa: true,
        frecuencia: 'una vez al dia al abrir Curriculo',
        ultimaCarga: null
      },
      sincronizacionFirebase: {
        activa: true,
        frecuencia: 'una vez al dia',
        ultimaSincronizacion: null,
        estado: 'pendiente'
      },
      salidaEstado: 'consola',
      resumen: {
        totalRegistros: 0,
        totalPendientes: 0,
        totalSincronizados: 0,
        totalConflictos: 0,
        totalErrores: 0,
        totalCamposNuevos: 0
      }
    },
    camposNuevos: {
      version: '1.0.0',
      moduloPadre: 'Curriculo',
      nombre: 'Base local - campos nuevos',
      camposNuevos: []
    },
    logs: {
      version: '1.0.0',
      moduloPadre: 'Curriculo',
      nombre: 'Base local - log de consola',
      logs: []
    }
  };

  function keyFor(storeName) {
    return BL.config?.storageKeys?.[storeName] || `curriculo_bl_${storeName}`;
  }

  function defaultFor(storeName) {
    return BL.utils?.clone ? BL.utils.clone(DEFAULTS[storeName] || {}) : JSON.parse(JSON.stringify(DEFAULTS[storeName] || {}));
  }

  async function readStore(storeName) {
    const fallback = defaultFor(storeName);

    try {
      const electronReader = window.electronAPI?.curriculoBL?.readStore;
      if (typeof electronReader === 'function') {
        const result = await electronReader(storeName);
        return result || fallback;
      }

      const raw = window.localStorage?.getItem(keyFor(storeName));
      return BL.utils?.safeJsonParse ? BL.utils.safeJsonParse(raw, fallback) : JSON.parse(raw || JSON.stringify(fallback));
    } catch (error) {
      BL.logger?.error('No se pudo leer almacenamiento local.', { storeName, error: error.message });
      return fallback;
    }
  }

  async function writeStore(storeName, value) {
    const payload = value || defaultFor(storeName);

    try {
      const electronWriter = window.electronAPI?.curriculoBL?.writeStore;
      if (typeof electronWriter === 'function') {
        await electronWriter(storeName, payload);
      } else {
        window.localStorage?.setItem(keyFor(storeName), JSON.stringify(payload));
      }

      BL.logger?.info('Almacenamiento local actualizado.', { storeName });
      return payload;
    } catch (error) {
      BL.logger?.error('No se pudo escribir almacenamiento local.', { storeName, error: error.message });
      throw error;
    }
  }

  async function patchStore(storeName, patch) {
    const current = await readStore(storeName);
    const next = BL.utils?.deepMerge ? BL.utils.deepMerge(current, patch) : Object.assign({}, current, patch);
    return writeStore(storeName, next);
  }

  async function appendToArray(storeName, arrayKey, item) {
    const current = await readStore(storeName);
    if (!Array.isArray(current[arrayKey])) current[arrayKey] = [];
    current[arrayKey].push(item);
    return writeStore(storeName, current);
  }

  async function initialize() {
    const storeNames = Object.keys(DEFAULTS);
    for (const storeName of storeNames) {
      const current = await readStore(storeName);
      if (!current || Object.keys(current).length === 0) {
        await writeStore(storeName, defaultFor(storeName));
      }
    }

    BL.logger?.info('Base local inicializada en almacenamiento del navegador.');
    return true;
  }

  async function updateResumen() {
    const registrosStore = await readStore('registros');
    const erroresStore = await readStore('errores');
    const conflictosStore = await readStore('conflictos');
    const camposStore = await readStore('camposNuevos');
    const registros = Array.isArray(registrosStore.registros) ? registrosStore.registros : [];

    const resumen = {
      totalRegistros: registros.length,
      totalPendientes: registros.filter((item) => item.estado === 'pendiente').length,
      totalSincronizados: registros.filter((item) => item.estado === 'sincronizado').length,
      totalConflictos: Array.isArray(conflictosStore.conflictos) ? conflictosStore.conflictos.length : 0,
      totalErrores: Array.isArray(erroresStore.errores) ? erroresStore.errores.length : 0,
      totalCamposNuevos: Array.isArray(camposStore.camposNuevos) ? camposStore.camposNuevos.length : 0
    };

    await patchStore('estado', { resumen });
    return resumen;
  }

  BL.storage = {
    defaults: DEFAULTS,
    keyFor,
    readStore,
    writeStore,
    patchStore,
    appendToArray,
    initialize,
    updateResumen
  };
})(window);
