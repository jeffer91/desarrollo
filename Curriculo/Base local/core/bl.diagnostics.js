/*
  Base local BL - Curriculo
  Archivo: bl.diagnostics.js
  Funcion: diagnosticar el estado interno de la Base local de Curriculo.
*/
(function (window) {
  'use strict';

  const BL = window.CurriculoBL = window.CurriculoBL || {};

  function resultItem(name, ok, details) {
    return {
      nombre: name,
      estado: ok ? 'ok' : 'error',
      detalle: details || null,
      revisadoEn: BL.utils?.nowISO ? BL.utils.nowISO() : new Date().toISOString()
    };
  }

  async function checkStores() {
    const stores = ['registros', 'historial', 'errores', 'conflictos', 'estado', 'camposNuevos', 'logs'];
    const results = [];

    for (const storeName of stores) {
      try {
        const store = await BL.storage?.readStore?.(storeName);
        results.push(resultItem(`store:${storeName}`, !!store, store ? 'Disponible' : 'No disponible'));
      } catch (error) {
        results.push(resultItem(`store:${storeName}`, false, error.message));
      }
    }

    return results;
  }

  function checkModulesLoaded() {
    const required = ['config', 'utils', 'logger', 'storage', 'schema', 'compare'];
    return required.map((moduleName) => {
      const ok = !!BL[moduleName];
      return resultItem(`core:${moduleName}`, ok, ok ? 'Modulo cargado' : 'Modulo no cargado');
    });
  }

  async function checkRecordIntegrity() {
    const results = [];

    try {
      const store = await BL.storage?.readStore?.('registros');
      const registros = Array.isArray(store?.registros) ? store.registros : [];
      const invalidos = [];

      registros.forEach((record) => {
        const validation = BL.schema?.validateRecord ? BL.schema.validateRecord(record) : { valido: true, errores: [] };
        if (!validation.valido) {
          invalidos.push({
            nombre: record?.nombre || null,
            modulo: record?.modulo || null,
            errores: validation.errores
          });
        }
      });

      results.push(resultItem('integridad:registros', invalidos.length === 0, {
        totalRegistros: registros.length,
        invalidos
      }));
    } catch (error) {
      results.push(resultItem('integridad:registros', false, error.message));
    }

    return results;
  }

  async function runDiagnostics() {
    const startedAt = BL.utils?.nowISO ? BL.utils.nowISO() : new Date().toISOString();
    const results = [
      ...checkModulesLoaded(),
      ...(await checkStores()),
      ...(await checkRecordIntegrity())
    ];

    const hasErrors = results.some((item) => item.estado === 'error');
    const summary = {
      id: BL.utils?.makeId ? BL.utils.makeId('diagnostico') : `diagnostico-${Date.now()}`,
      moduloPadre: 'Curriculo',
      iniciadoEn: startedAt,
      finalizadoEn: BL.utils?.nowISO ? BL.utils.nowISO() : new Date().toISOString(),
      estado: hasErrors ? 'con-errores' : 'ok',
      totalRevisiones: results.length,
      totalErrores: results.filter((item) => item.estado === 'error').length,
      resultados: results
    };

    if (hasErrors) {
      await BL.storage?.appendToArray?.('errores', 'errores', {
        id: summary.id,
        tipo: 'diagnostico',
        mensaje: 'Diagnostico de Base local encontro errores.',
        detalle: summary,
        creadoEn: summary.finalizadoEn
      });
    }

    await BL.storage?.updateResumen?.();
    BL.logger?.info('Diagnostico Base local Curriculo finalizado.', summary);
    return summary;
  }

  BL.diagnostics = {
    checkStores,
    checkModulesLoaded,
    checkRecordIntegrity,
    runDiagnostics
  };
})(window);
