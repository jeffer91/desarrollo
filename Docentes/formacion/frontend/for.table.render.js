/*
Nombre completo: for.table.render.js
Ruta o ubicación: formacion/frontend/for.table.render.js
Función o funciones: Renderizar la tabla principal del módulo Formación con acciones de detalle y edición, indicadores visuales de estado y contador actualizado de registros visibles
*/

function forBadgeClassByStatus(status) {
  const value = String(status ?? "").toLowerCase();

  if (value === "finalizado") return "forBadge forBadgeOk";
  if (value === "suspendido") return "forBadge forBadgeBad";
  if (value === "pendiente") return "forBadge forBadgeWarn";
  return "forBadge forBadgeInfo";
}

function forEscapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function forRenderEmptyState(tbody) {
  tbody.innerHTML = `
    <tr>
      <td colspan="10">
        <div class="forEmpty">No hay registros para mostrar.</div>
      </td>
    </tr>
  `;
}

export function forRenderTable(records, { onView, onEdit } = {}) {
  const tbody = document.getElementById("forTableBody");
  const counter = document.getElementById("forCounter");

  if (!tbody || !counter) return;

  counter.textContent = `${records.length} registro${records.length === 1 ? "" : "s"}`;

  if (!Array.isArray(records) || !records.length) {
    forRenderEmptyState(tbody);
    return;
  }

  tbody.innerHTML = records.map(record => `
    <tr data-id="${forEscapeHtml(record.id)}">
      <td>
        <strong>${forEscapeHtml(record.docente)}</strong>
        <div class="forCellSub">${forEscapeHtml(record.cargo || "Sin cargo registrado")}</div>
      </td>
      <td>${forEscapeHtml(record.cedula)}</td>
      <td>${forEscapeHtml(record.carrera)}</td>
      <td>${forEscapeHtml(record.formacion)}</td>
      <td>${forEscapeHtml(record.institucion)}</td>
      <td>${forEscapeHtml(record.modalidad)}</td>
      <td>
        <strong>${forEscapeHtml(record.avance)}%</strong>
        <div class="forCellSub">Restante: ${forEscapeHtml(record.restante)}%</div>
      </td>
      <td>
        <span class="${forBadgeClassByStatus(record.estado)}">${forEscapeHtml(record.estado)}</span>
      </td>
      <td>
        <span class="forBadge forBadgeInfo">${Number(record.anexos?.length ?? record.anexos ?? 0)}</span>
      </td>
      <td>
        <div class="forActions">
          <button class="forMiniBtn" type="button" data-action="view">Detalle</button>
          <button class="forMiniBtn" type="button" data-action="edit">Editar</button>
        </div>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("button[data-action='view']").forEach(btn => {
    btn.addEventListener("click", event => {
      const row = event.currentTarget.closest("tr");
      const id = row?.dataset?.id ?? null;
      if (id && typeof onView === "function") onView(id);
    });
  });

  tbody.querySelectorAll("button[data-action='edit']").forEach(btn => {
    btn.addEventListener("click", event => {
      const row = event.currentTarget.closest("tr");
      const id = row?.dataset?.id ?? null;
      if (id && typeof onEdit === "function") onEdit(id);
    });
  });
}