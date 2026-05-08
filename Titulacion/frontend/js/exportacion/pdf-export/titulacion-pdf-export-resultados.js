/* =========================================================
Nombre completo: titulacion-pdf-export-resultados.js
Ruta: /Titulacion/frontend/js/exportacion/pdf-export/titulacion-pdf-export-resultados.js
Función o funciones:
- Construir bloques PDF para resultados generales.
- Insertar tablas de resumen y resultados por carrera.
- Crear indicadores visuales simples para pdfMake.
========================================================= */

(function (window) {
  "use strict";

  function T() {
    return window.TITULACION_PDF_EXPORT_TABLES || {};
  }

  function H() {
    return window.TITULACION_PDF_EXPORT_HEADINGS || {};
  }

  function R() {
    return window.TITULACION_BRAIN_RESULTADOS || {};
  }

  function paragraph(value) {
    if (H().paragraph) return H().paragraph(value);
    return { text: String(value || ""), style: "paragraph" };
  }

  function buildResumen(rows) {
    if (typeof R().buildResultadoResumen === "function") {
      return R().buildResultadoResumen(rows);
    }

    return {
      total: Array.isArray(rows) ? rows.length : 0,
      aprobados: 0,
      pendientes: 0,
      noAprobados: 0,
      retirados: 0,
      porcentajeAprobacion: 0
    };
  }

  function buildPorCarrera(rows) {
    if (typeof R().buildResultadosPorCarrera === "function") {
      return R().buildResultadosPorCarrera(rows);
    }

    return [];
  }

  function indicatorCards(resumen) {
    var r = resumen || {};

    return {
      columns: [
        indicator("Total", r.total || 0),
        indicator("Aprobados", r.aprobados || 0),
        indicator("Pendientes", r.pendientes || 0),
        indicator("% aprobación", String(r.porcentajeAprobacion || 0) + "%")
      ],
      columnGap: 8,
      margin: [0, 4, 0, 12]
    };
  }

  function indicator(label, value) {
    return {
      table: {
        widths: ["*"],
        body: [
          [
            {
              text: String(value),
              alignment: "center",
              bold: true,
              fontSize: 13,
              margin: [0, 5, 0, 2]
            }
          ],
          [
            {
              text: String(label),
              alignment: "center",
              fontSize: 7,
              margin: [0, 0, 0, 5]
            }
          ]
        ]
      },
      layout: {
        hLineWidth: function () { return 0.5; },
        vLineWidth: function () { return 0.5; },
        hLineColor: function () { return "#d1d5db"; },
        vLineColor: function () { return "#d1d5db"; }
      }
    };
  }

  function buildResultadosContent(rows, contexto) {
    var list = Array.isArray(rows) ? rows : [];
    var resumen = buildResumen(list);
    var porCarrera = buildPorCarrera(list);
    var content = [];

    content.push({
      text: "Resultados consolidados",
      style: "h2"
    });

    content.push(paragraph(
      "La siguiente información resume los resultados generales procesados para el informe."
    ));

    content.push(indicatorCards(resumen));

    if (T().resultadosTable) {
      content.push(T().resultadosTable(resumen));
    }

    if (porCarrera.length && T().resultadosPorCarreraTable) {
      content.push({
        text: "Resultados por carrera",
        style: "h2"
      });

      content.push(T().resultadosPorCarreraTable(porCarrera));
    }

    return content;
  }

  window.TITULACION_PDF_EXPORT_RESULTADOS = {
    buildResumen: buildResumen,
    buildPorCarrera: buildPorCarrera,
    indicator: indicator,
    indicatorCards: indicatorCards,
    buildResultadosContent: buildResultadosContent
  };
})(window);