/*
  Base local BL - Curriculo
  Archivo: bl.logger.js
  Funcion: registrar eventos tecnicos y mostrar estado solo por consola.
*/
(function (window) {
  'use strict';

  const BL = window.CurriculoBL = window.CurriculoBL || {};

  function getStorageKey() {
    return BL.config?.storageKeys?.logs || 'curriculo_bl_logs';
  }

  function readLogs() {
    try {
      const raw = window.localStorage?.getItem(getStorageKey());
      const parsed = BL.utils?.safeJsonParse(raw, null);
      if (Array.isArray(parsed)) return parsed;
      if (parsed && Array.isArray(parsed.logs)) return parsed.logs;
      return [];
    } catch (error) {
      return [];
    }
  }

  function writeLogs(logs) {
    try {
      window.localStorage?.setItem(getStorageKey(), JSON.stringify(logs || []));
    } catch (error) {
      // El log no debe romper la app.
    }
  }

  function printToConsole(level, message, details) {
    const prefix = '[BL Curriculo]';
    const consoleMethod = level === 'error'
      ? 'error'
      : level === 'warn'
        ? 'warn'
        : 'info';

    if (window.console && typeof window.console[consoleMethod] === 'function') {
      window.console[consoleMethod](prefix, message, details || '');
    }
  }

  function add(level, event, details) {
    const entry = {
      id: BL.utils?.makeId ? BL.utils.makeId('log') : `log-${Date.now()}`,
      nivel: level || 'info',
      evento: event || 'evento-sin-nombre',
      detalle: details || null,
      creadoEn: BL.utils?.nowISO ? BL.utils.nowISO() : new Date().toISOString()
    };

    const logs = readLogs();
    logs.push(entry);
    writeLogs(logs.slice(-500));
    printToConsole(entry.nivel, entry.evento, entry.detalle);
    return entry;
  }

  BL.logger = {
    info(event, details) {
      return add('info', event, details);
    },
    warn(event, details) {
      return add('warn', event, details);
    },
    error(event, details) {
      return add('error', event, details);
    },
    debug(event, details) {
      return add('debug', event, details);
    },
    read: readLogs,
    clear() {
      writeLogs([]);
      printToConsole('info', 'Logs de Base local limpiados.');
    }
  };
})(window);
