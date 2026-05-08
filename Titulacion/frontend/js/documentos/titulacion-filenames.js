/* ============================================================
  Nombre completo: titulacion-filenames.js
  Ruta: Titulacion/frontend/js/documentos/titulacion-filenames.js

  Funcion:
  - Generar nombres de archivo seguros.
  - Evitar caracteres problematicos en Windows, navegador y Electron.
  - Centralizar nombres para PDF, JSON y respaldos.
============================================================ */

(function () {
  'use strict';

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function getDateStamp(date) {
    var safeDate = date || new Date();

    return [
      safeDate.getFullYear(),
      pad(safeDate.getMonth() + 1),
      pad(safeDate.getDate())
    ].join('-');
  }

  function getTimeStamp(date) {
    var safeDate = date || new Date();

    return [
      pad(safeDate.getHours()),
      pad(safeDate.getMinutes()),
      pad(safeDate.getSeconds())
    ].join('-');
  }

  function sanitizeName(value) {
    return String(value || 'documento')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 80) || 'documento';
  }

  function getBaseName(title) {
    var safeTitle = title || 'documento-titulacion';
    return sanitizeName(safeTitle) + '-' + getDateStamp();
  }

  function getPdfName(title) {
    return getBaseName(title) + '.pdf';
  }

  function getJsonName(title) {
    return getBaseName(title) + '.json';
  }

  function getBackupName(title) {
    return getBaseName(title) + '-' + getTimeStamp() + '-backup.json';
  }

  window.TITULACION_FILENAMES = {
    nombreCompleto: 'titulacion-filenames.js',
    ruta: 'Titulacion/frontend/js/documentos/titulacion-filenames.js',
    funciones: [
      'getDateStamp',
      'getTimeStamp',
      'sanitizeName',
      'getBaseName',
      'getPdfName',
      'getJsonName',
      'getBackupName'
    ],
    getDateStamp: getDateStamp,
    getTimeStamp: getTimeStamp,
    sanitizeName: sanitizeName,
    getBaseName: getBaseName,
    getPdfName: getPdfName,
    getJsonName: getJsonName,
    getBackupName: getBackupName
  };
})();