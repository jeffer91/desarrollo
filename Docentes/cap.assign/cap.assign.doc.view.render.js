/* =========================================================
Nombre del archivo: cap.assign.doc.view.render.js
Ruta - Ubicación: /cap.assign/cap.assign.doc.view.render.js
Función:
- buildDocViewModel({ docente, capsCatalog })
- renderDocViewHTML(model): HTML del modal con datos + capacitaciones
========================================================= */

function escapeHtml(s){
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildDocViewModel({ docente, capsCatalog }){
  const d = docente || {};
  const capsIds = Array.isArray(d.capacitaciones) ? d.capacitaciones.map(String) : [];

  const cat = Array.isArray(capsCatalog) ? capsCatalog : [];
  const capMap = new Map(cat.map(c => [String(c.id), String(c.nombre || c.id)]));

  const caps = capsIds.map(id => ({
    id: String(id),
    nombre: capMap.get(String(id)) || String(id)
  }));

  return {
    id: String(d.id || ""),
    nombre: String(d.nombre || ""),
    cedula: String(d.cedula || ""),
    carrera: String(d.carreraNombre || d.carreraId || ""),
    carreraId: String(d.carreraId || ""),
    carreraNombre: String(d.carreraNombre || ""),
    sexo: String(d.sexo || ""),
    celular: String(d.celular || ""),
    titulo: String(d.titulo || ""),
    updatedAt: String(d.updatedAt || ""),
    createdAt: String(d.createdAt || ""),
    capacitaciones: caps
  };
}

export function renderDocViewHTML(model){
  const m = model || {};
  const caps = Array.isArray(m.capacitaciones) ? m.capacitaciones : [];

  const chips = caps.length
    ? `<div class="docview-chips">
        ${caps.map(c => `<span class="docview-chip">${escapeHtml(c.nombre)}</span>`).join("")}
      </div>`
    : `<div class="muted">No tiene capacitaciones asignadas.</div>`;

  return `
    <div class="docview-grid">
      <div class="docview-item">
        <div class="docview-k">Nombre</div>
        <div class="docview-v">${escapeHtml(m.nombre)}</div>
      </div>

      <div class="docview-item">
        <div class="docview-k">Cédula</div>
        <div class="docview-v">${escapeHtml(m.cedula)}</div>
      </div>

      <div class="docview-item">
        <div class="docview-k">Carrera</div>
        <div class="docview-v">${escapeHtml(m.carrera)}</div>
      </div>

      <div class="docview-item">
        <div class="docview-k">Sexo</div>
        <div class="docview-v">${escapeHtml(m.sexo)}</div>
      </div>

      <div class="docview-item">
        <div class="docview-k">Celular</div>
        <div class="docview-v">${escapeHtml(m.celular)}</div>
      </div>

      <div class="docview-item">
        <div class="docview-k">Título</div>
        <div class="docview-v">${escapeHtml(m.titulo)}</div>
      </div>
    </div>

    <div class="hr"></div>

    <div class="docview-caps">
      <div class="h3">Capacitaciones</div>
      ${chips}
    </div>
  `;
}
