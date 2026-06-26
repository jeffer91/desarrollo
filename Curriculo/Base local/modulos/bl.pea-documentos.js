/*
  Base local BL - Curriculo
  Archivo: bl.pea-documentos.js
  Funcion: conector local para el modulo PEA Documentos.
*/
(function (window) {
  'use strict';

  const BL = window.CurriculoBL = window.CurriculoBL || {};
  BL.modulos = BL.modulos || {};

  const MODULE = Object.freeze({
    id: 'pea_documentos',
    nombre: 'PEA Documentos',
    ruta: 'Curriculo/pea_documentos',
    camposClave: ['codigoPea', 'periodo', 'materia', 'docente', 'archivo']
  });

  function normalize(item) {
    const data = item && typeof item === 'object' ? item : {};
    return BL.schema?.normalizeRecord(data, {
      modulo: MODULE.id,
      ruta: MODULE.ruta,
      nombre: data.nombre || data.codigoPea || data.materia || data.archivo || 'pea-documento-sin-nombre',
      origen: data.origen || 'modulo-pea-documentos'
    });
  }

  async function save(item) {
    const record = normalize(item);
    const validation = BL.schema?.validateRecord ? BL.schema.validateRecord(record) : { valido: true, errores: [], registro: record };

    if (!validation.valido) {
      await BL.storage?.appendToArray?.('errores', 'errores', {
        id: BL.utils?.makeId ? BL.utils.makeId('error-pea') : `error-pea-${Date.now()}`,
        tipo: 'validacion-pea-documentos',
        mensaje: 'Registro de PEA documento invalido.',
        detalle: validation.errores,
        registro: record,
        creadoEn: BL.utils?.nowISO ? BL.utils.nowISO() : new Date().toISOString()
      });
      BL.logger?.error('PEA Documentos: registro invalido.', validation.errores);
      return { ok: false, errores: validation.errores, registro: record };
    }

    await BL.schema?.registerNewFields?.(record, MODULE.id);
    const store = await BL.storage?.readStore?.('registros');
    const records = Array.isArray(store?.registros) ? store.registros : [];
    const key = BL.utils?.buildRecordKey ? BL.utils.buildRecordKey(record) : record.idLocal;
    const index = records.findIndex((current) => (BL.utils?.buildRecordKey ? BL.utils.buildRecordKey(current) : current.idLocal) === key);

    if (index >= 0) records[index] = { ...records[index], ...record, actualizadoEn: record.actualizadoEn };
    else records.push(record);

    await BL.storage?.writeStore?.('registros', {
      ...(store || {}),
      ultimaActualizacion: BL.utils?.nowISO ? BL.utils.nowISO() : new Date().toISOString(),
      registros: records
    });
    await BL.storage?.appendToArray?.('historial', 'historial', {
      id: BL.utils?.makeId ? BL.utils.makeId('hist-pea') : `hist-pea-${Date.now()}`,
      accion: index >= 0 ? 'actualizar' : 'crear',
      modulo: MODULE.id,
      ruta: MODULE.ruta,
      registroClave: key,
      creadoEn: BL.utils?.nowISO ? BL.utils.nowISO() : new Date().toISOString()
    });
    await BL.storage?.updateResumen?.();
    BL.logger?.info('PEA Documentos: registro guardado en Base local.', { clave: key });
    return { ok: true, registro: record };
  }

  async function saveMany(items) {
    const list = Array.isArray(items) ? items : [];
    const results = [];
    for (const item of list) results.push(await save(item));
    return results;
  }

  async function list() {
    const store = await BL.storage?.readStore?.('registros');
    return (store?.registros || []).filter((record) => record.modulo === MODULE.id);
  }

  BL.modulos.peaDocumentos = { config: MODULE, normalize, save, saveMany, list };
  BL.modulos.pea_documentos = BL.modulos.peaDocumentos;
})(window);
