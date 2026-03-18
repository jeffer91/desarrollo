/* =========================================================
Nombre del archivo: forms.bulk.js
Ruta: /forms.bulk.js
Función:
- Carga masiva desde texto pegado (tipo Excel/Sheets)
- Pop-up (modal) independiente
- Soporta formato legado y formato extendido con cabeceras
- Guarda N registros usando FormsDB.addEvent
- Soporta eventos y pendientes
========================================================= */
(function(){
  const U = window.FormsUtils;
  const DB = window.FormsDB;
  const UI = window.FormsUI;

  if (!U || !DB || !UI) {
    console.error("forms.bulk.js: dependencias no disponibles (FormsUtils/FormsDB/FormsUI).");
    return;
  }

  let parsed = []; // cache local del último parseo

  function qs(id){
    return document.getElementById(id);
  }

  function str(x){
    return String(x ?? "").trim();
  }

  function normTitle(s){
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normHeader(s){
    return String(s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[._-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeType(raw){
    const v = normHeader(raw);
    if (!v) return "";

    if (
      v === "event" ||
      v === "evento" ||
      v === "reunion" ||
      v === "reunión" ||
      v === "cita" ||
      v === "cronograma"
    ) return "event";

    if (
      v === "pending" ||
      v === "pendiente" ||
      v === "tarea" ||
      v === "por hacer" ||
      v === "documento por hacer"
    ) return "pending";

    return "";
  }

  function normalizeStatus(raw, type){
    const v = normHeader(raw);
    if (!v) return type === "pending" ? "pendiente" : "programado";

    if (v === "programado") return "programado";
    if (v === "pendiente") return "pendiente";
    if (v === "en proceso" || v === "proceso") return "en_proceso";
    if (v === "completado" || v === "completo" || v === "finalizado") return "completado";
    if (v === "cancelado" || v === "cancelada") return "cancelado";

    return String(raw || "").trim() || (type === "pending" ? "pendiente" : "programado");
  }

  function dedupeKey(row){
    const type = normalizeType(row.type) || (str(row.date) || str(row.time) || str(row.place) ? "event" : "pending");
    const title = normTitle(row.title);
    const date = str(row.date);

    if (type === "event"){
      return `event|${title}|${date}`;
    }

    return [
      "pending",
      title,
      date,
      normTitle(row.responsible || ""),
      normTitle(row.familyId || "")
    ].join("|");
  }

  function openModal(){
    const m = qs("bulkModal");
    if (!m) return;
    m.classList.add("isOpen");
    m.setAttribute("aria-hidden", "false");
  }

  function closeModal(){
    const m = qs("bulkModal");
    if (!m) return;
    m.classList.remove("isOpen");
    m.setAttribute("aria-hidden", "true");
  }

  function setBulkMsg(text, kind){
    const el = qs("bulkMsg");
    if (!el) return;
    el.textContent = text || "";
    el.dataset.kind = kind || "info";
  }

  function splitCols(line){
    const raw = String(line || "");

    if (raw.includes("\t")) {
      return raw.split("\t").map(x => String(x || "").trim());
    }

    if (raw.includes(";")) {
      return raw.split(";").map(x => String(x || "").trim());
    }

    if (raw.includes("|")) {
      return raw.split("|").map(x => String(x || "").trim());
    }

    if (raw.includes(",")) {
      const cols = raw.split(",").map(x => String(x || "").trim());
      if (cols.length >= 3) return cols;
    }

    return raw.split(/\s{2,}/g).map(x => String(x || "").trim());
  }

  function pad2(n){
    return String(n).padStart(2, "0");
  }

  function ymd(y, m, d){
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  function parseDateAny(s){
    s = str(s);
    if (!s) return "";

    // ISO directo: 2026-03-02
    let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m) {
      const yyyy = Number(m[1]);
      const mm = Number(m[2]);
      const dd = Number(m[3]);
      if (yyyy >= 1900 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
        return ymd(yyyy, mm, dd);
      }
    }

    // dd/mm/yyyy o dd-mm-yyyy o dd.mm.yyyy
    m = s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
    if (m) {
      const dd = Number(m[1]);
      const mm = Number(m[2]);
      let yyyy = Number(m[3]);
      if (yyyy < 100) yyyy = 2000 + yyyy;
      if (yyyy >= 1900 && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
        return ymd(yyyy, mm, dd);
      }
    }

    return "";
  }

  function parseTimeAny(s){
    s = str(s);
    if (!s) return "";

    let m = s.match(/^(\d{1,2}):(\d{2})$/);
    if (m) {
      const hh = Number(m[1]);
      const mm = Number(m[2]);
      if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
        return `${pad2(hh)}:${pad2(mm)}`;
      }
    }

    m = s.match(/^(\d{1,2})h(?:(\d{1,2}))?$/i);
    if (m) {
      const hh = Number(m[1]);
      const mm = Number(m[2] || 0);
      if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
        return `${pad2(hh)}:${pad2(mm)}`;
      }
    }

    return "";
  }

  function looksLikeLegacyHeaderRow(cols){
    const a = normHeader(cols[0] || "");
    const b = normHeader(cols[1] || "");
    const c = normHeader(cols[2] || "");

    return (
      a.includes("actividad") ||
      a.includes("titulo") ||
      a.includes("tarea") ||
      a.includes("evento") ||
      (b.includes("fecha") && (b.includes("inicio") || b === "fecha")) ||
      (c.includes("fecha") && c.includes("fin"))
    );
  }

  function detectHeaderMap(cols){
    if (!Array.isArray(cols) || cols.length === 0) return null;

    const alias = {
      type: [
        "tipo",
        "type",
        "clase"
      ],
      title: [
        "actividad",
        "titulo",
        "título",
        "title",
        "tarea",
        "evento",
        "nombre",
        "asunto"
      ],
      date: [
        "fecha",
        "fecha inicio",
        "inicio",
        "fecha limite",
        "fecha límite",
        "vencimiento",
        "deadline"
      ],
      end: [
        "fecha fin",
        "fin",
        "cierre"
      ],
      time: [
        "hora",
        "time"
      ],
      place: [
        "lugar",
        "place",
        "ubicacion",
        "ubicación",
        "sede"
      ],
      responsible: [
        "responsable",
        "encargado",
        "owner",
        "asignado",
        "responsible"
      ],
      familyId: [
        "familia",
        "family",
        "familyid",
        "grupo",
        "categoria",
        "categoría"
      ],
      status: [
        "estado",
        "status"
      ],
      desc: [
        "descripcion",
        "descripción",
        "detalle",
        "nota",
        "notas",
        "desc",
        "observacion",
        "observación"
      ]
    };

    const map = {};
    let matched = 0;

    cols.forEach((col, idx) => {
      const key = normHeader(col);

      Object.keys(alias).forEach(field => {
        if (map[field] != null) return;

        const hit = alias[field].some(name => key === name || key.includes(name));
        if (hit) {
          map[field] = idx;
          matched++;
        }
      });
    });

    if (map.title == null) return null;
    if (matched === 0) return null;

    return map;
  }

  function couldBeLegacyDataRow(cols){
    if (!Array.isArray(cols) || cols.length < 2) return false;

    const title = str(cols[0]);
    const d1 = parseDateAny(cols[1]);
    const d2 = parseDateAny(cols[2]);

    return !!title && !!(d1 || d2);
  }

  function firstCell(cols, idx){
    if (idx == null || idx < 0 || idx >= cols.length) return "";
    return str(cols[idx]);
  }

  function buildRow(raw){
    const typeBase = normalizeType(raw.type) || "";
    const date = parseDateAny(raw.date || "");
    const end = parseDateAny(raw.end || "");
    const time = parseTimeAny(raw.time || "");
    const place = str(raw.place);
    const title = str(raw.title);
    const responsible = str(raw.responsible);
    const familyId = str(raw.familyId);
    const desc = str(raw.desc);

    let type = typeBase;
    if (!type) {
      type = (date || time || place) ? "event" : "pending";
    }

    const descParts = [];
    if (desc) descParts.push(desc);
    if (raw.topic) descParts.push(`Tema: ${raw.topic}`);
    if (type === "event" && end && end !== date) descParts.push(`Fin: ${end}`);

    const row = {
      type,
      title,
      date: date,
      time: type === "event" ? time : "",
      place: type === "event" ? place : "",
      responsible,
      familyId,
      status: normalizeStatus(raw.status, type),
      desc: descParts.join(" · ")
    };

    return row;
  }

  function parseHeaderedRows(lines, topic, headerMap){
    const rows = [];
    const errors = [];

    for (const line of lines) {
      const cols = splitCols(line);
      if (!cols.length || cols.every(x => !str(x))) continue;

      const raw = {
        topic,
        type: firstCell(cols, headerMap.type),
        title: firstCell(cols, headerMap.title),
        date: firstCell(cols, headerMap.date),
        end: firstCell(cols, headerMap.end),
        time: firstCell(cols, headerMap.time),
        place: firstCell(cols, headerMap.place),
        responsible: firstCell(cols, headerMap.responsible),
        familyId: firstCell(cols, headerMap.familyId),
        status: firstCell(cols, headerMap.status),
        desc: firstCell(cols, headerMap.desc)
      };

      const row = buildRow(raw);

      if (!row.title) {
        errors.push(`Fila inválida (sin título): "${line}"`);
        continue;
      }

      if (row.type === "event" && !row.date) {
        errors.push(`Fila inválida (evento sin fecha): "${line}"`);
        continue;
      }

      rows.push(row);
    }

    return { rows, errors };
  }

  function parseLegacyRows(lines, topic){
    const rows = [];
    const errors = [];

    for (const line of lines) {
      const cols = splitCols(line);
      if (!cols.length || cols.every(x => !str(x))) continue;
      if (looksLikeLegacyHeaderRow(cols)) continue;
      if (cols.length < 2) continue;

      const title = str(cols[0]);
      const start = parseDateAny(cols[1]);
      const endRaw = str(cols[2]);
      const end = parseDateAny(endRaw);

      if (!title) {
        errors.push(`Fila inválida (sin actividad): "${line}"`);
        continue;
      }

      if (!start) {
        errors.push(`Fila inválida (fecha inicio): "${line}"`);
        continue;
      }

      if (endRaw && !end) {
        errors.push(`Fila inválida (fecha fin): "${line}"`);
        continue;
      }

      const descParts = [];
      if (topic) descParts.push(`Tema: ${topic}`);
      if (end && end !== start) descParts.push(`Fin: ${end}`);

      rows.push({
        type: "event",
        title,
        date: start,
        time: "",
        place: "",
        responsible: "",
        familyId: "",
        status: "programado",
        desc: descParts.join(" · ")
      });
    }

    return { rows, errors };
  }

  function parseBulkText(text){
    const lines = String(text || "")
      .replace(/\r/g, "")
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean);

    parsed = [];

    if (lines.length === 0) {
      return {
        topic: "",
        rows: [],
        errors: ["No hay contenido para procesar."]
      };
    }

    let topic = "";

    const firstCols = splitCols(lines[0]);
    const firstHeader = detectHeaderMap(firstCols);
    const firstLooksLikeLegacyData = couldBeLegacyDataRow(firstCols);

    if (!firstHeader && !firstLooksLikeLegacyData && lines.length > 1) {
      topic = lines.shift();
    }

    if (lines.length === 0) {
      return {
        topic,
        rows: [],
        errors: ["No hay filas para procesar después del tema."]
      };
    }

    const headerCols = splitCols(lines[0]);
    const headerMap = detectHeaderMap(headerCols);

    let result;
    if (headerMap) {
      result = parseHeaderedRows(lines.slice(1), topic, headerMap);
    } else {
      result = parseLegacyRows(lines, topic);
    }

    parsed = result.rows;
    return {
      topic,
      rows: result.rows,
      errors: result.errors
    };
  }

  function renderPreview(rows, errors){
    const host = qs("bulkPreview");
    if (!host) return;

    const btnSave = qs("btnBulkSave");
    if (btnSave) btnSave.disabled = !(rows && rows.length);

    const errHTML = (errors && errors.length)
      ? `<div class="bulkWarn"><strong>Advertencias:</strong><ul>${errors.map(e => `<li>${U.esc(e)}</li>`).join("")}</ul></div>`
      : "";

    if (!rows || rows.length === 0) {
      host.innerHTML = errHTML + `<div class="muted">Sin filas válidas para guardar.</div>`;
      return;
    }

    const items = rows.slice(0, 50).map(r => {
      const type = U.esc(r.type === "pending" ? "Pendiente" : "Evento");
      const title = U.esc(r.title);
      const date = U.esc(r.date || "");
      const time = U.esc(r.time || "");
      const place = U.esc(r.place || "");
      const responsible = U.esc(r.responsible || "");
      const familyId = U.esc(r.familyId || "");
      const status = U.esc(r.status || "");
      const desc = U.esc(r.desc || "");

      const meta = [
        date ? `Fecha: ${date}` : "",
        time ? `Hora: ${time}` : "",
        place ? `Lugar: ${place}` : "",
        responsible ? `Responsable: ${responsible}` : "",
        familyId ? `Familia: ${familyId}` : "",
        status ? `Estado: ${status}` : ""
      ].filter(Boolean).join(" · ");

      return `
        <div class="bulkRow">
          <div><strong>${title}</strong> <span class="muted">(${type})</span></div>
          ${meta ? `<div class="muted" style="margin-top:4px;">${meta}</div>` : ``}
          ${desc ? `<div class="muted" style="margin-top:4px;">${desc}</div>` : ``}
        </div>
      `;
    }).join("");

    const more = rows.length > 50
      ? `<div class="muted" style="margin-top:8px;">Mostrando 50 de ${rows.length}…</div>`
      : "";

    host.innerHTML =
      errHTML +
      `<div class="bulkInfo">Listo para guardar: <strong>${rows.length}</strong> registros.</div>` +
      `<div class="bulkList">${items}</div>` +
      more;
  }

  async function safeListEvents(){
    if (typeof DB.listEvents !== "function") return [];
    try {
      const rows = await DB.listEvents();
      return Array.isArray(rows) ? rows : [];
    } catch (err) {
      console.warn("forms.bulk.js: no se pudo leer listEvents() para validar duplicados.", err);
      return [];
    }
  }

  async function saveBulk(){
    if (!parsed || parsed.length === 0) {
      setBulkMsg("Primero presiona “Procesar”.", "warn");
      return;
    }

    const btn = qs("btnBulkSave");
    const btnParse = qs("btnBulkParse");

    if (btn) btn.disabled = true;
    if (btnParse) btnParse.disabled = true;

    try {
      setBulkMsg("Preparando...", "info");

      const existing = await safeListEvents();
      const existingKeys = new Set(existing.map(dedupeKey));

      const uniqueToSave = [];
      const seenInPaste = new Set();

      let dupDb = 0;
      let dupPaste = 0;

      for (const r of parsed) {
        const k = dedupeKey(r);

        if (existingKeys.has(k)) {
          dupDb++;
          continue;
        }

        if (seenInPaste.has(k)) {
          dupPaste++;
          continue;
        }

        seenInPaste.add(k);
        uniqueToSave.push(r);
      }

      if (uniqueToSave.length === 0) {
        setBulkMsg(`No hay nuevos registros para guardar. Omitidos por duplicado: ${dupDb + dupPaste}.`, "warn");
        return;
      }

      setBulkMsg(`Guardando ${uniqueToSave.length} registros… (omitidos: ${dupDb + dupPaste})`, "info");

      let ok = 0;

      for (const r of uniqueToSave) {
        const payload = {
          ...r,
          uid: typeof U.uid === "function" ? U.uid("evt") : ("evt_" + Date.now()),
          createdAt: typeof U.nowISO === "function" ? U.nowISO() : new Date().toISOString(),
          updatedAt: typeof U.nowISO === "function" ? U.nowISO() : new Date().toISOString()
        };

        await DB.addEvent(payload);
        ok++;

        if (ok % 10 === 0) {
          setBulkMsg(`Guardando… ${ok}/${uniqueToSave.length} (omitidos: ${dupDb + dupPaste})`, "info");
        }
      }

      setBulkMsg(`Listo: ${ok} guardados. Omitidos por duplicado: ${dupDb + dupPaste}.`, "ok");

      const btnReload = qs("btnReload");
      if (btnReload) {
        btnReload.click();
      } else {
        const rows = await safeListEvents();
        if (typeof UI.renderList === "function") {
          UI.renderList(rows);
        }
      }
    } catch (err) {
      console.error(err);
      setBulkMsg("No se pudo guardar masivo. Revisa consola, permisos o reglas.", "error");
    } finally {
      if (btnParse) btnParse.disabled = false;
      if (btn) btn.disabled = false;
    }
  }

  function initBulk(){
    const openBtn = qs("btnBulkOpen");
    const closeBtn = qs("btnBulkClose");
    const parseBtn = qs("btnBulkParse");
    const saveBtn = qs("btnBulkSave");
    const input = qs("bulkInput");
    const modal = qs("bulkModal");

    if (!openBtn || !closeBtn || !parseBtn || !saveBtn || !input || !modal) {
      console.warn("forms.bulk.js: no se encontraron nodos del modal (IDs bulk*).");
      return;
    }

    openBtn.addEventListener("click", () => {
      parsed = [];
      input.value = "";
      setBulkMsg("", "info");
      renderPreview([], []);
      openModal();
      input.focus();
    });

    closeBtn.addEventListener("click", closeModal);

    modal.addEventListener("click", (e) => {
      if (e.target && e.target.dataset && e.target.dataset.bulkClose) {
        closeModal();
      }
    });

    parseBtn.addEventListener("click", () => {
      const res = parseBulkText(input.value);

      if (res.errors && res.errors.length) {
        setBulkMsg(`Procesado con advertencias. Filas válidas: ${res.rows.length}`, "warn");
      } else {
        setBulkMsg(`Procesado. Filas válidas: ${res.rows.length}`, "ok");
      }

      renderPreview(res.rows, res.errors);
    });

    saveBtn.addEventListener("click", saveBulk);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("isOpen")) {
        closeModal();
      }
    });
  }

  document.addEventListener("DOMContentLoaded", initBulk);
})();