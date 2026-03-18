/*
Nombre del archivo: cale.detail.js
Ruta: C:\Users\ITSQMET\Desktop\eventos\cale\cale.detail.js
Función:
- Controla el panel de detalle del módulo cale
- Muestra la información del evento seleccionado
- Limpia el panel cuando no hay selección
- Permite editar y guardar campos básicos del evento desde el popup
*/

(function (window) {
  "use strict";

  window.CALE = window.CALE || {};

  var currentEventData = null;
  var isEditMode = false;
  var isSaving = false;

  function getEl(id) {
    return window.CALE.getEl(id);
  }

  function getRefs() {
    return {
      modal: getEl("cale-detail-modal"),
      backdrop: getEl("cale-detail-backdrop"),
      closeBtn: getEl("cale-detail-btn-close"),
      editBtn: getEl("cale-detail-btn-edit"),
      doneBtn: getEl("cale-detail-btn-done"),
      empty: getEl("cale-detail-empty"),
      content: getEl("cale-detail-content"),
      title: getEl("cale-detail-title"),
      date: getEl("cale-detail-date"),
      time: getEl("cale-detail-time"),
      priority: getEl("cale-detail-priority"),
      status: getEl("cale-detail-status"),
      type: getEl("cale-detail-type"),
      family: getEl("cale-detail-family"),
      place: getEl("cale-detail-place"),
      desc: getEl("cale-detail-desc")
    };
  }

  function setText(el, value) {
    if (!el) return;
    var safe = String(value || "").trim();
    el.textContent = safe || "-";
  }

  function setStatusText(text, isError) {
    if (typeof window.CALE.setStatus === "function") {
      window.CALE.setStatus(text, !!isError);
    }
  }

  function setModalOpen(isOpen) {
    var ref = getRefs();

    if (!ref.modal) return;

    // Corrección: el detalle se abre/cierra como modal real.
    ref.modal.hidden = !isOpen;
    ref.modal.setAttribute("aria-hidden", isOpen ? "false" : "true");
  }

  function setActionButtonsState() {
    var ref = getRefs();

    if (ref.editBtn) {
      // Corrección: el mismo botón alterna entre editar y guardar.
      ref.editBtn.textContent = isSaving ? "Guardando..." : (isEditMode ? "Guardar" : "Editar");
      ref.editBtn.disabled = isSaving || !currentEventData;
    }

    if (ref.doneBtn) {
      // Corrección: mientras se edita, evitamos mezclar "guardar" con "marcar realizado".
      ref.doneBtn.disabled = isSaving || isEditMode || !currentEventData;
    }

    if (ref.closeBtn) {
      ref.closeBtn.disabled = isSaving;
    }
  }

  function clearField(el) {
    if (!el) return;
    el.innerHTML = "";
  }

  function createInput(id, type, value) {
    var input = document.createElement("input");
    input.id = id;
    input.type = type;
    input.className = "cale-detail-edit-input";
    input.value = String(value || "").trim();
    return input;
  }

  function createTextarea(id, value) {
    var input = document.createElement("textarea");
    input.id = id;
    input.className = "cale-detail-edit-input cale-detail-edit-textarea";
    input.value = String(value || "").trim();
    input.rows = 4;
    return input;
  }

  function createSelect(id, value, options) {
    var select = document.createElement("select");
    select.id = id;
    select.className = "cale-detail-edit-input";

    (options || []).forEach(function (item) {
      var option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      if (String(item.value) === String(value || "")) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    return select;
  }

  function setFieldEditor(container, node) {
    if (!container || !node) return;
    clearField(container);
    container.appendChild(node);
  }

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function formatDateText(dateValue) {
    var raw = String(dateValue || "").trim();
    if (!raw) return "-";

    var parts = raw.split("-");
    if (parts.length !== 3) return raw;

    var year = Number(parts[0]);
    var month = Number(parts[1]);
    var day = Number(parts[2]);

    if (!year || !month || !day) return raw;

    var dt = new Date(year, month - 1, day);
    if (isNaN(dt.getTime())) return raw;

    return dt.toLocaleDateString("es-EC", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  function formatTimeText(timeValue, allDay) {
    var raw = String(timeValue || "").trim();

    if (allDay) return "Todo el día";
    if (!raw) return "-";

    var parts = raw.split(":");
    if (!parts.length) return raw;

    var hh = pad2(parts[0] || "00");
    var mm = pad2(parts[1] || "00");

    return hh + ":" + mm;
  }

  function normalizeInput(eventData) {
    if (!eventData) return null;

    var ext = eventData.extendedProps || {};

    return {
      id: String(eventData.id || ""),
      title: String(eventData.title || ""),
      allDay: !!eventData.allDay,
      date: String(ext.date || ""),
      time: String(ext.time || ""),
      priority: String(ext.priority || ""),
      status: String(ext.status || ""),
      type: String(ext.type || ""),
      familyName: String(ext.familyName || ""),
      place: String(ext.place || ""),
      desc: String(ext.desc || "")
    };
  }

  function renderReadMode(data) {
    var ref = getRefs();

    setText(ref.title, data.title || "Sin título");
    setText(ref.date, formatDateText(data.date));
    setText(ref.time, formatTimeText(data.time, data.allDay));
    setText(ref.priority, data.priority || "-");
    setText(ref.status, data.status || "-");
    setText(ref.type, data.type || "-");
    setText(ref.family, data.familyName || "-");
    setText(ref.place, data.place || "-");
    setText(ref.desc, data.desc || "-");
  }

  function renderEditMode(data) {
    var ref = getRefs();

    // Corrección: convertimos solo los campos seguros del detalle a modo editable.
    // "Familia" se mantiene solo lectura para no romper relación con catálogos/familias.
    setFieldEditor(ref.title, createInput("cale-detail-input-title", "text", data.title));
    setFieldEditor(ref.date, createInput("cale-detail-input-date", "date", data.date));
    setFieldEditor(ref.time, createInput("cale-detail-input-time", "time", data.time));
    setFieldEditor(ref.priority, createSelect("cale-detail-input-priority", data.priority, [
      { value: "", label: "Seleccionar" },
      { value: "critica", label: "Crítica" },
      { value: "alta", label: "Alta" },
      { value: "media", label: "Media" },
      { value: "baja", label: "Baja" }
    ]));
    setFieldEditor(ref.status, createSelect("cale-detail-input-status", data.status, [
      { value: "", label: "Seleccionar" },
      { value: "programado", label: "Programado" },
      { value: "pendiente", label: "Pendiente" },
      { value: "en-proceso", label: "En proceso" },
      { value: "confirmado", label: "Confirmado" },
      { value: "completado", label: "Completado" },
      { value: "cancelado", label: "Cancelado" }
    ]));
    setFieldEditor(ref.type, createSelect("cale-detail-input-type", data.type, [
      { value: "", label: "Seleccionar" },
      { value: "academico", label: "Académico" },
      { value: "administrativo", label: "Administrativo" },
      { value: "reunion", label: "Reunión" },
      { value: "entrega", label: "Entrega" },
      { value: "seguimiento", label: "Seguimiento" },
      { value: "otro", label: "Otro" }
    ]));
    setText(ref.family, data.familyName || "-");
    setFieldEditor(ref.place, createInput("cale-detail-input-place", "text", data.place));
    setFieldEditor(ref.desc, createTextarea("cale-detail-input-desc", data.desc));

    if (data.allDay) {
      var timeInput = getEl("cale-detail-input-time");
      if (timeInput) {
        // Corrección: si el evento es todo el día, la hora no debe alterarse desde este popup.
        timeInput.disabled = true;
        timeInput.placeholder = "Todo el día";
      }
    }
  }

  function enterEditMode() {
    if (!currentEventData || isSaving) return;

    isEditMode = true;
    renderEditMode(currentEventData);
    setActionButtonsState();
  }

  function exitEditMode() {
    if (!currentEventData) return;

    isEditMode = false;
    renderReadMode(currentEventData);
    setActionButtonsState();
  }

  function readEditorValue(id) {
    var el = getEl(id);
    return el ? String(el.value || "").trim() : "";
  }

  function collectPatchFromEditor() {
    return {
      title: readEditorValue("cale-detail-input-title"),
      date: readEditorValue("cale-detail-input-date"),
      time: currentEventData && currentEventData.allDay ? String(currentEventData.time || "").trim() : readEditorValue("cale-detail-input-time"),
      priority: readEditorValue("cale-detail-input-priority"),
      status: readEditorValue("cale-detail-input-status"),
      type: readEditorValue("cale-detail-input-type"),
      place: readEditorValue("cale-detail-input-place"),
      desc: readEditorValue("cale-detail-input-desc")
    };
  }

  async function saveCurrentEvent() {
    var patch;

    if (!currentEventData || isSaving) return;
    if (!window.CALE.db || typeof window.CALE.db.updateEvent !== "function") {
      setStatusText("No está disponible la función de guardado del evento.", true);
      return;
    }

    patch = collectPatchFromEditor();

    if (!patch.title) {
      setStatusText("El título del evento es obligatorio.", true);
      return;
    }

    if (!patch.date) {
      setStatusText("La fecha del evento es obligatoria.", true);
      return;
    }

    isSaving = true;
    setActionButtonsState();

    try {
      // Corrección: guardamos solo los campos editables con merge en Firestore.
      await window.CALE.db.updateEvent(currentEventData.id, patch);

      currentEventData = {
        id: currentEventData.id,
        title: patch.title,
        allDay: currentEventData.allDay,
        date: patch.date,
        time: patch.time,
        priority: patch.priority,
        status: patch.status,
        type: patch.type,
        familyName: currentEventData.familyName,
        place: patch.place,
        desc: patch.desc
      };

      window.CALE.setSelectedEventId(currentEventData.id);
      isEditMode = false;
      renderReadMode(currentEventData);
      setStatusText("Evento guardado correctamente.", false);
    } catch (err) {
      console.error(err);
      setStatusText(err && err.message ? err.message : "No fue posible guardar el evento.", true);
    } finally {
      isSaving = false;
      setActionButtonsState();
    }
  }

  function handleEditButtonClick() {
    if (!currentEventData) return;

    if (isEditMode) {
      saveCurrentEvent();
      return;
    }

    enterEditMode();
  }

  function ensureModalBindings() {
    var ref = getRefs();

    if (!ref.modal || ref.modal.__caleDetailBound) return;

    ref.modal.__caleDetailBound = true;

    if (ref.backdrop) {
      ref.backdrop.addEventListener("click", function () {
        clear();
      });
    }

    if (ref.closeBtn) {
      ref.closeBtn.addEventListener("click", function () {
        clear();
      });
    }

    if (ref.editBtn) {
      // Corrección: se enlaza el botón Editar para alternar a Guardar.
      ref.editBtn.addEventListener("click", handleEditButtonClick);
    }

    window.addEventListener("keydown", function (ev) {
      var liveRef = getRefs();

      if (ev.key !== "Escape") return;
      if (!liveRef.modal || liveRef.modal.hidden) return;

      clear();
    });
  }

  function clear() {
    var ref = getRefs();

    ensureModalBindings();

    currentEventData = null;
    isEditMode = false;
    isSaving = false;

    setModalOpen(false);

    if (ref.empty) ref.empty.style.display = "";
    if (ref.content) ref.content.style.display = "none";

    setText(ref.title, "-");
    setText(ref.date, "-");
    setText(ref.time, "-");
    setText(ref.priority, "-");
    setText(ref.status, "-");
    setText(ref.type, "-");
    setText(ref.family, "-");
    setText(ref.place, "-");
    setText(ref.desc, "-");

    window.CALE.setSelectedEventId("");
    setActionButtonsState();
  }

  function showEvent(eventData) {
    var ref = getRefs();
    var data = normalizeInput(eventData);

    ensureModalBindings();

    if (!data) {
      clear();
      return;
    }

    currentEventData = data;
    isEditMode = false;
    isSaving = false;

    if (ref.empty) ref.empty.style.display = "none";
    if (ref.content) ref.content.style.display = "";

    renderReadMode(currentEventData);

    window.CALE.setSelectedEventId(data.id);
    setActionButtonsState();

    // Corrección: una vez cargado el evento, abrimos el popup.
    setModalOpen(true);
  }

  window.CALE.detail = {
    clear: clear,
    showEvent: showEvent
  };

})(window);