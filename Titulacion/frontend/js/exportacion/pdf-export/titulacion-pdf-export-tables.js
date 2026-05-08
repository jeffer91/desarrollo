/* =========================================================
Nombre completo: titulacion-pdf-export-tables.js
Ruta: /Titulacion/frontend/js/exportacion/pdf-export/titulacion-pdf-export-tables.js
Función o funciones:
- Crear tablas pdfMake reutilizables.
- Construir tablas de indicadores, resultados y distribuciones.
- Evitar errores cuando no existan datos.
========================================================= */

(function (window) {
  "use strict";

  function U() {
    return window.TITULACION_PDF_EXPORT_UTILS || {};
  }

  function asText(value, fallback) {
    return U().asText ? U().asText(value, fallback) : String(value || fallback || "").trim();
  }

  function cell(value, options) {
    return Object.assign({
      text: asText(value),
      style: "tableCell"
    }, options || {});
  }

  function headerCell(value, options) {
    return Object.assign({
      text: asText(value),
      style: "tableHeader",
      fillColor: "#e5e7eb"
    }, options || {});
  }

  function emptyMessage(message) {
    return {
      text: asText(message, "No se registran datos."),
      italics: true,
      fontSize: 9,
      margin: [0, 4, 0, 8]
    };
  }

  function simpleTable(headers, rows, widths) {
    var h = Array.isArray(headers) ? headers : [];
    var r = Array.isArray(rows) ? rows : [];

    if (!h.length || !r.length) {
      return emptyMessage("No se registran datos para la tabla.");
    }

    return {
      table: {
        headerRows: 1,
        widths: widths || h.map(function () { return "*"; }),
        body: [
          h.map(function (item) {
            return headerCell(item);
          })
        ].concat(r.map(function (row) {
          return row.map(function (item) {
            return cell(item);
          });
        }))
      },
      layout: {
        hLineWidth: function () { return 0.5; },
        vLineWidth: function () { return 0.5; },
        hLineColor: function () { return "#9ca3af"; },
        vLineColor: function () { return "#9ca3af"; },
        paddingLeft: function () { return 4; },
        paddingRight: function () { return 4; },
        paddingTop: function () { return 3; },
        paddingBottom: function () { return 3; }
      },
      margin: [0, 4, 0, 10]
    };
  }

  function keyValueTable(items) {
    var list = Array.isArray(items) ? items : [];

    if (!list.length) {
      return emptyMessage("No se registran indicadores.");
    }

    return simpleTable(
      ["Indicador", "Valor"],
      list.map(function (item) {
        return [
          item.label || item.key || "Indicador",
          item.value || item.total || "0"
        ];
      }),
      ["*", 90]
    );
  }

  function distributionTable(title, items) {
    var list = Array.isArray(items) ? items : [];

    var content = [];

    if (title) {
      content.push({
        text: asText(title),
        style: "h3"
      });
    }

    content.push(simpleTable(
      ["Detalle", "Total"],
      list.map(function (item) {
        return [
          item.label || "Sin especificar",
          Number(item.total || 0)
        ];
      }),
      ["*", 70]
    ));

    return content;
  }

  function resultadosTable(resumen) {
    var r = resumen || {};

    return simpleTable(
      ["Resultado", "Total", "Porcentaje"],
      [
        ["Aprobados / habilitados", Number(r.aprobados || 0), String(Number(r.porcentajeAprobacion || 0)) + "%"],
        ["Pendientes", Number(r.pendientes || 0), String(Number(r.porcentajePendientes || 0)) + "%"],
        ["No aprobados", Number(r.noAprobados || 0), String(Number(r.porcentajeNoAprobados || 0)) + "%"],
        ["Retirados", Number(r.retirados || 0), String(Number(r.porcentajeRetirados || 0)) + "%"]
      ],
      ["*", 70, 70]
    );
  }

  function resultadosPorCarreraTable(items) {
    var list = Array.isArray(items) ? items : [];

    return simpleTable(
      ["Carrera", "Total", "Aprobados", "Pendientes", "No aprobados", "% aprobación"],
      list.map(function (item) {
        return [
          item.carrera || "Sin carrera",
          Number(item.total || 0),
          Number(item.aprobados || 0),
          Number(item.pendientes || 0),
          Number(item.noAprobados || 0),
          String(Number(item.porcentajeAprobacion || 0)) + "%"
        ];
      }),
      ["*", 46, 54, 54, 58, 62]
    );
  }

  window.TITULACION_PDF_EXPORT_TABLES = {
    cell: cell,
    headerCell: headerCell,
    emptyMessage: emptyMessage,
    simpleTable: simpleTable,
    keyValueTable: keyValueTable,
    distributionTable: distributionTable,
    resultadosTable: resultadosTable,
    resultadosPorCarreraTable: resultadosPorCarreraTable
  };
})(window);