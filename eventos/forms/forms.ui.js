/* =========================================================
Nombre del archivo: forms.ui.js
Ruta: /forms.ui.js
Función o funciones:
- Renderiza lista de registros
- Muestra mensajes y estado
- Actualiza UI según tipo de registro
- Carga opciones de familias
========================================================= */
(function(){
  const { esc } = window.FormsUtils;

  function setPill(text){
    const el = document.getElementById("connPill");
    if (el) el.textContent = text;
  }

  function showMsg(text, kind = "info"){
    const el = document.getElementById("formMsg");
    if (!el) return;
    el.textContent = text || "";
    el.dataset.kind = kind;
  }

  function fillFamilySelect(rows, selectedValue){
    const select = document.getElementById("familyId");
    if (!select) return;

    const wanted = String(
      selectedValue != null
        ? selectedValue
        : (select.value || "")
    );

    const list = Array.isArray(rows) ? rows : [];
    const html = [
      `<option value="">Sin familia</option>`,
      ...list.map(row => {
        const id = String(row.id || "");
        const label = String(row.label || id || "Sin nombre");
        const sel = id === wanted ? ` selected` : ``;
        return `<option value="${esc(id)}"${sel}>${esc(label)}</option>`;
      })
    ];

    select.innerHTML = html.join("");

    if (wanted && !list.some(x => String(x.id || "") === wanted)){
      const opt = document.createElement("option");
      opt.value = wanted;
      opt.textContent = wanted;
      opt.selected = true;
      select.appendChild(opt);
    }
  }

  function syncTypeUi(type){
    const normalized = String(type || "").toLowerCase() === "pending" ? "pending" : "event";

    const formTitle = document.getElementById("formTitle");
    const date = document.getElementById("date");
    const time = document.getElementById("time");
    const place = document.getElementById("place");

    const dateLabel = document.getElementById("dateLabelText");
    const dateHint = document.getElementById("dateHint");

    const fieldTime = document.getElementById("fieldTime");
    const fieldPlace = document.getElementById("fieldPlace");

    if (formTitle){
      formTitle.textContent = normalized === "pending" ? "Nuevo pendiente" : "Nuevo evento";
    }

    if (dateLabel){
      dateLabel.textContent = normalized === "pending" ? "Fecha límite" : "Fecha";
    }

    if (dateHint){
      dateHint.textContent = normalized === "pending"
        ? "Opcional. Úsala si el pendiente tiene vencimiento."
        : "Obligatoria para eventos.";
    }

    if (date){
      date.required = normalized === "event";
    }

    if (fieldTime){
      fieldTime.classList.toggle("isHidden", normalized === "pending");
    }

    if (fieldPlace){
      fieldPlace.classList.toggle("isHidden", normalized === "pending");
    }

    if (normalized === "pending"){
      if (time) time.value = "";
      if (place) place.value = "";
    }
  }

  function badge(text, cls){
    return `<span class="badge ${cls || ""}">${esc(text || "")}</span>`;
  }

  function inferType(row){
    const raw = String(row.type || "").toLowerCase().trim();
    if (raw === "pending" || raw === "pendiente") return "pending";
    if (raw === "event" || raw === "evento") return "event";

    const hasDate = String(row.date || "").trim();
    const hasTime = String(row.time || "").trim();
    const hasPlace = String(row.place || "").trim();

    return (hasDate || hasTime || hasPlace) ? "event" : "pending";
  }

  function renderList(rows){
    const host = document.getElementById("eventsList");
    if (!host) return;

    if (!rows || rows.length === 0){
      host.innerHTML = `<div class="muted">No hay registros aún.</div>`;
      return;
    }

    host.innerHTML = rows.map(r => {
      const type = inferType(r);
      const typeLabel = type === "pending" ? "Pendiente" : "Evento";

      const title = esc(r.title || "Sin título");
      const date = esc(r.date || "");
      const time = esc(r.time || "");
      const place = esc(r.place || "");
      const responsible = esc(r.responsible || "");
      const family = esc(r.familyLabel || r.familyName || r.familyId || "");
      const desc = esc(r.desc || "");

      const statusValue = String(
        r.status ||
        (type === "pending" ? "pendiente" : "programado")
      ).trim();

      const statusLabel = statusValue
        .replaceAll("_", " ")
        .replace(/\b\w/g, c => c.toUpperCase());

      const meta = [
        date ? `<span>Fecha: ${date}</span>` : ``,
        time ? `<span>Hora: ${time}</span>` : ``,
        place ? `<span>Lugar: ${place}</span>` : ``,
        responsible ? `<span>Responsable: ${responsible}</span>` : ``,
        family ? `<span>Familia: ${family}</span>` : ``
      ].filter(Boolean).join("");

      return `
        <div class="item" data-id="${esc(r.id)}">
          <div class="itemHead">
            <div>
              <h3 class="itemTitle">${title}</h3>
              <div class="itemSub">${typeLabel}</div>
            </div>

            <div class="badges">
              ${badge(typeLabel, type)}
              ${badge(statusLabel, "status")}
            </div>
          </div>

          ${meta ? `<div class="meta">${meta}</div>` : ``}
          ${desc ? `<p class="itemDesc">${desc}</p>` : ``}

          <div class="actions" style="margin-top:10px;">
            <button class="btn ghost" data-action="del">Eliminar</button>
          </div>
        </div>
      `;
    }).join("");
  }

  window.FormsUI = {
    setPill,
    showMsg,
    renderList,
    fillFamilySelect,
    syncTypeUi
  };
})();