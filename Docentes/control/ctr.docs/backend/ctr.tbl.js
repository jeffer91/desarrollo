/* =========================================================
Nombre del archivo: ctr.tbl.js
Ruta - Ubicación: /control/ctr.docs/backend/ctr.tbl.js
Función o funciones:
- renderTable(hostEl, docentes[], capId, pendingMap, getBaseChecklistFn, sortState)
- bindTableChanges(hostEl, onChange(payload))
  payload:
  - { type:"checkbox", docenteId, key, checked }
  - { type:"text", docenteId, key, value }
  - { type:"action", docenteId, action }
  - { type:"sort", key }
  - { type:"status", docenteId, key, value }
========================================================= */
import { escapeHtml } from "./ctr.util.js";

function asText(v){
  return String(v == null ? "" : v).trim();
}

function normalizeToken(value){
  return asText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, "_");
}

function normalizeDocStatus(value, fallback, allowBlocked){
  // Comentario técnico:
  // la tabla debe aceptar datos antiguos booleanos y nuevos estados.
  // Así el render no se rompe mientras existan registros mixtos.
  if (typeof value === "boolean"){
    return value ? "TIENE" : fallback;
  }

  const token = normalizeToken(value);
  if (!token) return fallback;

  if (token === "✅" || token === "TIENE" || token === "SI" || token === "TRUE"){
    return "TIENE";
  }

  if (token === "⏳" || token === "PENDIENTE"){
    return "PENDIENTE";
  }

  if (token === "⛔" || token === "NO_APLICA"){
    return "NO_APLICA";
  }

  if (allowBlocked && (token === "🔒" || token === "BLOQUEADO" || token === "NO_HABILITADO")){
    return "BLOQUEADO";
  }

  return fallback;
}

function normalizeDocenteStatus(value){
  // Comentario técnico:
  // estadoDocente se renderiza como código estable y se muestra con emoji.
  // Esto permite guardar texto consistente y mantener la tabla compacta.
  const token = normalizeToken(value);
  if (!token) return "ACTIVO";

  if (token === "🟢" || token === "ACTIVO"){
    return "ACTIVO";
  }

  if (token === "🚪" || token === "SALIO" || token === "SALIDA" || token === "YA_SALIO" || token === "INACTIVO"){
    return "SALIO";
  }

  if (token === "📝" || token === "RENUNCIO" || token === "RENUNCIA"){
    return "RENUNCIO";
  }

  return "ACTIVO";
}

function getDocStatusMeta(code){
  const key = normalizeDocStatus(code, "PENDIENTE", true);

  if (key === "TIENE"){
    return { value: "TIENE", emoji: "✅", label: "Tiene" };
  }

  if (key === "NO_APLICA"){
    return { value: "NO_APLICA", emoji: "⛔", label: "No aplica" };
  }

  if (key === "BLOQUEADO"){
    return { value: "BLOQUEADO", emoji: "🔒", label: "Bloqueado" };
  }

  return { value: "PENDIENTE", emoji: "⏳", label: "Pendiente" };
}

function getDocenteStatusMeta(code){
  const key = normalizeDocenteStatus(code);

  if (key === "SALIO"){
    return { value: "SALIO", emoji: "🚪", label: "Salió" };
  }

  if (key === "RENUNCIO"){
    return { value: "RENUNCIO", emoji: "📝", label: "Renunció" };
  }

  return { value: "ACTIVO", emoji: "🟢", label: "Activo" };
}

function sortMark(sortState, key){
  const field = String(sortState && sortState.field || "");
  const dir = String(sortState && sortState.dir || "asc");

  if (field !== key) return "↕";
  return dir === "desc" ? "▼" : "▲";
}

function sortClass(sortState, key){
  return String(sortState && sortState.field || "") === key ? "th-sort active" : "th-sort";
}

function sortAria(sortState, key){
  const field = String(sortState && sortState.field || "");
  const dir = String(sortState && sortState.dir || "asc");

  if (field !== key) return "none";
  return dir === "desc" ? "descending" : "ascending";
}

function renderStatusSelect(docenteId, key, value, options, extraAttrs){
  const current = String(value || "");
  const currentMeta = options.find((o) => o.value === current) || options[0];
  const attrs = asText(extraAttrs);
  const optionsHtml = options.map((o) => {
    return `
      <option value="${escapeHtml(o.value)}" ${o.value === current ? "selected" : ""}>
        ${escapeHtml(o.emoji)}
      </option>
    `;
  }).join("");

  return `
    <select
      class="in tbl-status"
      data-doc="${escapeHtml(docenteId)}"
      data-key="${escapeHtml(key)}"
      title="${escapeHtml(currentMeta.label)}"
      aria-label="${escapeHtml(key)}: ${escapeHtml(currentMeta.label)}"
      ${attrs}
    >
      ${optionsHtml}
    </select>
  `;
}

function renderStatusView(emoji, label, extraClass, title){
  return `
    <span
      class="tbl-status-view ${escapeHtml(extraClass || "")}"
      title="${escapeHtml(title || label)}"
      aria-label="${escapeHtml(label)}"
    >
      ${escapeHtml(emoji)}
    </span>
  `;
}

export function renderTable(host, docentes, capId, pending, getBaseChecklist, sortState){
  if (!host) return;

  const hint = document.getElementById("ctrHint");
  const list = Array.isArray(docentes) ? docentes : [];
  const hasCap = !!String(capId || "").trim();

  if (hint){
    if (!hasCap && !list.length){
      hint.style.display = "block";
      hint.textContent = "Selecciona un periodo y/o una capacitación para listar docentes.";
    } else if (!hasCap && list.length){
      hint.style.display = "block";
      hint.textContent = "Mostrando docentes del periodo. Puedes corregir nombres y apellidos aquí; para editar acuerdo de patrocinio, selecciona una capacitación.";
    } else {
      hint.style.display = "block";
      hint.textContent = "Puedes corregir nombres, apellidos y estados directamente en la tabla. Haz clic en un encabezado para ordenar.";
    }
  }

  if (!list.length){
    host.innerHTML = "";
    return;
  }

  const pend = pending instanceof Map ? pending : new Map();

  const rowsHtml = list.map((d, idx) => {
    const base = (typeof getBaseChecklist === "function")
      ? getBaseChecklist(d, capId)
      : {
          estadoDocente: "ACTIVO",
          planIndividual: "PENDIENTE",
          acuerdoPatrocinio: "PENDIENTE",
          reporteResultados: "PENDIENTE"
        };

    const over = pend.get(d.id) || null;
    const merged = over ? { ...base, ...over } : base;

    const v = {
      estadoDocente: normalizeDocenteStatus(merged.estadoDocente),
      planIndividual: normalizeDocStatus(merged.planIndividual, "PENDIENTE", false),
      acuerdoPatrocinio: normalizeDocStatus(merged.acuerdoPatrocinio, "PENDIENTE", true),
      reporteResultados: normalizeDocStatus(merged.reporteResultados, "PENDIENTE", true)
    };

    const nombres = asText(over && over.nombres != null ? over.nombres : d.nombres);
    const apellidos = asText(over && over.apellidos != null ? over.apellidos : d.apellidos);

    const docenteOptions = [
      { value: "ACTIVO", emoji: "🟢", label: "Activo" },
      { value: "SALIO", emoji: "🚪", label: "Salió" },
      { value: "RENUNCIO", emoji: "📝", label: "Renunció" }
    ];

    const planOptions = [
      { value: "TIENE", emoji: "✅", label: "Tiene" },
      { value: "PENDIENTE", emoji: "⏳", label: "Pendiente" },
      { value: "NO_APLICA", emoji: "⛔", label: "No aplica" }
    ];

    const acuerdoOptions = [
      { value: "TIENE", emoji: "✅", label: "Tiene" },
      { value: "PENDIENTE", emoji: "⏳", label: "Pendiente" },
      { value: "NO_APLICA", emoji: "⛔", label: "No aplica" },
      { value: "BLOQUEADO", emoji: "🔒", label: "Bloqueado" }
    ];

    const reporteOptions = [
      { value: "TIENE", emoji: "✅", label: "Tiene" },
      { value: "PENDIENTE", emoji: "⏳", label: "Pendiente" },
      { value: "NO_APLICA", emoji: "⛔", label: "No aplica" },
      { value: "BLOQUEADO", emoji: "🔒", label: "Bloqueado" }
    ];

    const acuerdoMeta = getDocStatusMeta(v.acuerdoPatrocinio);

    return `
      <tr>
        <td class="col-idx">${idx + 1}</td>

        <td>
          <input
            class="in tbl-input"
            type="text"
            data-doc="${escapeHtml(d.id)}"
            data-key="nombres"
            value="${escapeHtml(nombres)}"
            placeholder="Nombres"
            spellcheck="false"
          />
        </td>

        <td>
          <input
            class="in tbl-input"
            type="text"
            data-doc="${escapeHtml(d.id)}"
            data-key="apellidos"
            value="${escapeHtml(apellidos)}"
            placeholder="Apellidos"
            spellcheck="false"
          />
        </td>

        <td class="col-cedula">${escapeHtml(d.cedula)}</td>

        <td class="center col-check">
          ${renderStatusSelect(d.id, "estadoDocente", v.estadoDocente, docenteOptions, "")}
        </td>

        <td class="center col-check">
          ${renderStatusSelect(d.id, "planIndividual", v.planIndividual, planOptions, "")}
        </td>

        <td class="center col-check">
          ${
            hasCap
              ? renderStatusSelect(d.id, "acuerdoPatrocinio", v.acuerdoPatrocinio, acuerdoOptions, "")
              : renderStatusView("—", "No editable sin capacitación", "is-disabled", "Seleccione una capacitación para editar acuerdo.")
          }
        </td>

        <td class="center col-check">
          ${renderStatusSelect(d.id, "reporteResultados", v.reporteResultados, reporteOptions, "")}
        </td>

        <td class="center col-actions">
          <div class="tbl-actions">
            <button
              class="btn btn-icon"
              type="button"
              data-doc="${escapeHtml(d.id)}"
              data-action="swap-name"
              title="Intercambiar nombres y apellidos"
              aria-label="Intercambiar nombres y apellidos"
            >
              ⇄
            </button>

            <button
              class="btn btn-icon btn-icon-ghost"
              type="button"
              data-doc="${escapeHtml(d.id)}"
              data-action="reset-name"
              title="Restablecer nombres y apellidos originales"
              aria-label="Restablecer nombres y apellidos originales"
            >
              ↺
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join("");

  host.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th class="col-idx">#</th>

            <th
              class="${sortClass(sortState, "nombres")}"
              data-sort="nombres"
              aria-sort="${sortAria(sortState, "nombres")}"
            >
              <div class="th-sort-inner">
                <span>Nombres</span>
                <span class="th-sort-mark">${sortMark(sortState, "nombres")}</span>
              </div>
            </th>

            <th
              class="${sortClass(sortState, "apellidos")}"
              data-sort="apellidos"
              aria-sort="${sortAria(sortState, "apellidos")}"
            >
              <div class="th-sort-inner">
                <span>Apellidos</span>
                <span class="th-sort-mark">${sortMark(sortState, "apellidos")}</span>
              </div>
            </th>

            <th
              class="${sortClass(sortState, "cedula")}"
              data-sort="cedula"
              aria-sort="${sortAria(sortState, "cedula")}"
            >
              <div class="th-sort-inner">
                <span>Cédula</span>
                <span class="th-sort-mark">${sortMark(sortState, "cedula")}</span>
              </div>
            </th>

            <th
              class="${sortClass(sortState, "estadoDocente")} center-head"
              data-sort="estadoDocente"
              aria-sort="${sortAria(sortState, "estadoDocente")}"
            >
              <div class="th-sort-inner">
                <span>Docente</span>
                <span class="th-sort-mark">${sortMark(sortState, "estadoDocente")}</span>
              </div>
            </th>

            <th
              class="${sortClass(sortState, "planIndividual")} center-head"
              data-sort="planIndividual"
              aria-sort="${sortAria(sortState, "planIndividual")}"
            >
              <div class="th-sort-inner">
                <span>Plan</span>
                <span class="th-sort-mark">${sortMark(sortState, "planIndividual")}</span>
              </div>
            </th>

            <th
              class="${sortClass(sortState, "acuerdoPatrocinio")} center-head"
              data-sort="acuerdoPatrocinio"
              aria-sort="${sortAria(sortState, "acuerdoPatrocinio")}"
            >
              <div class="th-sort-inner">
                <span>Acuerdo</span>
                <span class="th-sort-mark">${sortMark(sortState, "acuerdoPatrocinio")}</span>
              </div>
            </th>

            <th
              class="${sortClass(sortState, "reporteResultados")} center-head"
              data-sort="reporteResultados"
              aria-sort="${sortAria(sortState, "reporteResultados")}"
            >
              <div class="th-sort-inner">
                <span>Reporte</span>
                <span class="th-sort-mark">${sortMark(sortState, "reporteResultados")}</span>
              </div>
            </th>

            <th class="col-actions">Acciones</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
  `;
}

export function bindTableChanges(host, onChange){
  if (!host) return;

  host.addEventListener("change", (ev) => {
    const el = ev.target;
    if (!el) return;

    if (el.tagName === "SELECT" && el.classList.contains("tbl-status")){
      const docenteId = el.getAttribute("data-doc") || "";
      const key = el.getAttribute("data-key") || "";
      if (!docenteId || !key) return;

      if (typeof onChange === "function"){
        onChange({
          type: "status",
          docenteId,
          key,
          value: el.value || ""
        });
      }
      return;
    }

    if (el.tagName !== "INPUT") return;

    if (el.type === "checkbox"){
      // Comentario técnico:
      // se conserva compatibilidad con el evento anterior por si alguna
      // vista residual todavía dispara checks mientras se termina el cambio.
      if (el.disabled) return;

      const docenteId = el.getAttribute("data-doc") || "";
      const key = el.getAttribute("data-key") || "";
      if (!docenteId || !key) return;

      if (typeof onChange === "function"){
        onChange({
          type: "checkbox",
          docenteId,
          key,
          checked: !!el.checked
        });
      }
      return;
    }

    if (el.type === "text"){
      const docenteId = el.getAttribute("data-doc") || "";
      const key = el.getAttribute("data-key") || "";
      if (!docenteId || !key) return;

      if (typeof onChange === "function"){
        onChange({
          type: "text",
          docenteId,
          key,
          value: el.value || ""
        });
      }
    }
  });

  host.addEventListener("input", (ev) => {
    const el = ev.target;
    if (!el || el.tagName !== "INPUT" || el.type !== "text") return;

    const docenteId = el.getAttribute("data-doc") || "";
    const key = el.getAttribute("data-key") || "";
    if (!docenteId || !key) return;

    if (typeof onChange === "function"){
      onChange({
        type: "text",
        docenteId,
        key,
        value: el.value || ""
      });
    }
  });

  host.addEventListener("click", (ev) => {
    const sortHead = ev.target && ev.target.closest ? ev.target.closest("th[data-sort]") : null;
    if (sortHead){
      const key = sortHead.getAttribute("data-sort") || "";
      if (key && typeof onChange === "function"){
        onChange({
          type: "sort",
          key
        });
      }
      return;
    }

    const btn = ev.target && ev.target.closest ? ev.target.closest("button[data-action]") : null;
    if (!btn) return;

    const docenteId = btn.getAttribute("data-doc") || "";
    const action = btn.getAttribute("data-action") || "";
    if (!docenteId || !action) return;

    if (typeof onChange === "function"){
      onChange({
        type: "action",
        docenteId,
        action
      });
    }
  });
}