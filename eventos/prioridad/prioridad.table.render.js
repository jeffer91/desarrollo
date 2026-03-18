/* =========================================================
Nombre del archivo: prioridad.table.render.js
Ruta: /prioridad/prioridad.table.render.js
Función:
- Render tabla de eventos (prioridad editable + botón Editar)
========================================================= */
(function(){
  const T = window.PrioridadText;
  const D = window.PrioridadDate;

  function chipKind(kind){
    const k = (kind === "personal" || kind === "trabajo") ? kind : "—";
    const label = (k === "personal") ? "Personal" : (k === "trabajo" ? "Trabajo" : "—");
    const cls = (k === "personal") ? "kind-personal" : (k === "trabajo" ? "kind-trabajo" : "");
    return `<span class="chip ${cls}">${T.esc(label)}</span>`;
  }

  function chipPrio(p){
    const pr = Number(p || 3);
    const cls = pr>=5 ? "p5" : pr===4 ? "p4" : pr===3 ? "p3" : pr===2 ? "p2" : "p1";
    return `<span class="chip pchip ${cls}">P${T.esc(pr)}</span>`;
  }

  function prioSelect(id, value){
    const v = String(Number(value || 3));
    return `
      <select class="prioSelect" data-action="prio" data-id="${T.esc(id)}">
        <option value="5" ${v==="5"?"selected":""}>5</option>
        <option value="4" ${v==="4"?"selected":""}>4</option>
        <option value="3" ${v==="3"?"selected":""}>3</option>
        <option value="2" ${v==="2"?"selected":""}>2</option>
        <option value="1" ${v==="1"?"selected":""}>1</option>
      </select>
    `;
  }

  function renderTable(rows){
    const host = document.getElementById("tableHost");
    if (!host) return;

    if (!rows || rows.length === 0){
      host.innerHTML = `<div class="muted">No hay eventos.</div>`;
      return;
    }

    host.innerHTML = `
      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Fecha/Hora</th>
              <th>Tipo</th>
              <th>Prioridad</th>
              <th>Avisos</th>
              <th>Estado</th>
              <th style="text-align:right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r=>{
              const title = T.esc(r.title || "(sin título)");
              const date = T.esc(r.date || "");
              const time = T.esc(r.time || "");
              const when = (date || time) ? `${date} ${time}`.trim() : (r.deadline ? T.esc(D.fmtLocal(r.deadline)) : "—");
              const kind = chipKind(r.kind);
              const prChip = chipPrio(r.priority);
              const prSelect = prioSelect(r.id, r.priority);
              const alerts = (r.needsAlerts === true) ? `<span class="chip">🔔 Sí</span>` : `<span class="chip">🔕 No</span>`;
              const status = T.esc(r.status || "pendiente");
              return `
                <tr data-row-id="${T.esc(r.id)}">
                  <td><div style="font-weight:900;">${title}</div></td>
                  <td>${when || "—"}</td>
                  <td>${kind}</td>
                  <td>
                    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                      ${prChip}
                      ${prSelect}
                    </div>
                  </td>
                  <td>${alerts}</td>
                  <td><span class="chip">${status}</span></td>
                  <td>
                    <div class="tdActions">
                      <button class="btn ghost btnMini" data-action="edit" data-id="${T.esc(r.id)}">Editar</button>
                    </div>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  window.PrioridadTableRender = { renderTable };
})();
