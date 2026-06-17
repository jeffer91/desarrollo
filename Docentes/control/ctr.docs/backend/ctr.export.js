/* =========================================================
Nombre del archivo: ctr.export.js
Ruta - Ubicación: /control/ctr.docs/backend/ctr.export.js
Función o funciones:
- exportCsv(filename, rows): exporta archivo compatible con Excel (descarga local)
- Exporta la vista actual, incluyendo nombres/apellidos corregidos si llegaron en rows
========================================================= */
function escHtml(v){
  const s = String(v == null ? "" : v);
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function asText(v){
  return String(v == null ? "" : v).trim();
}

function normalizeToken(value){
  return asText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function formatExportDate(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

function normalizeExcelName(filename){
  const raw = String(filename || "ctr_exportacion").trim() || "ctr_exportacion";
  return raw.replace(/\.(csv|xls|xlsx)$/i, "") + ".xls";
}

function toDocenteLabel(value){
  // Comentario técnico:
  // el export ya no debe reducir el estado del docente a SI/NO.
  // Aquí convertimos el código persistido a una etiqueta legible.
  const token = normalizeToken(value);

  if (token === "🟢" || token === "ACTIVO") return "ACTIVO";
  if (token === "🚪" || token === "SALIO" || token === "SALIDA" || token === "YA_SALIO" || token === "INACTIVO"){
    return "SALIO";
  }
  if (token === "📝" || token === "RENUNCIO" || token === "RENUNCIA") return "RENUNCIO";

  return "ACTIVO";
}

function toDocLabel(value, fallback, allowBlocked){
  // Comentario técnico:
  // el export debe aceptar compatibilidad con datos viejos booleanos
  // y con estados nuevos en texto o emoji.
  if (typeof value === "boolean"){
    return value ? "TIENE" : fallback;
  }

  const token = normalizeToken(value);
  if (!token) return fallback;

  if (token === "✅" || token === "TIENE" || token === "SI" || token === "TRUE"){
    return "TIENE";
  }

  if (token === "⏳" || token === "PENDIENTE"){
    return "PENDIENTE";
  }

  if (token === "⛔" || token === "NO_APLICA"){
    return "NO_APLICA";
  }

  if (allowBlocked && (token === "🔒" || token === "BLOQUEADO" || token === "NO_HABILITADO")){
    return "BLOQUEADO";
  }

  return fallback;
}

export function exportCsv(filename, rows){
  const list = Array.isArray(rows) ? rows : [];
  const name = normalizeExcelName(filename);
  const exportedAt = formatExportDate();

  const bodyRows = list.map((r) => {
    const nombres = escHtml(r && r.nombres);
    const apellidos = escHtml(r && r.apellidos);
    const cedula = escHtml(r && r.cedula);

    // Comentario técnico:
    // exportamos el estado real para no perder información como
    // SALIO, RENUNCIO, NO_APLICA o BLOQUEADO.
    const estadoDocente = escHtml(toDocenteLabel(r && r.estadoDocente));
    const planIndividual = escHtml(toDocLabel(r && r.planIndividual, "PENDIENTE", false));
    const acuerdoPatrocinio = escHtml(
      r && r.acuerdoPatrocinio === null
        ? ""
        : toDocLabel(r && r.acuerdoPatrocinio, "PENDIENTE", true)
    );
    const reporteResultados = escHtml(toDocLabel(r && r.reporteResultados, "PENDIENTE", true));

    return `
      <tr>
        <td>${nombres}</td>
        <td>${apellidos}</td>
        <td style="mso-number-format:'\\@';">${cedula}</td>
        <td>${estadoDocente}</td>
        <td>${planIndividual}</td>
        <td>${acuerdoPatrocinio}</td>
        <td>${reporteResultados}</td>
      </tr>
    `;
  }).join("");

  const html = `
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        table {
          border-collapse: collapse;
          width: 100%;
          font-family: Arial, sans-serif;
          font-size: 12px;
        }
        th, td {
          border: 1px solid #B7C3D0;
          padding: 8px;
          text-align: left;
          vertical-align: middle;
        }
        th {
          background: #DCE6F1;
          font-weight: bold;
        }
        .title {
          background: #1F4E78;
          color: #FFFFFF;
          font-size: 14px;
          font-weight: bold;
        }
        .meta {
          background: #F3F6FA;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <table>
        <colgroup>
          <col style="width: 180px;">
          <col style="width: 180px;">
          <col style="width: 140px;">
          <col style="width: 130px;">
          <col style="width: 130px;">
          <col style="width: 150px;">
          <col style="width: 150px;">
        </colgroup>
        <tbody>
          <tr>
            <td class="title" colspan="7">Exportación de requisitos y datos del docente</td>
          </tr>
          <tr>
            <td class="meta" colspan="3">Fecha de generación: ${escHtml(exportedAt)}</td>
            <td class="meta" colspan="4">Total de registros: ${list.length}</td>
          </tr>
          <tr>
            <th>Nombres</th>
            <th>Apellidos</th>
            <th>Cédula</th>
            <th>Estado Docente</th>
            <th>Plan Individual</th>
            <th>Acuerdo Patrocinio</th>
            <th>Reporte Resultados</th>
          </tr>
          ${bodyRows || `
            <tr>
              <td colspan="7">Sin registros para exportar.</td>
            </tr>
          `}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", html], {
    type: "application/vnd.ms-excel;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;

  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 3000);
}