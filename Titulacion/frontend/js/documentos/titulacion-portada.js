/* =========================================================
Nombre completo: titulacion-portada.js
Ruta: /Titulacion/frontend/js/documentos/titulacion-portada.js
Función o funciones:
- Construir los datos institucionales de portada.
- Generar portada para vista HTML.
- Preparar estructura de portada para exportación PDF.
- Mantener título, código, fecha, modalidad y tabla de firmas.
- Conservar formato institucional sin depender del core principal.
========================================================= */

(function (window) {
  "use strict";

  function cfg() {
    return window.TITULACION_CONFIG || {};
  }

  function utils() {
    return window.TITULACION_UTILS || {};
  }

  function codeApi() {
    return window.TITULACION_DOCUMENT_CODE || {};
  }

  function asText(value) {
    var U = utils();
    if (typeof U.asText === "function") return U.asText(value);
    return String(value == null ? "" : value).trim();
  }

  function esc(value) {
    var U = utils();
    if (typeof U.escapeHtml === "function") return U.escapeHtml(value);

    return asText(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(date) {
    var U = utils();

    if (typeof U.formatDateLongEs === "function") {
      return U.formatDateLongEs(date || new Date());
    }

    var d = date instanceof Date ? date : new Date();

    return [
      String(d.getDate()).padStart(2, "0"),
      String(d.getMonth() + 1).padStart(2, "0"),
      d.getFullYear()
    ].join("-");
  }

  function getInstitution() {
    var C = cfg();
    return C.institution || {};
  }

  function getDocumentConfig() {
    var C = cfg();
    return C.documentos || {};
  }

  function getFirmas() {
    var C = cfg();
    return C.firmas || {};
  }

  function buildTitle(args) {
    var options = args || {};
    var doc = getDocumentConfig();

    var base = asText(options.titulo || doc.tituloBase || "Informe Final Del Proceso De Titulación");
    var periodo = asText(options.periodoLabel || options.periodo || "");
    var modalidad = asText(options.modalidadLabel || options.modalidad || "");

    var lines = [base];

    if (periodo) {
      lines.push(periodo);
    }

    if (modalidad && modalidad.toLowerCase() !== "general") {
      lines.push(modalidad);
    }

    return lines.join("\n");
  }

  function buildHeaderMeta(args) {
    var options = args || {};
    var C = getInstitution();
    var Code = codeApi();

    if (typeof Code.createHeaderMeta === "function") {
      return Code.createHeaderMeta({
        date: options.date || new Date(),
        final: options.final === true,
        sequence: options.sequence,
        fechaElaboracion: options.fechaElaboracion
      });
    }

    return {
      unidad: asText(C.unidad || "Unidad de Titulación y Eficiencia Terminal"),
      codigo: asText(options.codigoDocumento || "UTET-INF-01-PRO-95-2026-05"),
      version: asText(C.versionDocumento || "1.0"),
      fechaElaboracion: asText(options.fechaElaboracion || formatDate(options.date || new Date()))
    };
  }

  function buildFirmasData() {
    var firmas = getFirmas();

    return {
      elaboradoPor: firmas.elaboradoPor || {
        nombre: "MSc. Jefferson Villarreal",
        cargo: "COORDINADOR DE TITULACIÓN Y EFICIENCIA TERMINAL"
      },
      revisadoPor: firmas.revisadoPor || {
        nombre: "Ing. Martha Tomalá",
        cargo: "COORDINADORA GENERAL DE CARRERAS"
      },
      aprobadoPor: firmas.aprobadoPor || {
        nombre: "Dr. Alex León T.",
        cargo: "VICERRECTOR"
      }
    };
  }

  function buildCoverData(args) {
    var options = args || {};
    var inst = getInstitution();
    var header = buildHeaderMeta(options);

    return {
      unidad: asText(header.unidad || inst.unidad || "Unidad de Titulación y Eficiencia Terminal"),
      codigo: asText(options.codigoDocumento || header.codigo),
      version: asText(header.version || inst.versionDocumento || "1.0"),
      fechaElaboracion: asText(options.fechaElaboracion || header.fechaElaboracion),
      titulo: buildTitle(options),
      periodoLabel: asText(options.periodoLabel || options.periodo),
      modalidadLabel: asText(options.modalidadLabel || options.modalidad),
      logoDataUrl: asText(options.logoDataUrl || ""),
      firmas: buildFirmasData()
    };
  }

  function firmaCellHtml(label, persona) {
    var p = persona || {};

    return [
      '<td class="cover-sign-cell">',
      '<div class="cover-sign-label">', esc(label), '</div>',
      '<div class="cover-sign-space"></div>',
      '<div class="cover-sign-name"><strong>NOMBRE:</strong> ', esc(p.nombre || ""), '</div>',
      '<div class="cover-sign-role"><strong>CARGO:</strong><br>', esc(p.cargo || ""), '</div>',
      '</td>'
    ].join("");
  }

  function buildCoverHtml(args) {
    var data = buildCoverData(args);
    var firmas = data.firmas || {};

    return [
      '<section class="titulacion-cover">',
      '<table class="cover-top-table">',
      '<tr>',
      '<td class="cover-logo-cell" rowspan="3">',
      data.logoDataUrl
        ? '<img class="cover-logo" src="' + esc(data.logoDataUrl) + '" alt="Logo institucional">'
        : '<div class="cover-logo-placeholder">LOGO</div>',
      '</td>',
      '<td class="cover-unit-cell" rowspan="3">', esc(data.unidad), '</td>',
      '<td class="cover-meta-label">Código:</td>',
      '<td class="cover-meta-value">', esc(data.codigo), '</td>',
      '</tr>',
      '<tr>',
      '<td class="cover-meta-label">Versión:</td>',
      '<td class="cover-meta-value">', esc(data.version), '</td>',
      '</tr>',
      '<tr>',
      '<td class="cover-meta-label">Fecha de Elaboración:</td>',
      '<td class="cover-meta-value">', esc(data.fechaElaboracion), '</td>',
      '</tr>',
      '</table>',

      '<div class="cover-title-box">',
      esc(data.titulo).replace(/\n/g, "<br>"),
      '</div>',

      '<table class="cover-sign-table">',
      '<tr>',
      '<th>ELABORADO POR:</th>',
      '<th>REVISADO POR:</th>',
      '<th>APROBADO POR:</th>',
      '</tr>',
      '<tr>',
      firmaCellHtml("ELABORADO POR:", firmas.elaboradoPor),
      firmaCellHtml("REVISADO POR:", firmas.revisadoPor),
      firmaCellHtml("APROBADO POR:", firmas.aprobadoPor),
      '</tr>',
      '</table>',
      '</section>'
    ].join("");
  }

  function createSection(args) {
    var data = buildCoverData(args);

    return {
      id: "portada",
      titulo: "Portada",
      tipo: "portada",
      visible: true,
      data: data,
      contenido: [
        data.titulo.replace(/\n/g, " "),
        "Código documental: " + data.codigo + ".",
        "Fecha de elaboración: " + data.fechaElaboracion + "."
      ]
    };
  }

  window.TITULACION_PORTADA = {
    buildTitle: buildTitle,
    buildHeaderMeta: buildHeaderMeta,
    buildFirmasData: buildFirmasData,
    buildCoverData: buildCoverData,
    buildCoverHtml: buildCoverHtml,
    createSection: createSection
  };
})(window);