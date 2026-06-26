/*
  Base local BL - Curriculo
  Archivo: bl.sync.firebase.js
  Funcion: preparar sincronizacion entre Base local de Curriculo y Firebase.
*/
(function (window) {
  'use strict';

  const BL = window.CurriculoBL = window.CurriculoBL || {};

  function getFirebaseAdapter() {
    const adapter = window.CurriculoFirebase || window.curriculoFirebase || window.firebaseCurriculo || null;

    if (!adapter) {
      return {
        disponible: false,
        leer: null,
        guardar: null,
        descripcion: 'No se encontro adaptador Firebase de Curriculo.'
      };
    }

    const leer = adapter.leerRegistros || adapter.readRecords || adapter.getAll || adapter.leer || null;
    const guardar = adapter.guardarRegistro || adapter.saveRecord || adapter.set || adapter.guardar || null;

    return {
      disponible: typeof leer === 'function' && typeof guardar === 'function',
      leer,
      guardar,
      adapter,
      descripcion: 'Adaptador Firebase detectado.'
    };
  }

  async function readLocalRecords() {
    const store = await BL.storage?.readStore?.('registros');
    return Array.isArray(store?.registros) ? store.registros : [];
  }

  async function readFirebaseRecords() {
    const firebase = getFirebaseAdapter();

    if (!firebase.disponible) {
      BL.logger?.warn('Firebase aun no disponible para Base local Curriculo.', firebase.descripcion);
      return [];
    }

    try {
      const result = await firebase.leer.call(firebase.adapter);
      if (Array.isArray(result)) return result;
      if (Array.isArray(result?.registros)) return result.registros;
      if (result && typeof result === 'object') return Object.values(result);
      return [];
    } catch (error) {
      BL.logger?.error('No se pudieron leer registros desde Firebase.', { error: error.message });
      throw error;
    }
  }

  async function saveLocalRecords(records) {
    const current = await BL.storage?.readStore?.('registros');
    const next = {
      ...(current || {}),
      ultimaActualizacion: BL.utils?.nowISO ? BL.utils.nowISO() : new Date().toISOString(),
      registros: Array.isArray(records) ? records : []
    };

    await BL.storage?.writeStore?.('registros', next);
    await BL.storage?.updateResumen?.();
    return next.registros;
  }

  async function uploadRecordToFirebase(record) {
    const firebase = getFirebaseAdapter();

    if (!firebase.disponible) {
      BL.logger?.warn('No se subio a Firebase porque el adaptador no esta disponible.', {
        registro: record?.nombre || record?.idLocal || null
      });
      return { ok: false, reason: 'firebase-no-disponible', record };
    }

    try {
      const payload = BL.schema?.normalizeRecord ? BL.schema.normalizeRecord(record) : record;
      const result = await firebase.guardar.call(firebase.adapter, payload);
      return { ok: true, result, record: payload };
    } catch (error) {
      BL.logger?.error('No se pudo subir registro a Firebase.', {
        registro: record?.nombre || record?.idLocal || null,
        error: error.message
      });
      return { ok: false, reason: error.message, record };
    }
  }

  function mergeLocalWithFirebase(localRecords, firebaseRecords, comparisons) {
    const localMap = new Map();
    const firebaseMap = new Map();

    (localRecords || []).forEach((record) => {
      const normalized = BL.schema?.normalizeRecord ? BL.schema.normalizeRecord(record) : record;
      const key = BL.utils?.buildRecordKey ? BL.utils.buildRecordKey(normalized) : normalized?.idLocal;
      if (key) localMap.set(key, normalized);
    });

    (firebaseRecords || []).forEach((record) => {
      const normalized = BL.schema?.normalizeRecord ? BL.schema.normalizeRecord(record, { origen: 'firebase' }) : record;
      const key = BL.utils?.buildRecordKey ? BL.utils.buildRecordKey(normalized) : normalized?.idFirebase || normalized?.idLocal;
      if (key) firebaseMap.set(key, normalized);
    });

    (comparisons || []).forEach((item) => {
      if (item.accion === 'actualizar-base-local' && item.firebase) {
        localMap.set(item.clave, {
          ...(item.firebase || {}),
          estado: BL.config?.estadosRegistro?.SINCRONIZADO || 'sincronizado',
          sincronizadoEn: BL.utils?.nowISO ? BL.utils.nowISO() : new Date().toISOString()
        });
      }

      if (item.accion === 'marcar-sincronizado' && item.local) {
        localMap.set(item.clave, {
          ...(item.local || {}),
          estado: BL.config?.estadosRegistro?.SINCRONIZADO || 'sincronizado',
          sincronizadoEn: BL.utils?.nowISO ? BL.utils.nowISO() : new Date().toISOString()
        });
      }

      if (item.accion === 'marcar-conflicto' && item.local) {
        localMap.set(item.clave, {
          ...(item.local || {}),
          estado: BL.config?.estadosRegistro?.CONFLICTO || 'conflicto'
        });
      }
    });

    firebaseMap.forEach((record, key) => {
      if (!localMap.has(key)) localMap.set(key, record);
    });

    return Array.from(localMap.values());
  }

  async function registerSyncResults(split) {
    const now = BL.utils?.nowISO ? BL.utils.nowISO() : new Date().toISOString();

    for (const item of split.conflictos || []) {
      await BL.storage?.appendToArray?.('conflictos', 'conflictos', {
        id: BL.utils?.makeId ? BL.utils.makeId('conflicto') : `conflicto-${Date.now()}`,
        clave: item.clave,
        motivo: item.motivo,
        local: item.local,
        firebase: item.firebase,
        creadoEn: now
      });
    }

    await BL.storage?.patchStore?.('estado', {
      sincronizacionFirebase: {
        activa: true,
        frecuencia: 'una vez al dia',
        ultimaSincronizacion: now,
        estado: 'finalizada'
      }
    });

    await BL.storage?.updateResumen?.();
  }

  async function syncNow() {
    const startedAt = BL.utils?.nowISO ? BL.utils.nowISO() : new Date().toISOString();
    BL.logger?.info('Sincronizacion Base local Curriculo iniciada.', { iniciadoEn: startedAt });

    try {
      await BL.storage?.initialize?.();
      await BL.backup?.createBackup?.('antes-de-sincronizar-firebase');

      const localRecords = await readLocalRecords();
      const firebaseRecords = await readFirebaseRecords();
      const comparisons = BL.compare?.compareCollections ? BL.compare.compareCollections(localRecords, firebaseRecords) : [];
      const split = BL.compare?.splitResults ? BL.compare.splitResults(comparisons) : { subirFirebase: [], actualizarLocal: [], sincronizados: [], conflictos: [] };

      const uploads = [];
      for (const item of split.subirFirebase || []) {
        if (item.local) uploads.push(await uploadRecordToFirebase(item.local));
      }

      const merged = mergeLocalWithFirebase(localRecords, firebaseRecords, comparisons);
      await saveLocalRecords(merged);
      await registerSyncResults(split);

      const summary = {
        iniciadoEn: startedAt,
        finalizadoEn: BL.utils?.nowISO ? BL.utils.nowISO() : new Date().toISOString(),
        totalLocal: localRecords.length,
        totalFirebase: firebaseRecords.length,
        subirFirebase: split.subirFirebase.length,
        actualizarLocal: split.actualizarLocal.length,
        sincronizados: split.sincronizados.length,
        conflictos: split.conflictos.length,
        subidasCorrectas: uploads.filter((item) => item.ok).length,
        subidasFallidas: uploads.filter((item) => !item.ok).length
      };

      BL.logger?.info('Sincronizacion Base local Curriculo finalizada.', summary);
      return summary;
    } catch (error) {
      await BL.storage?.appendToArray?.('errores', 'errores', {
        id: BL.utils?.makeId ? BL.utils.makeId('error-sync') : `error-sync-${Date.now()}`,
        tipo: 'sincronizacion-firebase',
        mensaje: error.message,
        creadoEn: BL.utils?.nowISO ? BL.utils.nowISO() : new Date().toISOString()
      });

      await BL.storage?.patchStore?.('estado', {
        sincronizacionFirebase: {
          activa: true,
          frecuencia: 'una vez al dia',
          ultimaSincronizacion: startedAt,
          estado: 'error'
        }
      });

      await BL.storage?.updateResumen?.();
      BL.logger?.error('Sincronizacion Base local Curriculo fallo.', { error: error.message });
      throw error;
    }
  }

  async function syncDailyIfNeeded() {
    const estado = await BL.storage?.readStore?.('estado');
    const lastSync = estado?.sincronizacionFirebase?.ultimaSincronizacion;
    const shouldRun = BL.utils?.shouldRunDaily ? BL.utils.shouldRunDaily(lastSync) : true;

    if (!shouldRun) {
      BL.logger?.info('Sincronizacion diaria omitida; ya se ejecuto hoy.', { lastSync });
      return { skipped: true, lastSync };
    }

    return syncNow();
  }

  BL.syncFirebase = {
    getFirebaseAdapter,
    readLocalRecords,
    readFirebaseRecords,
    saveLocalRecords,
    uploadRecordToFirebase,
    mergeLocalWithFirebase,
    syncNow,
    syncDailyIfNeeded
  };
})(window);
