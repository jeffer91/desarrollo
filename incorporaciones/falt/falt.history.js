// =========================================================
// INICIA ARCHIVO: falt.history.js
// RUTA O UBICACIÓN: /incorporaciones/falt/falt.history.js
// FUNCIÓN O FUNCIONES:
// - Guardar historial local de mensajes enviados o copiados.
// - Consultar último envío por período y cédula.
// - Marcar estudiante como contactado por WhatsApp, Telegram o copia manual.
// CON QUÉ SE CONECTA:
// - falt.config.js
// - falt.utils.js
// - falt.whatsapp.js
// - falt.telegram.js
// - falt.filters.js
// - falt.app.js
// =========================================================
(function (window) {
  "use strict";

  var U = window.FaltUtils;

  function getKey() {
    return (window.FaltConfig && window.FaltConfig.storage.historial) || "falt.historial.v1";
  }

  function readAll() {
    try {
      var raw = window.localStorage.getItem(getKey());
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.warn("[falt-history] No se pudo leer historial:", error);
      return [];
    }
  }

  function writeAll(list) {
    try {
      window.localStorage.setItem(getKey(), JSON.stringify(Array.isArray(list) ? list : []));
      return true;
    } catch (error) {
      console.warn("[falt-history] No se pudo guardar historial:", error);
      return false;
    }
  }

  function makeRegistro(row, data) {
    var meta = row && row._falt ? row._falt : {};
    var patch = data || {};

    return {
      id: "falt-" + Date.now() + "-" + Math.random().toString(16).slice(2),
      periodoId: U.asText(patch.periodoId || meta.periodoId),
      periodoLabel: U.asText(patch.periodoLabel || meta.periodoLabel),
      cedula: U.asText(patch.cedula || meta.cedula || U.getCedula(row)),
      estudiante: U.asText(patch.estudiante || meta.nombre || U.getNombres(row)),
      carrera: U.asText(patch.carrera || meta.carrera || U.getCarrera(row)),
      canal: U.asText(patch.canal || "Manual"),
      accion: U.asText(patch.accion || "enviado"),
      mensaje: U.asText(patch.mensaje),
      telefono: U.asText(patch.telefono || meta.telefono),
      telegram: U.asText(patch.telegram || meta.telegram),
      motivo: U.asText(patch.motivo || meta.motivo),
      creadoEn: new Date().toISOString()
    };
  }

  function guardarRegistro(row, data) {
    var list = readAll();
    var registro = makeRegistro(row, data);

    list.push(registro);
    writeAll(list);

    return registro;
  }

  function listarPorPeriodo(periodoId) {
    var pid = U.asText(periodoId);

    return readAll().filter(function (item) {
      return U.asText(item.periodoId) === pid;
    });
  }

  function listarPorEstudiante(periodoId, cedula) {
    var pid = U.asText(periodoId);
    var doc = U.asText(cedula);

    return readAll().filter(function (item) {
      return U.asText(item.periodoId) === pid && U.asText(item.cedula) === doc;
    });
  }

  function obtenerUltimo(periodoId, cedula) {
    var list = listarPorEstudiante(periodoId, cedula);

    if (!list.length) return null;

    return list.sort(function (a, b) {
      return new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime();
    })[0];
  }

  function limpiarPeriodo(periodoId) {
    var pid = U.asText(periodoId);
    var list = readAll().filter(function (item) {
      return U.asText(item.periodoId) !== pid;
    });

    writeAll(list);
    return true;
  }

  window.FaltHistory = {
    readAll: readAll,
    writeAll: writeAll,
    guardarRegistro: guardarRegistro,
    listarPorPeriodo: listarPorPeriodo,
    listarPorEstudiante: listarPorEstudiante,
    obtenerUltimo: obtenerUltimo,
    limpiarPeriodo: limpiarPeriodo
  };
})(window);
// =========================================================
// FINALIZA ARCHIVO: falt.history.js
// =========================================================