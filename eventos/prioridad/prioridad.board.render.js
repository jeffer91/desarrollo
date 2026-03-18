/* =========================================================
Nombre del archivo: prioridad.board.render.js
Ruta: /prioridad/prioridad.board.render.js
Función:
- Renderiza tablero Kanban
- Tarjetas con prioridad
- Selección múltiple
- ✅ Familias como contenedores dentro de cada columna
CORRECCIÓN UI (compacto/legible):
- La tarjeta ya NO pone acciones al lado del título (evita texto cortado).
- Título con clamp (2 líneas) y acciones en “footer”.
- Meta (fecha + badges) en una sola fila compacta.
========================================================= */
(function(){
  const T = window.PrioridadText || { esc: (s)=> String(s ?? "") };
  const D = window.PrioridadDate || { fmtLocal: (iso)=> String(iso ?? "") };
  const S = window.PrioridadState;

  const STATUS = {
    PEND: "pendiente",
    PROG: "en_progreso",
    UP:   "subido",
    DONE: "finalizado"
  };

  function normalizeStatus(item){
    const s = String(item?.status || STATUS.PEND);
    if (s === "terminado") return STATUS.DONE;
    if (s === "hecho") return STATUS.DONE;
    if (s === STATUS.PEND || s === STATUS.PROG || s === STATUS.UP || s === STATUS.DONE) return s;
    return STATUS.PEND;
  }

  function normalizePriorityLevel(item){
    const pl = String(item?.priorityLevel || "").toLowerCase().trim();
    if (pl === "alta" || pl === "media" || pl === "baja") return pl;

    const p = Number(item?.priority ?? 3);
    if (p >= 4) return "alta";
    if (p === 3) return "media";
    return "baja";
  }

  function prioStripClass(pl){
    if (pl === "alta") return "prio-high";
    if (pl === "media") return "prio-med";
    return "prio-low";
  }

  function prioCardClass(pl){
    if (pl === "alta") return "prio-alta";
    if (pl === "media") return "prio-media";
    return "prio-baja";
  }

  function badgeKind(kind){
    const k = (kind === "personal" || kind === "trabajo") ? kind : "";
    if (!k) return "";
    const label = (k === "personal") ? "Personal" : "Trabajo";
    const cls = (k === "personal") ? "kind-personal" : "kind-trabajo";
    return `<span class="badge ${cls}">${T.esc(label)}</span>`;
  }

  function badgeAlerts(item){
    const needs = item?.needsAlerts === true;
    const has = Array.isArray(item?.alerts) && item.alerts.length > 0;
    if (!needs && !has) return "";
    return `<span class="badge alerts">Alertas</span>`;
  }

  function whenText(item){
    if (item?.deadline) return T.esc(D.fmtLocal(item.deadline));
    const date = String(item?.date || "").trim();
    const time = String(item?.time || "").trim();
    if (date || time) return T.esc(`${date} ${time}`.trim());
    return "—";
  }

  function prioSelectHTML(id, pl){
    const sel = (v)=> (pl === v ? "selected" : "");
    return `
      <select class="prioSelect"
              aria-label="Prioridad"
              data-action="setPriority"
              data-id="${id}">
        <option value="alta" ${sel("alta")}>Alta</option>
        <option value="media" ${sel("media")}>Media</option>
        <option value="baja" ${sel("baja")}>Baja</option>
      </select>
    `;
  }

  function isChecked(id){
    try{
      if (S && typeof S.isSelectedId === "function") return S.isSelectedId(id) === true;
    }catch(_){}
    return false;
  }

  function selectionHTML(id){
    const checked = isChecked(id) ? "checked" : "";
    return `
      <input class="selBox"
             type="checkbox"
             aria-label="Seleccionar"
             data-action="select"
             data-id="${id}"
             ${checked} />
    `;
  }

  // =========================================================
  // Tarjeta evento (compacta / legible)
  // =========================================================
  function cardHTML(item){
    const id = T.esc(item.id);
    const title = T.esc(item.title || "(sin título)");
    const allowUp = item?.allowElevated === true;

    const kind = badgeKind(item.kind);
    const alerts = badgeAlerts(item);

    const pl = normalizePriorityLevel(item);
    const stripCls = prioStripClass(pl);
    const cardCls = prioCardClass(pl);

    const locked = (normalizeStatus(item) === STATUS.UP && !allowUp);

    return `
      <div class="cardEvt ${cardCls} ${locked ? "locked" : ""}"
           draggable="${locked ? "false" : "true"}"
           data-card="1"
           data-id="${id}"
           data-allow-up="${allowUp ? "1" : "0"}">

        <div class="prioStrip ${stripCls}"></div>

        <!-- Header: SOLO título (evita que se rompa por acciones) -->
        <div class="cardHeader">
          <div class="cardTitle" title="${title}">${title}</div>
        </div>

        <!-- Meta compacta en una fila -->
        <div class="cardMetaRow">
          <span class="cardWhen">${whenText(item)}</span>
          <span class="cardBadges">
            ${kind}
            ${alerts}
            ${allowUp ? `<span class="badge">Subido: Sí</span>` : ``}
          </span>
        </div>

        <!-- Footer: acciones (checkbox + X + prioridad + ver) -->
        <div class="cardFooter">
          <div class="cardFooterLeft">
            ${selectionHTML(id)}
            <button class="btn ghost btnX"
                    type="button"
                    aria-label="Eliminar evento"
                    title="Eliminar"
                    data-action="delete"
                    data-id="${id}">×</button>
          </div>

          <div class="cardFooterRight">
            ${prioSelectHTML(id, pl)}
            <button class="btn ghost btnCard"
                    type="button"
                    data-action="edit"
                    data-id="${id}">Ver</button>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================
  // Familias
  // =========================================================
  function familyLabelById(id){
    try{
      if (S && typeof S.getFamilyById === "function"){
        const f = S.getFamilyById(id);
        if (f && f.label) return String(f.label);
      }
    }catch(_){}
    return "Familia";
  }

  function isFamilyCollapsed(id){
    try{
      if (S && typeof S.isFamilyCollapsed === "function") return S.isFamilyCollapsed(id) === true;
    }catch(_){}
    return false;
  }

  function familyBlockHTML(familyId, events){
    const fid = String(familyId || "");
    const label = T.esc(familyLabelById(fid));
    const count = Array.isArray(events) ? events.length : 0;

    const collapsed = isFamilyCollapsed(fid);
    const cls = collapsed ? "familyBlock collapsed" : "familyBlock";

    // Compacto: texto tipo “chevron”
    const toggleLabel = collapsed ? "▸" : "▾";

    return `
      <div class="${cls}"
           data-family="1"
           data-family-drop="1"
           data-family-id="${T.esc(fid)}">

        <div class="familyHead">
          <div class="familyTitle">
            <span class="familyName" title="${label}">${label}</span>
            <span class="familyCount">${count}</span>
          </div>

          <div class="familyActions">
            <button class="btn ghost btnMini btnFamilyToggle"
                    type="button"
                    aria-label="${collapsed ? "Expandir" : "Colapsar"}"
                    title="${collapsed ? "Expandir" : "Colapsar"}"
                    data-action="toggleFamily"
                    data-id="${T.esc(fid)}">${toggleLabel}</button>
          </div>
        </div>

        <div class="familyBody" ${collapsed ? 'style="display:none;"' : ""}>
          ${events.map(cardHTML).join("")}
          <div class="familyDropHint muted">Arrastra aquí para asignar a esta familia</div>
        </div>
      </div>
    `;
  }

  function noFamilyBlockHTML(events){
    const count = Array.isArray(events) ? events.length : 0;
    return `
      <div class="familyBlock noFamily" data-family="1" data-family-id="">
        <div class="familyHead">
          <div class="familyTitle">
            <span class="familyName">Sin familia</span>
            <span class="familyCount">${count}</span>
          </div>
          <div class="familyActions"></div>
        </div>
        <div class="familyBody">
          ${events.map(cardHTML).join("")}
        </div>
      </div>
    `;
  }

  function groupByFamily(items){
    const groups = {};
    const none = [];

    for (const it of (items || [])){
      const fid = String(it?.familyId || "").trim();
      if (!fid) none.push(it);
      else{
        if (!groups[fid]) groups[fid] = [];
        groups[fid].push(it);
      }
    }

    return { groups, none };
  }

  function buildColumn(key, title, items, extraHTML){
    const g = groupByFamily(items);
    const ids = Object.keys(g.groups);

    // Orden por label
    ids.sort((a,b)=>{
      const la = String(familyLabelById(a) || "").toLowerCase();
      const lb = String(familyLabelById(b) || "").toLowerCase();
      if (la < lb) return -1;
      if (la > lb) return 1;
      return 0;
    });

    const blocks = [];
    for (const fid of ids){
      blocks.push(familyBlockHTML(fid, g.groups[fid]));
    }
    if (g.none.length) blocks.push(noFamilyBlockHTML(g.none));

    return `
      <div class="col" data-col="${T.esc(key)}">
        <div class="colHead">
          <div class="colTitle">${T.esc(title)}</div>
          <div class="colCount">${items.length}</div>
        </div>
        ${extraHTML || ""}
        <div class="dropzone" data-dropzone="${T.esc(key)}">
          ${blocks.join("")}
        </div>
      </div>
    `;
  }

  // =========================================================
  // Topbar
  // =========================================================
  function familyPickHTML(){
    let fams = [];
    try{
      if (S && typeof S.getFamilies === "function") fams = S.getFamilies();
    }catch(_){ fams = []; }

    const opts = (fams || []).map(f => {
      const id = T.esc(f.id);
      const label = T.esc(f.label || "Familia");
      return `<option value="${id}">${label}</option>`;
    }).join("");

    return `
      <select class="familyPick" data-action="familyPick" aria-label="Familia">
        <option value="">Elegir familia</option>
        ${opts}
      </select>
    `;
  }

  function topBarHTML(){
    let count = 0;
    try{
      if (S && typeof S.selectedCount === "function") count = S.selectedCount();
    }catch(_){ count = 0; }

    const hasApi = !!(S && typeof S.selectedCount === "function");

    return `
      <div class="boardTop">
        <div class="boardTopLeft">
          <label class="selAll">
            <input type="checkbox" data-action="selectAll" ${(!hasApi ? "disabled" : "")} />
            <span>Seleccionar todo</span>
          </label>

          <span class="selCount">Seleccionados: <b>${count}</b></span>

          <div class="familyTools">
            ${familyPickHTML()}
            <button class="btn ghost btnMini"
                    type="button"
                    data-action="assignFamily"
                    ${(!hasApi || count===0) ? "disabled" : ""}>Asignar</button>

            <button class="btn ghost btnMini"
                    type="button"
                    data-action="removeFamily"
                    ${(!hasApi || count===0) ? "disabled" : ""}>Quitar</button>
          </div>
        </div>

        <div class="boardTopRight">
          <button class="btn ghost btnMini"
                  type="button"
                  data-action="clearSelection"
                  ${(!hasApi || count===0) ? "disabled" : ""}>Limpiar</button>

          <button class="btn btnMini"
                  type="button"
                  data-action="deleteSelected"
                  ${(!hasApi || count===0) ? "disabled" : ""}>Eliminar seleccionados</button>
        </div>
      </div>
    `;
  }

  function renderBoard(rows){
    const host = document.getElementById("boardHost");
    if (!host) return;

    const list = Array.isArray(rows) ? rows : [];

    const pend = [];
    const prog = [];
    const up   = [];
    const done = [];

    for (const r of list){
      const s = normalizeStatus(r);
      if (s === STATUS.PEND) pend.push(r);
      else if (s === STATUS.PROG) prog.push(r);
      else if (s === STATUS.UP) up.push(r);
      else done.push(r);
    }

    const hintUp = `
      <div class="lockedHint">
        “Subido” solo aplica a eventos con <b>Subido: Sí</b>.
        Si intentas arrastrar uno que no lo permite, se bloqueará el movimiento.
      </div>
    `;

    host.innerHTML = `
      ${topBarHTML()}
      <div class="board">
        ${buildColumn(STATUS.PEND, "PENDIENTE", pend)}
        ${buildColumn(STATUS.PROG, "EN PROGRESO", prog)}
        ${buildColumn(STATUS.UP, "SUBIDO", up, hintUp)}
        ${buildColumn(STATUS.DONE, "FINALIZADO", done)}
      </div>
    `;
  }

  window.PrioridadBoardRender = {
    renderBoard,
    STATUS,
    normalizeStatus,
    normalizePriorityLevel
  };
})();