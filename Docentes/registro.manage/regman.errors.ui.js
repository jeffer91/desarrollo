/* =========================================================
Nombre del archivo: regman.errors.ui.js
Ruta - Ubicación: /registro.manage/regman.errors.ui.js
Función:
- UI de errores de tabla:
  - Botón "Errores" abre modal
  - Modal lista filas con error según validateDocente()
  - Contador visible en el botón (badge)
========================================================= */
function s(x){ return (x === null || x === undefined) ? "" : String(x); }
function clean(x){ return s(x).replace(/\s+/g, " ").trim(); }
function esc(x){
  return String(x ?? "")
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

export function createErrorsUI({ DOM, state, validateDocente, onPick }){
  function isOpen(){
    const m = DOM.errModal?.();
    return !!m && m.hidden === false;
  }

  function open(){
    const m = DOM.errModal?.();
    if (!m) return;
    m.hidden = false;
    render();
  }

  function close(){
    const m = DOM.errModal?.();
    if (!m) return;
    m.hidden = true;
  }

  function getErrors(){
    const rows = Array.isArray(state?.S?.docentes) ? state.S.docentes : [];
    const out = [];

    for (const d of rows){
      const v = validateDocente(d);
      if (!v.ok){
        out.push({
          cedula: clean(d?.cedula),
          nombres: clean(d?.nombres),
          apellidos: clean(d?.apellidos),
          carrera: clean(d?.carreraNombre || ""),
          sexo: clean(d?.sexo || ""),
          celular: clean(d?.celular || ""),
          titulo: clean(d?.titulo || ""),
          msg: clean(v.msg || "Error de validación")
        });
      }
    }
    return out;
  }

  function updateBadge(){
    const b = DOM.errBadge?.();
    const btn = DOM.btnErrors?.();
    if (!b || !btn) return;

    const errs = getErrors();
    const n = errs.length;

    if (n > 0){
      b.hidden = false;
      b.textContent = String(n);
    }else{
      b.hidden = true;
      b.textContent = "0";
    }

    // si modal abierto, mantener sincronizado
    if (isOpen()) render();
  }

  function render(){
    const host = DOM.errList?.();
    const count = DOM.errCount?.();
    if (!host) return;

    const errs = getErrors();
    if (count) count.textContent = String(errs.length);

    let html = `
      <table class="bulk-table">
        <thead>
          <tr>
            <th style="width:140px">Cédula</th>
            <th>Apellidos</th>
            <th>Nombres</th>
            <th style="width:220px">Carrera</th>
            <th style="width:260px">Error</th>
            <th style="width:140px">Acción</th>
          </tr>
        </thead>
        <tbody>
    `;

    for (const e of errs){
      html += `
        <tr>
          <td><b>${esc(e.cedula)}</b></td>
          <td>${esc(e.apellidos)}</td>
          <td>${esc(e.nombres)}</td>
          <td>${esc(e.carrera)}</td>
          <td title="${esc(e.msg)}">
            <span class="badTag">ERROR</span>
            <div class="muted" style="margin-top:6px">${esc(e.msg)}</div>
          </td>
          <td>
            <button class="btn ghost" type="button" data-ced="${esc(e.cedula)}">Ir</button>
          </td>
        </tr>
      `;
    }

    if (!errs.length){
      html += `<tr><td colspan="6" class="muted">Sin errores.</td></tr>`;
    }

    html += `</tbody></table>`;
    host.innerHTML = html;

    host.onclick = (ev) => {
      const t = ev.target;
      if (!t || !t.getAttribute) return;
      const ced = t.getAttribute("data-ced");
      if (!ced) return;
      if (typeof onPick === "function") onPick(String(ced));
      close();
    };
  }

  return { open, close, updateBadge, render, isOpen };
}
