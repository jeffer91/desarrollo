/*
=========================================================
Nombre completo: falt.filters.js
Ruta o ubicación: /incorporaciones/falt/falt.filters.js

Función o funciones:
1. Filtrar la tabla de estudiantes seleccionados por texto, estado y canal.
2. Considerar como pendiente a todo estudiante agregado desde el pop-up.
3. Detectar si un estudiante ya fue enviado según historial local.
4. Detectar si tiene WhatsApp, Telegram o no tiene contacto.
5. Mantener la tabla enfocada solo en seleccionados, no en todos los estudiantes del período.

Con qué se conecta:
- falt.state.js
- falt.history.js
- falt.utils.js
- falt.table.js
- falt.app.js
=========================================================
*/

(function (window) {
  "use strict";

  var U = window.FaltUtils || {};

  function asText(value) {
    if (U.asText) return U.asText(value);
    return String(value == null ? "" : value).trim();
  }

  function normalizeText(value) {
    if (U.normalizeText) return U.normalizeText(value);

    return asText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function getMeta(row) {
    return row && row._falt ? row._falt : {};
  }

  function getBase(row) {
    return row && row._faltBase ? row._faltBase : {};
  }

  function getCedula(row) {
    if (U.getCedula) {
      return asText(U.getCedula(row));
    }

    var meta = getMeta(row);
    var base = getBase(row);

    return asText(
      meta.cedula ||
        base.cedula ||
        row.cedula ||
        row.Cedula ||
        row.CEDULA ||
        row.numeroIdentificacion ||
        row.identificacion
    );
  }

  function getNombres(row) {
    if (U.getNombres) {
      return asText(U.getNombres(row));
    }

    var meta = getMeta(row);
    var base = getBase(row);

    return asText(
      meta.nombre ||
        base.nombre ||
        row.Nombres ||
        row.nombres ||
        row.nombre ||
        row.Nombre ||
        row.estudiante
    );
  }

  function getCarrera(row) {
    if (U.getCarrera) {
      return asText(U.getCarrera(row));
    }

    var meta = getMeta(row);
    var base = getBase(row);

    return asText(
      meta.carrera ||
        base.carrera ||
        row.Carrera ||
        row.carrera ||
        row.nombreCarrera ||
        row.programa
    );
  }

  function getPeriodo(row) {
    var meta = getMeta(row);
    var base = getBase(row);

    return asText(
      meta.periodoTexto ||
        meta.periodo ||
        base.periodoTexto ||
        base.periodo ||
        row.periodo ||
        row.Periodo
    );
  }

  function getTelefono(row) {
    if (U.getTelefono) {
      return asText(U.getTelefono(row));
    }

    var base = getBase(row);

    return asText(
      base.telefono ||
        row.celular ||
        row.Celular ||
        row.telefono ||
        row.Telefono ||
        row.whatsapp ||
        row.WhatsApp
    );
  }

  function getTelegram(row) {
    if (U.getTelegram) {
      return asText(U.getTelegram(row));
    }

    var base = getBase(row);

    return asText(
      base.telegram ||
        row.telegram ||
        row.Telegram ||
        row.usuarioTelegram ||
        row.userTelegram
    );
  }

  function hasWhatsapp(row) {
    var phone = getTelefono(row).replace(/\D+/g, "");
    return phone.length >= 8;
  }

  function hasTelegram(row) {
    var tg = getTelegram(row).replace(/^@+/, "").trim();
    return tg.length >= 3;
  }

  function getHistorial(row, periodoId) {
    try {
      if (
        window.FaltHistory &&
        typeof window.FaltHistory.obtenerUltimoEnvio === "function"
      ) {
        return window.FaltHistory.obtenerUltimoEnvio(periodoId, getCedula(row));
      }
    } catch (error) {
      console.warn("[FaltFilters] No se pudo leer historial:", error);
    }

    return null;
  }

  function isEnviado(row, periodoId) {
    return Boolean(getHistorial(row, periodoId));
  }

  function getMotivo(row) {
    var meta = getMeta(row);

    return asText(
      meta.motivo ||
        (
          window.FaltConfig &&
          window.FaltConfig.motivoGeneral
        ) ||
        "Pendiente de completar registro, pago, comprobante o encuesta de incorporación."
    );
  }

  function matchesText(row, text) {
    var query = normalizeText(text);

    if (!query) return true;

    var target = normalizeText([
      getNombres(row),
      getCedula(row),
      getCarrera(row),
      getPeriodo(row),
      getMotivo(row)
    ].join(" "));

    return target.indexOf(query) >= 0;
  }

  function matchesEstado(row, estado, periodoId) {
    var value = asText(estado) || "todos";

    if (value === "todos") return true;

    var enviado = isEnviado(row, periodoId);

    if (value === "enviados") return enviado;
    if (value === "no_enviados") return !enviado;
    if (value === "faltantes") return true;

    return true;
  }

  function matchesCanal(row, canal) {
    var value = asText(canal) || "todos";

    if (value === "todos") return true;

    var w = hasWhatsapp(row);
    var t = hasTelegram(row);

    if (value === "whatsapp") return w;
    if (value === "telegram") return t;
    if (value === "sin_contacto") return !w && !t;

    return true;
  }

  function aplicar(rows, filtros, context) {
    var list = Array.isArray(rows) ? rows : [];
    var opts = context || {};
    var filter = filtros || {};

    return list.filter(function (row) {
      return (
        matchesText(row, filter.texto || filter.text || "") &&
        matchesEstado(row, filter.estado || "todos", opts.periodoId || "") &&
        matchesCanal(row, filter.canal || "todos")
      );
    });
  }

  function resumen(rows, visibles, periodoId) {
    var selected = Array.isArray(rows) ? rows : [];
    var shown = Array.isArray(visibles) ? visibles : selected;

    var enviados = selected.filter(function (row) {
      return isEnviado(row, periodoId);
    }).length;

    var conWhatsapp = selected.filter(hasWhatsapp).length;
    var conTelegram = selected.filter(hasTelegram).length;
    var sinContacto = selected.filter(function (row) {
      return !hasWhatsapp(row) && !hasTelegram(row);
    }).length;

    return {
      total: selected.length,
      visibles: shown.length,
      pendientes: selected.length - enviados,
      enviados: enviados,
      conWhatsapp: conWhatsapp,
      conTelegram: conTelegram,
      sinContacto: sinContacto
    };
  }

  window.FaltFilters = {
    aplicar: aplicar,
    resumen: resumen,
    getCedula: getCedula,
    getNombres: getNombres,
    getCarrera: getCarrera,
    getPeriodo: getPeriodo,
    getTelefono: getTelefono,
    getTelegram: getTelegram,
    getMotivo: getMotivo,
    hasWhatsapp: hasWhatsapp,
    hasTelegram: hasTelegram,
    isEnviado: isEnviado
  };
})(window);