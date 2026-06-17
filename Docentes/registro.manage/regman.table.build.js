/* =========================================================
Nombre del archivo: regman.table.build.js
Ruta - Ubicación: /registro.manage/regman.table.build.js
Función:
- Construir HTML de tabla (thead clicable + tbody editable)
========================================================= */
function s(x){ return (x === null || x === undefined) ? "" : String(x); }
function clean(x){ return s(x).replace(/\s+/g, " ").trim(); }
function esc(x){
  return String(x ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

function sortIndicator({ active, dir }){
  if (!active) return `<span class="sort-ind">↕</span>`;
  return dir === "asc" ? `<span class="sort-ind">↑</span>` : `<span class="sort-ind">↓</span>`;
}

function thBtn(label, key, sortKey, sortDir){
  const active = String(sortKey || "") === String(key || "");
  const dir = active ? (sortDir || "asc") : "asc";
  return `
    <button class="th-btn" type="button" data-sort="${esc(key)}" data-next="${esc(dir)}">
      <span>${esc(label)}</span>
      ${sortIndicator({ active, dir: sortDir })}
    </button>
  `;
}

export function buildRegmanTableHTML({
  rows,
  careersIndex,
  selectedCedula,
  sortKey,
  sortDir
}){
  const list = Array.isArray(rows) ? rows : [];
  const sel = clean(selectedCedula);

  let html = `
    <table>
      <thead>
        <tr>
          <th style="width:140px">${thBtn("Cédula", "cedula", sortKey, sortDir)}</th>
          <th>${thBtn("Nombres", "nombres", sortKey, sortDir)}</th>
          <th>${thBtn("Apellidos", "apellidos", sortKey, sortDir)}</th>
          <th style="width:140px">${thBtn("Sexo", "sexo", sortKey, sortDir)}</th>
          <th style="width:320px">${thBtn("Carrera", "carreraNombre", sortKey, sortDir)}</th>
          <th style="width:160px">${thBtn("Celular", "celular", sortKey, sortDir)}</th>
          <th>${thBtn("Título", "titulo", sortKey, sortDir)}</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (const d of list){
    const ced = clean(d?.cedula);
    const isSel = sel && ced && sel === ced;

    const sexo = clean(d?.sexo);
    const carreraId = clean(d?.carreraId);
    const carreraNombre = clean(d?.carreraNombre);

    // selects inline
    const sexoSel = `
      <select class="cell" data-ced="${esc(ced)}" data-field="sexo">
        <option value="" ${sexo===""?"selected":""}>—</option>
        <option value="F" ${sexo==="F"?"selected":""}>Mujer</option>
        <option value="M" ${sexo==="M"?"selected":""}>Hombre</option>
      </select>
    `;

    let carreraOptions = `<option value="">—</option>`;
    if (careersIndex){
      const pairs = Object.entries(careersIndex)
        .map(([id, name]) => ({ id: String(id), name: String(name||"") }))
        .filter(x => x.id && x.name)
        .sort((a,b) => a.name.localeCompare(b.name, "es"));

      for (const c of pairs){
        carreraOptions += `<option value="${esc(c.id)}" ${c.id===carreraId?"selected":""}>${esc(c.name)}</option>`;
      }
    }else if (carreraId){
      carreraOptions += `<option value="${esc(carreraId)}" selected>${esc(carreraNombre || carreraId)}</option>`;
    }

    const carreraSel = `
      <select class="cell" data-ced="${esc(ced)}" data-field="carreraId">
        ${carreraOptions}
      </select>
    `;

    html += `
      <tr data-ced="${esc(ced)}" data-sel="${isSel ? "1" : "0"}">
        <td><b>${esc(ced)}</b></td>
        <td><input class="cell" data-ced="${esc(ced)}" data-field="nombres" value="${esc(clean(d?.nombres))}" /></td>
        <td><input class="cell" data-ced="${esc(ced)}" data-field="apellidos" value="${esc(clean(d?.apellidos))}" /></td>
        <td>${sexoSel}</td>
        <td>${carreraSel}</td>
        <td><input class="cell" data-ced="${esc(ced)}" data-field="celular" value="${esc(clean(d?.celular))}" /></td>
        <td><input class="cell" data-ced="${esc(ced)}" data-field="titulo" value="${esc(clean(d?.titulo))}" /></td>
      </tr>
    `;
  }

  if (!list.length){
    html += `<tr><td colspan="7" class="muted">Sin datos.</td></tr>`;
  }

  html += `</tbody></table>`;
  return html;
}
