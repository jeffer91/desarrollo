/*
=========================================================
Nombre completo: falt.table.js
Ruta o ubicación: /incorporaciones/falt/falt.table.js

Función o funciones:
1. Renderizar la tabla principal de estudiantes seleccionados.
2. Mostrar nombre, cédula, carrera, período, motivo, contacto, estado y acciones.
3. Mostrar botones para WhatsApp, Telegram, copiar mensaje, marcar enviado y quitar.
4. Renderizar resumen de seleccionados, pendientes y enviados.
5. Mantener la tabla coherente con la lógica del pop-up.

Con qué se conecta:
- falt.filters.js
- falt.message.js
- falt.history.js
- falt.whatsapp.js
- falt.telegram.js
- falt.app.js
=========================================================
*/

(function (window, document) {
  "use strict";

  function asText(value) {
    return String(value == null ? "" : value).trim();
  }

  function escapeHtml(value) {
    return asText(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getFilters() {
    return window.FaltFilters || {};
  }

  function getMessage() {
    return window.FaltMessage || {};
  }

  function getCedula(row) {
    var F = getFilters();

    if (F.getCedula) return F.getCedula(row);

    return asText(row.cedula || row.Cedula || row.numeroIdentificacion);
  }

  function getNombres(row) {
    var F = getFilters();

    if (F.getNombres) return F.getNombres(row);

    return asText(row.Nombres || row.nombres || row.nombre);
  }

  function getCarrera(row) {
    var F = getFilters();

    if (F.getCarrera) return F.getCarrera(row);

    return asText(row.Carrera || row.carrera);
  }

  function getPeriodo(row) {
    var F = getFilters();

    if (F.getPeriodo) return F.getPeriodo(row);

    var meta = row && row._falt ? row._falt : {};

    return asText(meta.periodoTexto || meta.periodo || row.periodo || row.Periodo);
  }

  function getMotivo(row) {
    var F = getFilters();

    if (F.getMotivo) return F.getMotivo(row);

    return "Pendiente de incorporación";
  }

  function getTelefono(row) {
    var F = getFilters();

    if (F.getTelefono) return F.getTelefono(row);

    return asText(row.celular || row.Celular || row.telefono || row.whatsapp);
  }

  function getTelegram(row) {
    var F = getFilters();

    if (F.getTelegram) return F.getTelegram(row);

    return asText(row.telegram || row.Telegram || row.usuarioTelegram);
  }

  function hasWhatsapp(row) {
    var F = getFilters();

    if (F.hasWhatsapp) return F.hasWhatsapp(row);

    return getTelefono(row).replace(/\D+/g, "").length >= 8;
  }

  function hasTelegram(row) {
    var F = getFilters();

    if (F.hasTelegram) return F.hasTelegram(row);

    return getTelegram(row).replace(/^@+/, "").length >= 3;
  }

  function isEnviado(row, periodoId) {
    var F = getFilters();

    if (F.isEnviado) return F.isEnviado(row, periodoId);

    return false;
  }

  function rowKey(row, index) {
    var cedula = getCedula(row).replace(/\D+/g, "");

    if (cedula.length === 9) cedula = "0" + cedula;

    return cedula || "row_" + index;
  }

  function renderContacto(row) {
    var phone = getTelefono(row);
    var telegram = getTelegram(row);
    var parts = [];

    if (phone) {
      parts.push(
        '<span class="falt-contact-item">WhatsApp: ' + escapeHtml(phone) + "</span>"
      );
    }

    if (telegram) {
      parts.push(
        '<span class="falt-contact-item">Telegram: ' + escapeHtml(telegram) + "</span>"
      );
    }

    if (!parts.length) {
      parts.push('<span class="falt-contact-item">Sin contacto registrado</span>');
    }

    return '<div class="falt-contact-list">' + parts.join("") + "</div>";
  }

  function renderEstado(row, periodoId) {
    if (isEnviado(row, periodoId)) {
      return '<span class="falt-badge falt-badge-success">Enviado</span>';
    }

    return '<span class="falt-badge falt-badge-warning">Pendiente</span>';
  }

  function renderActions(row, index) {
    var key = rowKey(row, index);
    var whatsappDisabled = hasWhatsapp(row) ? "" : " disabled";
    var telegramDisabled = hasTelegram(row) ? "" : " disabled";

    return [
      '<div class="falt-row-actions">',
      '<button type="button" class="falt-btn falt-btn-primary" data-falt-action="whatsapp" data-falt-id="' + escapeHtml(key) + '"' + whatsappDisabled + ">WhatsApp</button>",
      '<button type="button" class="falt-btn falt-btn-secondary" data-falt-action="telegram" data-falt-id="' + escapeHtml(key) + '"' + telegramDisabled + ">Telegram</button>",
      '<button type="button" class="falt-btn falt-btn-ghost" data-falt-action="copiar" data-falt-id="' + escapeHtml(key) + '">Copiar</button>',
      '<button type="button" class="falt-btn falt-btn-ghost" data-falt-action="enviado" data-falt-id="' + escapeHtml(key) + '">Marcar enviado</button>',
      '<button type="button" class="falt-btn falt-btn-danger" data-falt-action="quitar" data-falt-id="' + escapeHtml(key) + '">Quitar</button>',
      "</div>"
    ].join("");
  }

  function renderRow(row, index, periodoId) {
    var key = rowKey(row, index);
    var nombre = getNombres(row);
    var cedula = getCedula(row);
    var carrera = getCarrera(row);
    var periodo = getPeriodo(row);
    var motivo = getMotivo(row);

    return [
      '<tr data-falt-row-id="' + escapeHtml(key) + '">',
      "<td>",
      '<span class="falt-student-name">' + escapeHtml(nombre || "Sin nombre") + "</span>",
      '<span class="falt-student-meta">Cargado desde búsqueda manual</span>',
      "</td>",
      "<td>" + escapeHtml(cedula || "Sin cédula") + "</td>",
      "<td>" + escapeHtml(carrera || "Sin carrera") + "</td>",
      "<td>" + escapeHtml(periodo || "Sin período") + "</td>",
      "<td>" + escapeHtml(motivo) + "</td>",
      "<td>" + renderContacto(row) + "</td>",
      "<td>" + renderEstado(row, periodoId) + "</td>",
      '<td class="falt-center">' + renderActions(row, index) + "</td>",
      "</tr>"
    ].join("");
  }

  function renderEmpty(tbody, message) {
    tbody.innerHTML = [
      "<tr>",
      '<td colspan="8" class="falt-empty">',
      escapeHtml(message || "No hay estudiantes seleccionados."),
      "</td>",
      "</tr>"
    ].join("");
  }

  function renderTabla(rows, options) {
    var opts = options || {};
    var tbody = document.getElementById("falt-table-body");

    if (!tbody) return;

    var list = Array.isArray(rows) ? rows : [];

    if (!opts.periodoId) {
      renderEmpty(tbody, "Selecciona un período y usa “Buscar estudiantes”.");
      return;
    }

    if (!list.length) {
      renderEmpty(tbody, "No hay estudiantes seleccionados. Usa “Buscar estudiantes”.");
      return;
    }

    tbody.innerHTML = list.map(function (row, index) {
      return renderRow(row, index, opts.periodoId);
    }).join("");
  }

  function renderResumen(resumen, periodoTexto) {
    var total = document.getElementById("falt-kpi-total");
    var faltantes = document.getElementById("falt-kpi-faltantes");
    var enviados = document.getElementById("falt-kpi-enviados");
    var resumenText = document.getElementById("falt-resumen");

    var data = resumen || {
      total: 0,
      visibles: 0,
      pendientes: 0,
      enviados: 0,
      conWhatsapp: 0,
      conTelegram: 0,
      sinContacto: 0
    };

    if (total) total.textContent = data.total || 0;
    if (faltantes) faltantes.textContent = data.pendientes || 0;
    if (enviados) enviados.textContent = data.enviados || 0;

    if (resumenText) {
      if (!periodoTexto) {
        resumenText.textContent = "Selecciona un período y luego usa “Buscar estudiantes”.";
      } else if (!data.total) {
        resumenText.textContent =
          "Período: " + periodoTexto + ". No hay estudiantes seleccionados.";
      } else {
        resumenText.textContent =
          "Período: " + periodoTexto +
          ". Seleccionados: " + data.total +
          ". Visibles: " + data.visibles +
          ". Pendientes: " + data.pendientes +
          ". Enviados: " + data.enviados +
          ". WhatsApp: " + data.conWhatsapp +
          ". Telegram: " + data.conTelegram +
          ". Sin contacto: " + data.sinContacto + ".";
      }
    }
  }

  function renderPreview(row, options) {
    var preview = document.getElementById("falt-message-preview");

    if (!preview) return;

    var M = getMessage();

    if (M.generarVistaPrevia) {
      preview.textContent = M.generarVistaPrevia(row, options || {});
      return;
    }

    preview.textContent = "Selecciona un estudiante para ver el mensaje.";
  }

  function findRowById(rows, id) {
    var wanted = asText(id);

    for (var i = 0; i < (rows || []).length; i += 1) {
      if (rowKey(rows[i], i) === wanted) {
        return rows[i];
      }
    }

    return null;
  }

  window.FaltTable = {
    renderTabla: renderTabla,
    renderResumen: renderResumen,
    renderPreview: renderPreview,
    findRowById: findRowById,
    rowKey: rowKey
  };
})(window, document);