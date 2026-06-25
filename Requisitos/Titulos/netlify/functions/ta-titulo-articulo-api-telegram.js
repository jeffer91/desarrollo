/*
  Nombre completo: ta-titulo-articulo-api-telegram.js
  Ruta o ubicación: /Requisitos/Titulos/netlify/functions/ta-titulo-articulo-api-telegram.js
  Función o funciones:
  - Enviar mensajes de Telegram desde Netlify Functions.
  - Mantener el token del bot fuera del frontend público.
  - Permitir avisos al estudiante cuando su título fue aprobado, corregido o devuelto.
*/

import {
  badRequest,
  cleanString,
  handleOptions,
  ok,
  parseBody,
  requireAdminToken,
  serverError,
  unauthorized,
  validarMetodoPost
} from "./ta-titulo-articulo-api-security.js";

function limpiarChatId(value) {
  return cleanString(value).replace(/[^0-9-]/g, "");
}

async function enviarMensajeTelegram(chatId, mensaje) {
  const token = cleanString(process.env.TELEGRAM_BOT_TOKEN);
  if (!token) {
    throw new Error("No está configurado TELEGRAM_BOT_TOKEN.");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: mensaje,
      parse_mode: "HTML",
      disable_web_page_preview: true
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.description || "No se pudo enviar el mensaje por Telegram.");
  }

  return data;
}

async function enviarMensaje(payload) {
  const chatId = limpiarChatId(payload.chatId);
  const mensaje = cleanString(payload.mensaje);

  if (!chatId) return badRequest("Ingrese un chat ID válido.");
  if (!mensaje) return badRequest("Ingrese el mensaje que se enviará por Telegram.");

  const telegram = await enviarMensajeTelegram(chatId, mensaje);
  return ok({ mensaje: "Mensaje enviado por Telegram.", telegramMessageId: telegram?.result?.message_id || null });
}

export async function handler(event) {
  const options = handleOptions(event);
  if (options) return options;

  try {
    validarMetodoPost(event);
    requireAdminToken(event);
    const { action, payload } = parseBody(event);

    if (action === "enviarMensaje") return await enviarMensaje(payload);

    return badRequest("Acción de Telegram no reconocida.");
  } catch (error) {
    if (error.statusCode === 401) return unauthorized(error.message);
    return serverError(error);
  }
}
