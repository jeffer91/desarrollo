/*
=========================================================
Nombre completo: distribucion.export.js
Ruta o ubicación: /incorporaciones/sedes/distribucion/distribucion.export.js
Función o funciones:
- Exportar la distribución de jornadas a Excel.
- Incluir período, jornada, fecha, hora, carrera, coordinador y total de estudiantes.
- Generar nombre automático del archivo.
- Usar XLSX si está disponible y alternativa .xls si no lo está.
Con qué se une:
- distribucion.app.js
- distribucion.state.js
- distribucion.repo.js
=========================================================
*/

(function () {
  "use strict";

  function download(state) {
    const rows = buildRows(state);
    const filename = buildFilename(state);

    if (window.XLSX) {
      downloadWithXlsx(rows, filename);
      return;
    }

    downloadAsHtmlExcel(rows, filename.replace(".xlsx", ".xls"));
  }

  function buildRows(state) {
    const jornadas = Array.isArray(state.jornadas) ? state.jornadas : [];
    const distribucion = Array.isArray(state.distribucion) ? state.distribucion : [];

    return distribucion.map((item) => {
      const jornadaIndex = jornadas.findIndex((jornada) => jornada.id === item.jornadaId);
      const jornada = jornadas[jornadaIndex] || {};

      return {
        Periodo: state.periodoNombre || state.periodoId || "",
        Estado: state.estado || "borrador",
        Jornada: jornadaIndex >= 0 ? `Jornada ${jornadaIndex + 1}` : "",
        Fecha: formatDate(jornada.fecha),
        Hora: formatTime(jornada.hora),
        Carrera: item.carrera || "",
        Coordinador: item.coordinador || "",
        Programa: item.programa || "",
        Telegram: item.telegram || "",
        Estudiantes: Number(item.total || 0)
      };
    });
  }

  function downloadWithXlsx(rows, filename) {
    const worksheet = window.XLSX.utils.json_to_sheet(rows);
    const workbook = window.XLSX.utils.book_new();

    window.XLSX.utils.book_append_sheet(workbook, worksheet, "Distribucion");
    window.XLSX.writeFile(workbook, filename);
  }

  function downloadAsHtmlExcel(rows, filename) {
    const headers = [
      "Periodo",
      "Estado",
      "Jornada",
      "Fecha",
      "Hora",
      "Carrera",
      "Coordinador",
      "Programa",
      "Telegram",
      "Estudiantes"
    ];

    const tableRows = rows
      .map((row) => {
        return `
          <tr>
            ${headers.map((header) => `<td>${escape(row[header])}</td>`).join("")}
          </tr>
        `;
      })
      .join("");

    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
        </head>
        <body>
          <table border="1">
            <thead>
              <tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr>
            </thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8"
    });

    triggerDownload(blob, filename);
  }

  function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  }

  function buildFilename(state) {
    const periodo = String(state.periodoNombre || state.periodoId || "Periodo")
      .replace(/[^\wáéíóúÁÉÍÓÚñÑ-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");

    return `Distribucion_${periodo}.xlsx`;
  }

  function formatDate(value) {
    if (!value) {
      return "";
    }

    const parts = String(value).split("-");

    if (parts.length !== 3) {
      return value;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  function formatTime(value) {
    if (!value) {
      return "";
    }

    return String(value).replace(":", "h");
  }

  function escape(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  window.DistribucionExport = {
    download
  };
})();