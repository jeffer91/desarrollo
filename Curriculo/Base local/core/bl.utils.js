/*
  Base local BL - Curriculo
  Archivo: bl.utils.js
  Funcion: utilidades generales para fechas, ids, JSON y comparaciones.
*/
(function (window) {
  'use strict';

  const BL = window.CurriculoBL = window.CurriculoBL || {};

  function nowISO() {
    return new Date().toISOString();
  }

  function todayKey(dateValue) {
    const date = dateValue ? new Date(dateValue) : new Date();
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  }

  function safeJsonParse(value, fallback) {
    try {
      if (value === null || value === undefined || value === '') return fallback;
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  function clone(value) {
    if (value === null || value === undefined) return value;
    return safeJsonParse(JSON.stringify(value), value);
  }

  function isObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]';
  }

  function normalizeText(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
  }

  function makeId(prefix) {
    const cleanPrefix = normalizeText(prefix || 'bl');
    const random = Math.random().toString(36).slice(2, 9);
    return `${cleanPrefix}-${Date.now()}-${random}`;
  }

  function buildRecordKey(record) {
    if (!record || typeof record !== 'object') return null;
    if (record.idFirebase) return `firebase:${record.idFirebase}`;
    if (record.idLocal) return `local:${record.idLocal}`;

    const modulo = normalizeText(record.modulo || 'sin-modulo');
    const ruta = normalizeText(record.ruta || 'sin-ruta');
    const nombre = normalizeText(record.nombre || 'sin-nombre');
    return `${modulo}:${ruta}:${nombre}`;
  }

  function compareDateTime(a, b) {
    const dateA = a ? new Date(a) : null;
    const dateB = b ? new Date(b) : null;
    const timeA = dateA && !Number.isNaN(dateA.getTime()) ? dateA.getTime() : 0;
    const timeB = dateB && !Number.isNaN(dateB.getTime()) ? dateB.getTime() : 0;

    if (timeA > timeB) return 1;
    if (timeA < timeB) return -1;
    return 0;
  }

  function shouldRunDaily(lastRunISO) {
    if (!lastRunISO) return true;
    const lastRun = new Date(lastRunISO);
    if (Number.isNaN(lastRun.getTime())) return true;
    const unDiaMs = BL.config?.tiempos?.unDiaMs || 24 * 60 * 60 * 1000;
    return Date.now() - lastRun.getTime() >= unDiaMs;
  }

  function deepMerge(base, extra) {
    const output = clone(base || {});
    const incoming = extra || {};

    Object.keys(incoming).forEach((key) => {
      if (isObject(output[key]) && isObject(incoming[key])) {
        output[key] = deepMerge(output[key], incoming[key]);
      } else {
        output[key] = clone(incoming[key]);
      }
    });

    return output;
  }

  function getByPath(object, path, fallback) {
    if (!path) return fallback;
    return String(path)
      .split('.')
      .reduce((current, key) => {
        if (current && Object.prototype.hasOwnProperty.call(current, key)) return current[key];
        return undefined;
      }, object) ?? fallback;
  }

  BL.utils = {
    nowISO,
    todayKey,
    safeJsonParse,
    clone,
    isObject,
    normalizeText,
    makeId,
    buildRecordKey,
    compareDateTime,
    shouldRunDaily,
    deepMerge,
    getByPath
  };
})(window);
