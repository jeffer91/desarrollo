/*
  Base local BL - Curriculo
  Archivo: bl.menu.js
  Funcion: conector local para el modulo Menu.
*/
(function (window) {
  'use strict';

  const BL = window.CurriculoBL = window.CurriculoBL || {};
  BL.modulos = BL.modulos || {};

  const MODULE = Object.freeze({
    id: 'menu',
    nombre: 'Menu',
    ruta: 'Curriculo/menu',
    camposClave: ['titulo', 'url', 'orden', 'activo']
  });

  function normalize(item) {
    const data = item && typeof item === 'object' ? item : {};
    return BL.schema?.normalizeRecord(data, {
      modulo: MODULE.id,
      ruta: MODULE.ruta,
      nombre: data.nombre || data.titulo || data.label || data.url || 'menu-sin-nombre',
      origen: data.origen || 'modulo-menu'
    });
  }

  async function save(item) {
    const record = normalize(item);
    const validation = BL.schema?.validateRecord ? BL.schema.validateRecord(record) : { valido: true, errores: [], registro: record };

    if (!validation.valido) {
      await BL.storage?.appendToArray?.('errores', 'errores', {
        id: BL.utils?.makeId ? BL.utils.makeId('error-menu') : `error-menu-${Date.now()}`,
        tipo: 'validacion-menu',
        mensaje: 'Registro de menu invalido.',
        detalle: validation.errores,
        registro: record,
        creadoEn: BL.utils?.nowISO ? BL.utils.nowISO() : new Date().toISOString()
      });
      BL.logger?.error('Menu: registro invalido.', validation.errores);
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
      id: BL.utils?.makeId ? BL.utils.makeId('hist-menu') : `hist-menu-${Date.now()}`,
      accion: index >= 0 ? 'actualizar' : 'crear',
      modulo: MODULE.id,
      ruta: MODULE.ruta,
      registroClave: key,
      creadoEn: BL.utils?.nowISO ? BL.utils.nowISO() : new Date().toISOString()
    });
    await BL.storage?.updateResumen?.();
    BL.logger?.info('Menu: registro guardado en Base local.', { clave: key });
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

  BL.modulos.menu = { config: MODULE, normalize, save, saveMany, list };
})(window);
