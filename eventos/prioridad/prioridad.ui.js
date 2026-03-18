/* =========================================================
Nombre del archivo: prioridad.ui.js
Ruta: /prioridad/prioridad.ui.js
Función:
- Render lista, render detalle (alertas y avances), mensajes y toasts
========================================================= */

(function(){
  const U = window.PrioridadUtils;

  function setPill(text){
    const el = document.getElementById("connPill");
    if (el) el.textContent = text;
  }

  function showMsg(text, kind="info"){
    const el = document.getElementById("msg");
    if (!el) return;
    el.textContent = text || "";
    el.dataset.kind = kind;
  }

  function toast(title, body){
    const host = document.getElementById("toastHost");
    if (!host) return;

    const div = document.createElement("div");
    div.className = "toast";
    div.innerHTML = `
      <div class="h">${U.esc(title)}</div>
      <div class="p">${U.esc(body)}</div>
    `;
    host.appendChild(div);

    setTimeout(() => {
      div.style.opacity = "0";
      div.style.transition = "opacity .25s ease";
      setTimeout(() => div.remove(), 260);
    }, 4200);
  }

  function badge(text, cls=""){
    return `<span class="badge ${cls}">${U.esc(text)}</span>`;
  }

  function renderList(rows, selectedId){
    const host = document.getElementById("eventsList");
    if (!host) return;

    if (!rows || rows.length === 0){
      host.innerHTML = `<div class="muted">No hay eventos aún.</div>`;
      return;
    }

    host.innerHTML = rows.map(r => {
      const title = U.esc(r.title || "(sin título)");
      const date = U.esc(r.date || "");
      const time = U.esc(r.time || "");
      const kind = U.esc(r.kind || "—");
      const pr = Number(r.priority || 3);
      const needsAlerts = (r.needsAlerts === true);
      const status = U.esc(r.status || "pendiente");

      const b = [];
      b.push(badge(`P${pr}`, "blue"));
      b.push(badge(kind === "personal" ? "Personal" : (kind === "trabajo" ? "Trabajo" : "—")));
      b.push(badge(status));
      b.push(badge(needsAlerts ? "🔔 Sí" : "🔕 No", "dim"));

      const sel = (String(r.id) === String(selectedId));
      return `
        <div class="item" data-id="${U.esc(r.id)}" style="${sel ? "outline:3px solid rgba(37,99,235,.20);" : ""}">
          <div>
            <h3>${title}</h3>
            <div class="meta">
              ${date ? `<span>📅 ${date}</span>` : ``}
              ${time ? `<span>⏰ ${time}</span>` : ``}
              ${r.place ? `<span>📍 ${U.esc(r.place)}</span>` : ``}
            </div>
          </div>
          <div class="badges">
            ${b.join("")}
            <button class="btn ghost" data-action="open">Abrir</button>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderAlerts(alerts){
    const host = document.getElementById("alertsView");
    if (!host) return;

    if (!alerts || alerts.length === 0){
      host.innerHTML = `<div class="muted small">Sin alertas.</div>`;
      return;
    }

    host.innerHTML = alerts.map((a, idx) => {
      const when = U.fmtLocal(a.at);
      const sent = a.sentAt ? `✅ enviada (${U.fmtLocal(a.sentAt)})` : `⏳ pendiente`;
      return `
        <div class="line">
          <div class="left">
            <div class="t">Alerta ${idx+1}: ${U.esc(when)}</div>
            <div class="s">${U.esc(sent)}</div>
          </div>
          <div class="badge ${a.sentAt ? "" : "blue"}">${a.sentAt ? "OK" : "PEND"}</div>
        </div>
      `;
    }).join("");
  }

  function renderProgress(progress){
    const host = document.getElementById("progressView");
    if (!host) return;

    if (!progress || progress.length === 0){
      host.innerHTML = `<div class="muted small">Sin avances todavía.</div>`;
      return;
    }

    host.innerHTML = progress
      .slice()
      .sort((x,y) => (x.at||"").localeCompare(y.at||""))
      .map(p => {
        return `
          <div class="line">
            <div class="left">
              <div class="t">${U.esc(p.text || "")}</div>
              <div class="s">${U.esc(U.fmtLocal(p.at))}</div>
            </div>
          </div>
        `;
      }).join("");
  }

  function showDetail(on){
    const hint = document.getElementById("hint");
    const form = document.getElementById("detailForm");
    if (hint) hint.style.display = on ? "none" : "block";
    if (form) form.style.display = on ? "block" : "none";
  }

  window.PrioridadUI = {
    setPill,
    showMsg,
    toast,
    renderList,
    renderAlerts,
    renderProgress,
    showDetail
  };
})();
