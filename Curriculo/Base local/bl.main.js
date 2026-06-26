/*
  Base local BL - Curriculo
  Archivo: bl.main.js
  Funcion: comportamiento de la pantalla visual de Base local.
*/
(function (window, document) {
  'use strict';

  const BL = window.CurriculoBL = window.CurriculoBL || {};
  const $ = (selector) => document.querySelector(selector);

  const elements = {
    statusDot: $('#blStatusDot'),
    statusTitle: $('#blStatusTitle'),
    statusText: $('#blStatusText'),
    output: $('#blOutput'),
    panelTitle: $('#blPanelTitle'),
    totals: {
      registros: $('#blTotalRegistros'),
      pendientes: $('#blTotalPendientes'),
      sincronizados: $('#blTotalSincronizados'),
      conflictos: $('#blTotalConflictos'),
      errores: $('#blTotalErrores'),
      camposNuevos: $('#blTotalCamposNuevos')
    },
    buttons: {
      sync: $('#blBtnSync'),
      changes: $('#blBtnChanges'),
      errors: $('#blBtnErrors'),
      backup: $('#blBtnBackup'),
      diagnostics: $('#blBtnDiagnostics'),
      refresh: $('#blBtnRefresh')
    }
  };

  function setStatus(type, title, text) {
    if (elements.statusDot) {
      elements.statusDot.classList.remove('ok', 'error');
      if (type) elements.statusDot.classList.add(type);
    }

    if (elements.statusTitle) elements.statusTitle.textContent = title || 'Base local';
    if (elements.statusText) elements.statusText.textContent = text || 'Estado actualizado en consola.';
  }

  function print(title, data) {
    if (elements.panelTitle) elements.panelTitle.textContent = title || 'Detalle';
    if (elements.output) {
      elements.output.textContent = typeof data === 'string'
        ? data
        : JSON.stringify(data || {}, null, 2);
    }
  }

  async function refreshSummary() {
    try {
      await BL.storage?.initialize?.();
      const resumen = await BL.storage?.updateResumen?.();
      const estado = await BL.storage?.readStore?.('estado');
      const finalResumen = resumen || estado?.resumen || {};

      if (elements.totals.registros) elements.totals.registros.textContent = finalResumen.totalRegistros || 0;
      if (elements.totals.pendientes) elements.totals.pendientes.textContent = finalResumen.totalPendientes || 0;
      if (elements.totals.sincronizados) elements.totals.sincronizados.textContent = finalResumen.totalSincronizados || 0;
      if (elements.totals.conflictos) elements.totals.conflictos.textContent = finalResumen.totalConflictos || 0;
      if (elements.totals.errores) elements.totals.errores.textContent = finalResumen.totalErrores || 0;
      if (elements.totals.camposNuevos) elements.totals.camposNuevos.textContent = finalResumen.totalCamposNuevos || 0;

      setStatus('ok', 'Base local lista', 'Datos locales cargados. El estado tecnico se registra en consola.');
      print('Resumen general', estado || { resumen: finalResumen });
      return finalResumen;
    } catch (error) {
      setStatus('error', 'Error en Base local', error.message);
      print('Error', { mensaje: error.message });
      BL.logger?.error('No se pudo actualizar resumen visual.', { error: error.message });
      return null;
    }
  }

  async function showChanges() {
    const historial = await BL.storage?.readStore?.('historial');
    const camposNuevos = await BL.storage?.readStore?.('camposNuevos');
    print('Cambios registrados', {
      historial: historial?.historial || [],
      camposNuevos: camposNuevos?.camposNuevos || []
    });
  }

  async function showErrors() {
    const errores = await BL.storage?.readStore?.('errores');
    const conflictos = await BL.storage?.readStore?.('conflictos');
    print('Errores y conflictos', {
      errores: errores?.errores || [],
      conflictos: conflictos?.conflictos || []
    });
  }

  async function createBackup() {
    setStatus(null, 'Creando respaldo', 'Generando respaldo local de Curriculo...');
    const backup = await BL.backup?.createBackup?.('respaldo-manual-desde-pantalla');
    await refreshSummary();
    print('Respaldo creado', backup);
  }

  async function runDiagnostics() {
    setStatus(null, 'Ejecutando diagnostico', 'Revisando motor, stores y registros...');
    const result = await BL.diagnostics?.runDiagnostics?.();
    await refreshSummary();
    setStatus(result?.estado === 'ok' ? 'ok' : 'error', 'Diagnostico finalizado', result?.estado || 'sin resultado');
    print('Diagnostico', result);
  }

  async function syncNow() {
    setStatus(null, 'Sincronizando', 'Comparando Base local con Firebase...');
    try {
      const result = await BL.syncFirebase?.syncNow?.();
      await refreshSummary();
      setStatus('ok', 'Sincronizacion finalizada', 'La informacion fue comparada por fecha y hora.');
      print('Sincronizacion', result);
    } catch (error) {
      await refreshSummary();
      setStatus('error', 'Sincronizacion con error', error.message);
      print('Error de sincronizacion', { mensaje: error.message });
    }
  }

  function bindEvents() {
    elements.buttons.refresh?.addEventListener('click', refreshSummary);
    elements.buttons.changes?.addEventListener('click', showChanges);
    elements.buttons.errors?.addEventListener('click', showErrors);
    elements.buttons.backup?.addEventListener('click', createBackup);
    elements.buttons.diagnostics?.addEventListener('click', runDiagnostics);
    elements.buttons.sync?.addEventListener('click', syncNow);
  }

  async function autoLoadDaily() {
    await BL.storage?.initialize?.();
    const estado = await BL.storage?.readStore?.('estado');
    const ultimaCarga = estado?.cargaAutomatica?.ultimaCarga;
    const shouldLoad = BL.utils?.shouldRunDaily ? BL.utils.shouldRunDaily(ultimaCarga) : true;

    if (shouldLoad) {
      await BL.storage?.patchStore?.('estado', {
        cargaAutomatica: {
          activa: true,
          frecuencia: 'una vez al dia al abrir Curriculo',
          ultimaCarga: BL.utils?.nowISO ? BL.utils.nowISO() : new Date().toISOString()
        }
      });
      BL.logger?.info('Carga diaria de Base local ejecutada desde pantalla visual.');
    } else {
      BL.logger?.info('Carga diaria omitida desde pantalla visual; ya fue ejecutada.');
    }
  }

  async function init() {
    bindEvents();
    setStatus(null, 'Cargando Base local', 'Inicializando archivos locales...');
    await autoLoadDaily();
    await refreshSummary();
  }

  document.addEventListener('DOMContentLoaded', init);
})(window, document);
