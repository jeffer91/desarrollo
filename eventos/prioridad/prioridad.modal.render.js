/* =========================================================
Nombre del archivo: prioridad.modal.render.js
Ruta: /prioridad/prioridad.modal.render.js
Función:
- build(html) del modal con detalle (tipo, prioridad 3 niveles, estado, fechas, alertas, avances)
- Estado "subido" solo si allowElevated === true
- Incluye control para activar/desactivar allowElevated
- Anti-crash: fallbacks si faltan utils
========================================================= */

(function(){
  const T = window.PrioridadText || {
    esc: (s)=> (s===null||s===undefined) ? "" : String(s)
      .replace(/&/g,"&amp;")
      .replace(/</g,"&lt;")
      .replace(/>/g,"&gt;")
      .replace(/"/g,"&quot;")
      .replace(/'/g,"&#39;")
  };

  const D = window.PrioridadDate || {
    toDate: (x)=> new Date(x),
    toLocalInputValue: (d)=>{
      try{
        const pad = (n)=> String(n).padStart(2,"0");
        const yyyy = d.getFullYear();
        const mm = pad(d.getMonth()+1);
        const dd = pad(d.getDate());
        const hh = pad(d.getHours());
        const mi = pad(d.getMinutes());
        return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
      }catch(_){ return ""; }
    },
    fmtLocal: (iso)=>{
      try{ return new Date(iso).toLocaleString(); }
      catch(_){ return String(iso||""); }
    }
  };

  const STATUS = (window.PrioridadBoardRender && window.PrioridadBoardRender.STATUS) || {
    PEND:"pendiente",
    PROG:"en_progreso",
    UP:"subido",
    DONE:"finalizado"
  };

  function opt(v, cur, label){
    return `<option value="${T.esc(v)}" ${String(v)===String(cur) ? "selected" : ""}>${T.esc(label)}</option>`;
  }

  function normalizePriorityLevel(item){
    const pl = String(item?.priorityLevel || "").toLowerCase().trim();
    if (pl === "alta" || pl === "media" || pl === "baja") return pl;
    const p = Number(item?.priority ?? 3);
    if (p >= 4) return "alta";
    if (p === 3) return "media";
    return "baja";
  }

  function build(item){
    const id = T.esc(item.id);
    const title = T.esc(item.title || "(sin título)");

    const kind = item.kind || "trabajo";
    const statusRaw = String(item.status || STATUS.PEND);
    const status = (statusRaw === "hecho" || statusRaw === "terminado") ? STATUS.DONE : statusRaw;

    const allowElevated = (item.allowElevated === true);

    const prLevel = normalizePriorityLevel(item); // alta|media|baja

    const startAt = item.startAt ? D.toLocalInputValue(D.toDate(item.startAt)) : "";
    const deadline = item.deadline ? D.toLocalInputValue(D.toDate(item.deadline)) : "";

    const needsAlerts = (item.needsAlerts === false) ? "false" : "true";

    const alerts = Array.isArray(item.alerts) ? item.alerts : [];
    const progress = Array.isArray(item.progress) ? item.progress : [];

    // Opciones de estado: subido solo si allowElevated
    const statusOptions = [
      opt(STATUS.PEND, status, "Pendiente"),
      opt(STATUS.PROG, status, "En progreso"),
      ...(allowElevated ? [opt(STATUS.UP, status, "Subido")] : []),
      opt(STATUS.DONE, status, "Finalizado")
    ].join("");

    return `
      <div class="modalHead">
        <div>
          <div class="modalTitle">Editar evento</div>
          <div class="modalSub">${title} · ID: ${id}</div>
        </div>
        <button class="btn ghost btnMini" data-action="closeModal" type="button">Cerrar</button>
      </div>

      <div class="modalBody">
        <div class="block">
          <div class="blockTitle">Datos principales</div>

          <div class="row3">
            <label class="lbl">
              Tipo
              <select id="mKind">
                ${opt("trabajo", kind, "Trabajo")}
                ${opt("personal", kind, "Personal")}
              </select>
            </label>

            <label class="lbl">
              Prioridad (3 niveles)
              <select id="mPriorityLevel">
                ${opt("alta", prLevel, "Alta (rojo)")}
                ${opt("media", prLevel, "Media (amarillo)")}
                ${opt("baja", prLevel, "Baja (verde)")}
              </select>
            </label>

            <label class="lbl">
              Estado
              <select id="mStatus">
                ${statusOptions}
              </select>
            </label>
          </div>

          <div class="row2" style="margin-top:6px;">
            <label class="lbl">
              Inicio (desde el día que pongo)
              <input id="mStartAt" type="datetime-local" value="${T.esc(startAt)}" />
            </label>
            <label class="lbl">
              Fecha/Hora del evento (actividad)
              <input id="mDeadline" type="datetime-local" value="${T.esc(deadline)}" />
            </label>
          </div>

          <div class="row2" style="margin-top:6px;">
            <label class="lbl">
              ¿Necesita avisos?
              <select id="mNeedsAlerts">
                ${opt("true", needsAlerts, "Sí")}
                ${opt("false", needsAlerts, "No")}
              </select>
            </label>

            <label class="lbl">
              ¿Permite estado “Subido”?
              <select id="mAllowElevated">
                ${opt("false", allowElevated ? "true" : "false", "No")}
                ${opt("true", allowElevated ? "true" : "false", "Sí")}
              </select>
            </label>
          </div>

          <div class="row2" style="margin-top:6px;">
            <div style="display:flex; gap:10px; align-items:end; justify-content:flex-end;">
              <button class="btn ghost btnMini" data-action="regenAlerts" data-id="${id}" type="button">
                Regenerar 3 alertas
              </button>
            </div>
            <div></div>
          </div>
        </div>

        <div class="block">
          <div class="blockTitle">Alertas y avances</div>

          <div class="lbl">Alertas (3 por defecto · laborables)</div>
          <div class="listMini" id="mAlerts">
            ${
              alerts.length
                ? alerts.map((a, i)=>{
                    const when = T.esc(D.fmtLocal(a.at));
                    const sent = a.sentAt ? "✅ enviada" : "⏳ pendiente";
                    return `
                      <div class="itemMini">
                        <div>
                          <div class="t">Alerta ${i+1}: ${when}</div>
                          <div class="s">${T.esc(sent)}</div>
                        </div>
                      </div>
                    `;
                  }).join("")
                : `<div class="muted">Sin alertas.</div>`
            }
          </div>

          <div class="lbl" style="margin-top:10px;">Avances</div>
          <div class="row2">
            <input id="mProgText" type="text" placeholder="Escribe un avance..." />
            <button class="btn btnMini" data-action="addProgress" data-id="${id}" type="button">Agregar</button>
          </div>

          <div class="listMini" id="mProgress" style="margin-top:10px;">
            ${
              progress.length
                ? progress.slice().sort((x,y)=>(x.at||"").localeCompare(y.at||""))
                    .map(p=>{
                      return `
                        <div class="itemMini">
                          <div>
                            <div class="t">${T.esc(p.text || "")}</div>
                            <div class="s">${T.esc(D.fmtLocal(p.at))}</div>
                          </div>
                        </div>
                      `;
                    }).join("")
                : `<div class="muted">Sin avances.</div>`
            }
          </div>
        </div>
      </div>

      <div class="modalFoot">
        <button class="btn ghost btnMini" data-action="closeModal" type="button">Cancelar</button>
        <button class="btn btnMini" data-action="saveModal" data-id="${id}" type="button">Guardar</button>
      </div>
    `;
  }

  window.PrioridadModalRender = { build };
})();
