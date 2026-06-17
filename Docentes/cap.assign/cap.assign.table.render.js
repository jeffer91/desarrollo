/* =========================================================
Nombre del archivo: cap.assign.table.render.js
Ruta - Ubicación: /cap.assign/cap.assign.table.render.js
Función o funciones:
- renderDocTable(state, rows)
========================================================= */

import { $ } from "./cap.assign.dom.js";

export function renderDocTable(state, rows){
  const host = $("docTableHost");
  if (!host) return;

  host.innerHTML = `
  <table>
    <thead>
      <tr>
        <th></th>
        <th>Docente</th>
        <th>Carrera</th>
        <th>Cédula</th>
        <th>Estado</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      ${(rows || []).map(r => rowHTML(state, r)).join("")}
    </tbody>
  </table>
  `;
}

function rowHTML(state, r){
  const caps = r.capacitaciones || [];
  const inCap = state && state.S && state.S.capSelectedId
    ? caps.includes(state.S.capSelectedId)
    : false;

  // se agrega la carrera en tabla
  const carreraTxt = (r.carreraNombre || r.carreraId || "");

  return `
  <tr data-id="${r.id}">
    <td><input type="checkbox" data-sel="${r.id}"></td>
    <td>${r.nombre || ""}</td>
    <td>${carreraTxt}</td>
    <td>${r.cedula || ""}</td>
    <td><span class="pill ${inCap ? "in" : "out"}">${inCap ? "EN" : "FUERA"}</span></td>
    <td>
      <div class="row-actions">
        <button data-act="view" data-id="${r.id}" class="btn ghost">Ver</button>
        <button data-act="add" data-id="${r.id}" class="btn ghost">+</button>
        <button data-act="del" data-id="${r.id}" class="btn ghost danger">−</button>
      </div>
    </td>
  </tr>
  `;
}
