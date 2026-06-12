// =========================================================
// INICIA ARCHIVO: falt.whatsapp.js
// RUTA O UBICACIÓN: /incorporaciones/falt/falt.whatsapp.js
// FUNCIÓN O FUNCIONES:
// - Construir enlace de WhatsApp con mensaje personalizado.
// - Abrir WhatsApp Web o aplicación mediante wa.me.
// - Registrar historial cuando se abre el mensaje.
// - Copiar mensaje si no existe número de WhatsApp.
// CON QUÉ SE CONECTA:
// - falt.utils.js
// - falt.message.js
// - falt.history.js
// - falt.app.js
// =========================================================
(function (window) {
  "use strict";

  var U = window.FaltUtils;

  function buildLink(row, options) {
    var meta = row && row._falt ? row._falt : {};
    var phone = U.cleanPhone(meta.telefono || U.getPhone(row));
    var mensaje = window.FaltMessage.generarMensajePlano(row, options);

    if (!phone) {
      return {
        ok: false,
        phone: "",
        mensaje: mensaje,
        url: ""
      };
    }

    return {
      ok: true,
      phone: phone,
      mensaje: mensaje,
      url: "https://wa.me/" + phone + "?text=" + encodeURIComponent(mensaje)
    };
  }

  async function abrir(row, options) {
    var opts = options || {};
    var result = buildLink(row, opts);

    if (!result.ok) {
      await U.copyToClipboard(result.mensaje);

      if (window.FaltHistory) {
        window.FaltHistory.guardarRegistro(row, {
          periodoId: opts.periodoId,
          periodoLabel: opts.periodoLabel,
          canal: "Copiado",
          accion: "copiado_sin_whatsapp",
          mensaje: result.mensaje
        });
      }

      return {
        ok: false,
        motivo: "El estudiante no tiene número de WhatsApp. El mensaje fue copiado."
      };
    }

    window.open(result.url, "_blank", "noopener,noreferrer");

    if (window.FaltHistory) {
      window.FaltHistory.guardarRegistro(row, {
        periodoId: opts.periodoId,
        periodoLabel: opts.periodoLabel,
        canal: "WhatsApp",
        accion: "abierto",
        mensaje: result.mensaje,
        telefono: result.phone
      });
    }

    return {
      ok: true,
      motivo: "WhatsApp abierto correctamente."
    };
  }

  window.FaltWhatsapp = {
    buildLink: buildLink,
    abrir: abrir
  };
})(window);
// =========================================================
// FINALIZA ARCHIVO: falt.whatsapp.js
// =========================================================