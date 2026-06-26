/*
  Base local BL - Curriculo
  Archivo: bl.backup.js
  Funcion: crear respaldos locales con datos actuales, historial, errores y conflictos.
*/
(function (window) {
  'use strict';

  const BL = window.CurriculoBL = window.CurriculoBL || {};

  async function collectSnapshot() {
    const now = BL.utils?.nowISO ? BL.utils.nowISO() : new Date().toISOString();

    const snapshot = {
      id: BL.utils?.makeId ? BL.utils.makeId('backup-curriculo') : `backup-curriculo-${Date.now()}`,
      version: BL.config?.version || '1.0.0',
      moduloPadre: 'Curriculo',
      nombre: 'Respaldo Base local Curriculo',
      creadoEn: now,
      tipo: 'manual-o-automatico',
      contenido: {
        registros: await BL.storage?.readStore?.('registros'),
        historial: await BL.storage?.readStore?.('historial'),
        errores: await BL.storage?.readStore?.('errores'),
        conflictos: await BL.storage?.readStore?.('conflictos'),
        camposNuevos: await BL.storage?.readStore?.('camposNuevos'),
        estado: await BL.storage?.readStore?.('estado'),
        logs: BL.logger?.read ? BL.logger.read() : []
      }
    };

    return snapshot;
  }

  function getBackupKey(id) {
    return `curriculo_bl_backup_${id}`;
  }

  async function saveBackup(snapshot) {
    const backup = snapshot || await collectSnapshot();

    try {
      const electronWriter = window.electronAPI?.curriculoBL?.writeBackup;
      if (typeof electronWriter === 'function') {
        await electronWriter(backup);
      } else {
        window.localStorage?.setItem(getBackupKey(backup.id), JSON.stringify(backup));
      }

      BL.logger?.info('Respaldo local de Curriculo creado.', {
        id: backup.id,
        creadoEn: backup.creadoEn
      });

      return backup;
    } catch (error) {
      BL.logger?.error('No se pudo crear respaldo local de Curriculo.', {
        error: error.message
      });
      throw error;
    }
  }

  async function createBackup(reason) {
    const snapshot = await collectSnapshot();
    snapshot.motivo = reason || 'respaldo-manual';
    return saveBackup(snapshot);
  }

  function listLocalBackups() {
    const backups = [];

    try {
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (!key || !key.startsWith('curriculo_bl_backup_')) continue;
        const value = window.localStorage.getItem(key);
        const parsed = BL.utils?.safeJsonParse ? BL.utils.safeJsonParse(value, null) : JSON.parse(value);
        if (parsed) backups.push(parsed);
      }
    } catch (error) {
      BL.logger?.warn('No se pudo listar respaldos locales.', { error: error.message });
    }

    return backups.sort((a, b) => BL.utils?.compareDateTime ? BL.utils.compareDateTime(b.creadoEn, a.creadoEn) : 0);
  }

  async function restoreBackup(backupId) {
    const backups = listLocalBackups();
    const backup = backups.find((item) => item.id === backupId);

    if (!backup) {
      BL.logger?.error('No se encontro el respaldo solicitado.', { backupId });
      return false;
    }

    const contenido = backup.contenido || {};
    const stores = ['registros', 'historial', 'errores', 'conflictos', 'camposNuevos', 'estado'];

    for (const storeName of stores) {
      if (contenido[storeName]) {
        await BL.storage?.writeStore?.(storeName, contenido[storeName]);
      }
    }

    await BL.storage?.updateResumen?.();
    BL.logger?.warn('Base local de Curriculo restaurada desde respaldo.', { backupId });
    return true;
  }

  BL.backup = {
    collectSnapshot,
    saveBackup,
    createBackup,
    listLocalBackups,
    restoreBackup
  };
})(window);
