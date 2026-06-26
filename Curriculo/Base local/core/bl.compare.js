/*
  Base local BL - Curriculo
  Archivo: bl.compare.js
  Funcion: comparar registros locales contra registros de Firebase usando fecha y hora.
*/
(function (window) {
  'use strict';

  const BL = window.CurriculoBL = window.CurriculoBL || {};

  function getUpdatedAt(record) {
    if (!record || typeof record !== 'object') return null;
    return record.actualizadoEn || record.updatedAt || record.fechaActualizacion || record.fechaHoraActualizacion || null;
  }

  function areSameData(localRecord, firebaseRecord) {
    const localData = localRecord?.datos || localRecord || {};
    const firebaseData = firebaseRecord?.datos || firebaseRecord || {};
    return JSON.stringify(localData) === JSON.stringify(firebaseData);
  }

  function compareTimestamps(localRecord, firebaseRecord) {
    const localDate = getUpdatedAt(localRecord);
    const firebaseDate = getUpdatedAt(firebaseRecord);
    return BL.utils?.compareDateTime ? BL.utils.compareDateTime(localDate, firebaseDate) : 0;
  }

  function decideRecordAction(localRecord, firebaseRecord) {
    if (localRecord && !firebaseRecord) {
      return {
        accion: 'subir-a-firebase',
        ganador: 'local',
        motivo: 'Existe en Base local y no existe en Firebase.'
      };
    }

    if (!localRecord && firebaseRecord) {
      return {
        accion: 'actualizar-base-local',
        ganador: 'firebase',
        motivo: 'Existe en Firebase y no existe en Base local.'
      };
    }

    if (!localRecord && !firebaseRecord) {
      return {
        accion: 'sin-accion',
        ganador: null,
        motivo: 'No existen registros para comparar.'
      };
    }

    if (areSameData(localRecord, firebaseRecord)) {
      return {
        accion: 'marcar-sincronizado',
        ganador: 'ambos',
        motivo: 'Los datos son iguales.'
      };
    }

    const comparison = compareTimestamps(localRecord, firebaseRecord);

    if (comparison > 0) {
      return {
        accion: 'subir-a-firebase',
        ganador: 'local',
        motivo: 'Base local tiene fecha y hora mas reciente.'
      };
    }

    if (comparison < 0) {
      return {
        accion: 'actualizar-base-local',
        ganador: 'firebase',
        motivo: 'Firebase tiene fecha y hora mas reciente.'
      };
    }

    return {
      accion: 'marcar-conflicto',
      ganador: null,
      motivo: 'Los datos son diferentes y tienen la misma fecha y hora.'
    };
  }

  function indexByKey(records) {
    const map = new Map();
    const list = Array.isArray(records) ? records : [];

    list.forEach((record) => {
      const normalized = BL.schema?.normalizeRecord ? BL.schema.normalizeRecord(record) : record;
      const key = BL.utils?.buildRecordKey ? BL.utils.buildRecordKey(normalized) : normalized?.idLocal;
      if (key) map.set(key, normalized);
    });

    return map;
  }

  function compareCollections(localRecords, firebaseRecords) {
    const localMap = indexByKey(localRecords);
    const firebaseMap = indexByKey(firebaseRecords);
    const keys = new Set([...localMap.keys(), ...firebaseMap.keys()]);
    const resultados = [];

    keys.forEach((key) => {
      const localRecord = localMap.get(key) || null;
      const firebaseRecord = firebaseMap.get(key) || null;
      const decision = decideRecordAction(localRecord, firebaseRecord);

      resultados.push({
        clave: key,
        local: localRecord,
        firebase: firebaseRecord,
        accion: decision.accion,
        ganador: decision.ganador,
        motivo: decision.motivo,
        comparadoEn: BL.utils?.nowISO ? BL.utils.nowISO() : new Date().toISOString()
      });
    });

    BL.logger?.info('Comparacion Base local vs Firebase completada.', {
      total: resultados.length,
      subirFirebase: resultados.filter((item) => item.accion === 'subir-a-firebase').length,
      actualizarLocal: resultados.filter((item) => item.accion === 'actualizar-base-local').length,
      conflictos: resultados.filter((item) => item.accion === 'marcar-conflicto').length
    });

    return resultados;
  }

  function splitResults(resultados) {
    const list = Array.isArray(resultados) ? resultados : [];
    return {
      subirFirebase: list.filter((item) => item.accion === 'subir-a-firebase'),
      actualizarLocal: list.filter((item) => item.accion === 'actualizar-base-local'),
      sincronizados: list.filter((item) => item.accion === 'marcar-sincronizado'),
      conflictos: list.filter((item) => item.accion === 'marcar-conflicto'),
      sinAccion: list.filter((item) => item.accion === 'sin-accion')
    };
  }

  BL.compare = {
    getUpdatedAt,
    compareTimestamps,
    decideRecordAction,
    compareCollections,
    splitResults
  };
})(window);
