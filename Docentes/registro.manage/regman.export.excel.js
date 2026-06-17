/* =========================================================
Nombre del archivo: regman.export.excel.js
Ruta - Ubicación: /registro.manage/regman.export.excel.js
Función o funciones:
- Exporta la tabla de docentes a Excel compatible (.xls)
- Usa los datos cargados en state.S.docentes
- Respeta búsqueda, filtros y ordenamiento actual
- Incluye cédula, nombres, apellidos, sexo, carrera, celular y título
========================================================= */

function s(x){
  return (x === null || x === undefined) ? "" : String(x);
}

function clean(x){
  return s(x).replace(/\s+/g, " ").trim();
}

function norm(x){
  return clean(x).toLowerCase();
}

function escHtml(x){
  return clean(x)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sexoLabel(value){
  const v = clean(value).toUpperCase();
  if (v === "F") return "Mujer";
  if (v === "M") return "Hombre";
  return "";
}

function getFieldValue(row, key){
  return clean(row ? row[key] : "");
}

function compareRows(a, b, key, dir){
  const A = norm(getFieldValue(a, key));
  const B = norm(getFieldValue(b, key));
  const r = A.localeCompare(B, "es");
  return dir === "desc" ? -r : r;
}

function applyFilters(state, rows){
  const q = norm(state.S.search || "");
  const sx = clean(state.S.filterSexo || "");
  const cid = clean(state.S.filterCarreraId || "");

  return (rows || []).filter((d) => {
    if (sx && clean(d?.sexo) !== sx) return false;
    if (cid && clean(d?.carreraId) !== cid) return false;

    if (!q) return true;

    const bag = [
      d?.cedula,
      d?.nombres,
      d?.apellidos,
      d?.carreraNombre,
      d?.carreraId,
      d?.celular,
      d?.titulo
    ].map((x) => norm(x)).join(" ");

    return bag.includes(q);
  });
}

function applySort(state, rows){
  const key = clean(state.S.sortKey || "");
  const dir = clean(state.S.sortDir || "asc") || "asc";

  if (!key) return rows;

  const out = [...rows];
  out.sort((a, b) => compareRows(a, b, key, dir));
  return out;
}

function buildRows(state){
  const base = Array.isArray(state.S.docentes) ? state.S.docentes : [];
  const filtered = applyFilters(state, base);
  return applySort(state, filtered);
}

function buildExcelHtml(rows){
  const now = new Date();
  const fecha = now.toLocaleDateString("es-EC");

  const headers = [
    "Cédula",
    "Nombres",
    "Apellidos",
    "Sexo",
    "Carrera ID",
    "Carrera",
    "Celular",
    "Título"
  ];

  const body = rows.map((d) => `
    <tr>
      <td style="mso-number-format:'\\@';">${escHtml(d?.cedula)}</td>
      <td>${escHtml(d?.nombres)}</td>
      <td>${escHtml(d?.apellidos)}</td>
      <td>${escHtml(sexoLabel(d?.sexo))}</td>
      <td style="mso-number-format:'\\@';">${escHtml(d?.carreraId)}</td>
      <td>${escHtml(d?.carreraNombre)}</td>
      <td style="mso-number-format:'\\@';">${escHtml(d?.celular)}</td>
      <td>${escHtml(d?.titulo)}</td>
    </tr>
  `).join("");

  return `
    <html>
    <head>
      <meta charset="UTF-8" />
      <style>
        table {
          border-collapse: collapse;
          font-family: Arial, sans-serif;
          font-size: 12px;
        }
        th {
          background: #1d4ed8;
          color: #ffffff;
          font-weight: bold;
          border: 1px solid #94a3b8;
          padding: 8px;
        }
        td {
          border: 1px solid #cbd5e1;
          padding: 6px;
          vertical-align: top;
        }
        .title {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 4px;
        }
        .meta {
          font-size: 12px;
          color: #475569;
          margin-bottom: 12px;
        }
      </style>
    </head>
    <body>
      <div class="title">Registro de docentes</div>
      <div class="meta">Exportado: ${escHtml(fecha)} | Total registros: ${rows.length}</div>

      <table>
        <thead>
          <tr>
            ${headers.map((h) => `<th>${escHtml(h)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${body || `<tr><td colspan="${headers.length}">Sin datos</td></tr>`}
        </tbody>
      </table>
    </body>
    </html>
  `;
}

function downloadExcel({ html, filename }){
  const blob = new Blob(["\uFEFF", html], {
    type: "application/vnd.ms-excel;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  a.style.display = "none";

  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function buildFilename(){
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");

  return `registro_docentes_${y}-${m}-${d}.xls`;
}

export function exportRegmanExcel({ state }){
  const rows = buildRows(state);
  const html = buildExcelHtml(rows);
  const filename = buildFilename();

  downloadExcel({ html, filename });

  return {
    ok: true,
    count: rows.length,
    filename
  };
}