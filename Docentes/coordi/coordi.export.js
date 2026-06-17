/*
=========================================================
Nombre completo: coordi.export.js
Ruta o ubicación: /Docentes/coordi/coordi.export.js
Función o funciones:
- Exportar la tabla Coordi a Excel.
- Preparar columnas Carrera, Coordinador, Programa y Telegram.
- Generar nombre automático de respaldo.
- Usar XLSX si está disponible y alternativa .xls si no lo está.
Con qué se une:
- coordi.index.html
- coordi.app.js
- coordi.state.js
=========================================================
*/

(function () {
  "use strict";

  function download(rows) {
    const safeRows = buildExportRows(rows);
    const filename = buildFilename();

    if (window.XLSX) {
      downloadWithXlsx(safeRows, filename);
      return;
    }

    downloadAsHtmlExcel(safeRows, filename.replace(".xlsx", ".xls"));
  }

  function buildExportRows(rows) {
    return (Array.isArray(rows) ? rows : []).map((row) => ({
      Carrera: row.carrera || "",
      Coordinador: row.coordinador || "",
      Programa: row.programa || "",
      Telegram: row.telegram || ""
    }));
  }

  function downloadWithXlsx(rows, filename) {
    const worksheet = window.XLSX.utils.json_to_sheet(rows);
    const workbook = window.XLSX.utils.book_new();

    window.XLSX.utils.book_append_sheet(workbook, worksheet, "Coordi");
    window.XLSX.writeFile(workbook, filename);
  }

  function downloadAsHtmlExcel(rows, filename) {
    const headers = ["Carrera", "Coordinador", "Programa", "Telegram"];

    const tableRows = rows
      .map((row) => {
        const cells = headers
          .map((header) => `<td>${escapeHtml(row[header])}</td>`)
          .join("");

        return `<tr>${cells}</tr>`;
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
              <tr>
                ${headers.map((header) => `<th>${header}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    downloadBlob(
      html,
      filename,
      "application/vnd.ms-excel;charset=utf-8"
    );
  }

  function downloadBlob(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    URL.revokeObjectURL(url);
  }

  function buildFilename() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");

    return `Coordi_${yyyy}-${mm}-${dd}_${hh}h${min}.xlsx`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  window.CoordiExport = {
    download
  };
})();