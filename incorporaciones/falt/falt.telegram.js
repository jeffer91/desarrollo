// =========================================================
// INICIA ARCHIVO: falt.telegram.js
// RUTA O UBICACIÓN: /incorporaciones/falt/falt.telegram.js
// FUNCIÓN O FUNCIONES:
// - Copiar mensaje personalizado para Telegram.
// - Abrir perfil de Telegram si existe usuario registrado.
// - Registrar historial del contacto por Telegram.
// CON QUÉ SE CONECTA:
// - falt.utils.js
// - falt.message.js
// - falt.history.js
// - falt.app.js
// =========================================================
(function (window) {
  "use strict";

  var U = window.FaltUtils;

  function cleanUser(value) {
    return U.asText(value).replace(/^@/, "").trim();
  }

  function buildLink(row) {
    var meta = row && row._falt ? row._falt : {};
    var user = cleanUser(meta.telegram || U.getTelegram(row));

    if (!user) {
      return {
        ok: false,
        user: "",
        url: ""
      };
    }

    return {
      ok: true,
      user: user,
      url: "https://t.me/" + encodeURIComponent(user)
    };
  }

  async function copiar(row, options) {
    var opts = options || {};
    var mensaje = window.FaltMessage.generarMensajePlano(row, opts);
    await U.copyToClipboard(mensaje);

    if (window.FaltHistory) {
      window.FaltHistory.guardarRegistro(row, {
        periodoId: opts.periodoId,
        periodoLabel: opts.periodoLabel,
        canal: "Telegram",
        accion: "mensaje_copiado",
        mensaje: mensaje
      });
    }

    return {
      ok: true,
      motivo: "Mensaje copiado para Telegram."
    };
  }

  async function abrir(row, options) {
    var opts = options || {};
    var link = buildLink(row);

    await copiar(row, opts);

    if (link.ok) {
      window.open(link.url, "_blank", "noopener,noreferrer");
      return {
        ok: true,
        motivo: "Telegram abierto y mensaje copiado."
      };
    }

    return {
      ok: false,
      motivo: "No existe usuario de Telegram. El mensaje fue copiado."
    };
  }

  window.FaltTelegram = {
    cleanUser: cleanUser,
    buildLink: buildLink,
    copiar: copiar,
    abrir: abrir
  };
})(window);
// =========================================================
// FINALIZA ARCHIVO: falt.telegram.js
// =========================================================