/*
Nombre completo: ctl.render.carrera.js
Ruta o ubicación: /control/ctl.render.carrera.js
Función o funciones:
- Renderizar la tabla resumen por carrera
- Renderizar la tabla de detalle por materia
- Mostrar el avance y los estados de cada registro
*/

function ctlYesNoBadge(value) {
  return value
    ? '<span class="ctl-badge ctl-badge-ok">Sí</span>'
    : '<span class="ctl-badge ctl-badge-no">No</span>';
}

function ctlEstadoBadge(value) {
  const map = {
    completo: "ctl-badge-ok",
    pendiente: "ctl-badge-warn",
    sin_ficha: "ctl-badge-no",
    sin_acta: "ctl-badge-no"
  };

  const labelMap = {
    completo: "Completo",
    pendiente: "Pendiente",
    sin_ficha: "Sin ficha",
    sin_acta: "Sin acta"
  };

  const cls = map[value] || "ctl-badge-warn";
  const text = labelMap[value] || value || "N/D";

  return `<span class="ctl-badge ${cls}">${text}</span>`;
}

function ctlRenderCarreraSummary(rows) {
  const node = document.getElementById("ctlCarreraResumen");
  if (!node) return;

  if (!rows.length) {
    node.innerHTML = '<div class="ctl-empty">No hay información disponible.</div>';
    return;
  }

  const html = `
    <div class="ctl-table-scroll">
      <table class="ctl-table">
        <thead>
          <tr>
            <th>Carrera</th>
            <th>Materias</th>
            <th>PEA %</th>
            <th>Ficha %</th>
            <th>Acta %</th>
            <th>Completos %</th>
            <th>Avance promedio %</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr>
              <td>${row.carreraNombre}</td>
              <td>${row.totalMaterias}</td>
              <td>${row.peaPct}%</td>
              <td>${row.fichaPct}%</td>
              <td>${row.actaPct}%</td>
              <td>${row.completoPct}%</td>
              <td>${row.avancePromedio}%</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  node.innerHTML = html;
}

function ctlRenderMateriaDetail(items) {
  const node = document.getElementById("ctlDetalleCarrera");
  if (!node) return;

  if (!items.length) {
    node.innerHTML = '<div class="ctl-empty">No hay información disponible.</div>';
    return;
  }

  const html = `
    <div class="ctl-table-scroll">
      <table class="ctl-table">
        <thead>
          <tr>
            <th>Carrera</th>
            <th>Nivel</th>
            <th>Materia</th>
            <th>PEA</th>
            <th>Ficha</th>
            <th>Acta</th>
            <th>Estado</th>
            <th>Avance</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((item) => `
            <tr>
              <td>${item.carreraNombre}</td>
              <td>${item.nivelNombre}</td>
              <td>${item.materiaNombre}</td>
              <td>${ctlYesNoBadge(item.pea)}</td>
              <td>${ctlYesNoBadge(item.ficha)}</td>
              <td>${ctlYesNoBadge(item.acta)}</td>
              <td>${ctlEstadoBadge(item.estado)}</td>
              <td>${item.avance}%</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  node.innerHTML = html;
}

export {
  ctlRenderCarreraSummary,
  ctlRenderMateriaDetail
};