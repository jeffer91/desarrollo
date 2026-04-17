/*
=========================================================
Nombre completo: mesa-app.js
Ruta o ubicación: /js/mesa-app.js
Función o funciones:
- Coordinar toda la aplicación.
- Trabajar con IndexedDB en lugar de localStorage.
- Crear, editar, buscar y eliminar invitaciones.
- Usar el caché local de estudiantes al ingresar una cédula.
- Permitir elegir profesores cargados desde Firebase.
- Generar vista previa e impresión/PDF.
=========================================================
*/
"use strict";

(function attachMesaApp(global) {
  const dom = {};
  const state = {
    invitations: [],
    filteredInvitations: [],
    currentInvitationId: null,
    teachers: []
  };

  function safeText(value) {
    return global.MesaInvitationSchema.safeText(value);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function cacheDom() {
    dom.searchInput = document.getElementById("mesa-search-input");
    dom.newInvitationBtn = document.getElementById("mesa-new-invitation-btn");
    dom.invitationsList = document.getElementById("mesa-invitations-list");
    dom.invitationsCount = document.getElementById("mesa-invitations-count");

    dom.kpiTotal = document.getElementById("mesa-kpi-total");
    dom.kpiSimple = document.getElementById("mesa-kpi-simple");
    dom.kpiMultiple = document.getElementById("mesa-kpi-multiple");

    dom.editorTitle = document.getElementById("mesa-editor-title");
    dom.editorSubtitle = document.getElementById("mesa-editor-subtitle");

    dom.form = document.getElementById("mesa-invitation-form");
    dom.city = document.getElementById("mesa-city");
    dom.documentDate = document.getElementById("mesa-document-date");
    dom.sessionDate = document.getElementById("mesa-session-date");
    dom.promotion = document.getElementById("mesa-promotion");

    // Corrección: este selector debe existir en el HTML real para cargar profesores desde Firebase.
    dom.teacherSelect = document.getElementById("mesa-teacher-select");

    dom.identification = document.getElementById("mesa-identification");
    dom.article = document.getElementById("mesa-article");
    dom.treatmentSelect = document.getElementById("mesa-treatment-select");
    dom.treatmentCustom = document.getElementById("mesa-treatment-custom");
    dom.fullName = document.getElementById("mesa-full-name");

    dom.assignmentList = document.getElementById("mesa-assignment-list");
    dom.addAssignmentBtn = document.getElementById("mesa-add-assignment-btn");

    dom.cancelEditorBtn = document.getElementById("mesa-cancel-editor-btn");
    dom.previewOpenBtn = document.getElementById("mesa-preview-open-btn");
    dom.saveInvitationBtn = document.getElementById("mesa-save-invitation-btn");

    dom.previewDocument = document.getElementById("mesa-preview-document");
    dom.backToEditorBtn = document.getElementById("mesa-back-to-editor-btn");
    dom.printBtn = document.getElementById("mesa-print-btn");
    dom.pdfBtn = document.getElementById("mesa-pdf-btn");
  }

  function populateTreatmentSelect() {
    dom.treatmentSelect.innerHTML = (global.MesaConstants.TREATMENTS || [])
      .map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item || "Seleccionar")}</option>`)
      .join("");
  }

  function buildCargoOptions(selectedValue) {
    return (global.MesaConstants.CARGO_OPTIONS || []).map((item) => {
      const selected = item.value === selectedValue ? "selected" : "";
      return `<option value="${escapeHtml(item.value)}" ${selected}>${escapeHtml(item.label)}</option>`;
    }).join("");
  }

  function getTeacherDisplayLabel(teacher) {
    return [safeText(teacher?.treatment), safeText(teacher?.fullName)]
      .filter(Boolean)
      .join(" ")
      .trim() || safeText(teacher?.fullName) || "Sin nombre";
  }

  function getArticleByTeacherTreatment(treatment) {
    const safeTreatment = safeText(treatment);

    // Corrección: solo se autocompleta el artículo cuando el tratamiento permite inferirlo con seguridad.
    // Esto evita colocar "al" o "a la" incorrectamente en tratamientos ambiguos como "Ing.".
    if (["Dra.", "Lcda.", "Tecnóloga Superior"].includes(safeTreatment)) {
      return "a la";
    }

    if (["Dr.", "Lic.", "MSc.", "Mgtr.", "MBA", "Tecnólogo Superior"].includes(safeTreatment)) {
      return "al";
    }

    return "";
  }

  function setTeacherTreatment(treatment) {
    const safeTreatment = safeText(treatment);
    if (!safeTreatment) {
      return;
    }

    if ((global.MesaConstants.TREATMENTS || []).includes(safeTreatment)) {
      dom.treatmentSelect.value = safeTreatment;
      dom.treatmentCustom.value = "";
      return;
    }

    // Corrección: si el tratamiento no existe en la lista base, se conserva en el campo manual.
    // Esto evita perder el dato real del profesor seleccionado.
    dom.treatmentSelect.value = "";
    dom.treatmentCustom.value = safeTreatment;
  }

  function resolveTeacherSelectionId(invitationLike) {
    const safeIdentification = safeText(invitationLike?.identification);

    if (safeIdentification && state.teachers.some((item) => safeText(item.id) === safeIdentification)) {
      return safeIdentification;
    }

    const safeName = safeText(invitationLike?.fullName);
    const teacherByName = state.teachers.find((item) => safeText(item.fullName) === safeName);

    return teacherByName ? safeText(teacherByName.id) : "";
  }

  function populateTeacherSelect(selectedId) {
    if (!dom.teacherSelect) {
      return;
    }

    const safeSelectedId = safeText(selectedId);

    if (!state.teachers.length) {
      dom.teacherSelect.innerHTML = `<option value="">No hay profesores disponibles</option>`;
      dom.teacherSelect.disabled = true;
      dom.teacherSelect.value = "";
      return;
    }

    dom.teacherSelect.innerHTML = [
      `<option value="">Seleccionar profesor</option>`,
      ...state.teachers.map((teacher) => {
        return `<option value="${escapeHtml(teacher.id)}">${escapeHtml(getTeacherDisplayLabel(teacher))}</option>`;
      })
    ].join("");

    dom.teacherSelect.disabled = false;
    dom.teacherSelect.value = safeSelectedId;

    // Corrección: si la invitación actual no coincide con ninguna opción, el selector se limpia.
    if (dom.teacherSelect.value !== safeSelectedId) {
      dom.teacherSelect.value = "";
    }
  }

  async function loadTeachers() {
    if (!dom.teacherSelect) {
      return;
    }

    dom.teacherSelect.innerHTML = `<option value="">Cargando profesores...</option>`;
    dom.teacherSelect.disabled = true;

    try {
      state.teachers = await global.MesaFirebase.readAllTeachers();
      populateTeacherSelect("");
    } catch (error) {
      state.teachers = [];
      dom.teacherSelect.innerHTML = `<option value="">No se pudieron cargar profesores</option>`;
      dom.teacherSelect.disabled = true;
      console.error("No se pudieron cargar los profesores desde Firebase.", error);
    }
  }

  function applyTeacherSelection(teacherId) {
    const safeTeacherId = safeText(teacherId);
    if (!safeTeacherId) {
      return;
    }

    const selectedTeacher = state.teachers.find((item) => safeText(item.id) === safeTeacherId);
    if (!selectedTeacher) {
      return;
    }

    // Corrección: al seleccionar un profesor se completan automáticamente sus datos básicos.
    // Esto evita digitación manual y reduce errores de captura.
    dom.identification.value = safeText(selectedTeacher.identification || selectedTeacher.id);
    dom.fullName.value = safeText(selectedTeacher.fullName);

    setTeacherTreatment(selectedTeacher.treatment);

    const article = getArticleByTeacherTreatment(selectedTeacher.treatment);
    if (article) {
      dom.article.value = article;
    }
  }

  function createAssignmentRow(assignment) {
    const normalized = global.MesaInvitationSchema.normalizeAssignment(assignment);

    const wrapper = document.createElement("div");
    wrapper.className = "mesa-assignment";
    wrapper.setAttribute("data-assignment-id", normalized.id);

    wrapper.innerHTML = `
      <div class="mesa-assignment__header">
        <div class="mesa-assignment__title">Cargo asignado</div>
        <button type="button" class="mesa-assignment__remove">Eliminar</button>
      </div>

      <div class="mesa-form-grid mesa-form-grid--three">
        <label class="mesa-field">
          <span>Cargo</span>
          <select class="mesa-assignment-cargo">
            <option value="">Seleccionar</option>
            ${buildCargoOptions(normalized.cargoKey)}
          </select>
        </label>

        <label class="mesa-field" style="grid-column: span 2;">
          <span>Horarios / líneas de presencia</span>
          <textarea
            class="mesa-assignment-schedules"
            rows="4"
            placeholder="Una línea por horario. Ejemplo: Martes, 1 de julio de 2025, 09:00"
          >${escapeHtml((normalized.schedules || []).join("\n"))}</textarea>
        </label>
      </div>
    `;

    wrapper.querySelector(".mesa-assignment__remove").addEventListener("click", () => {
      wrapper.remove();
      ensureAtLeastOneAssignment();
    });

    dom.assignmentList.appendChild(wrapper);
  }

  function clearAssignments() {
    dom.assignmentList.innerHTML = "";
  }

  function ensureAtLeastOneAssignment() {
    if (!dom.assignmentList.children.length) {
      // Corrección: siempre se mantiene un bloque mínimo para no dejar el formulario sin cargos.
      createAssignmentRow(global.MesaInvitationSchema.createEmptyAssignment());
    }
  }

  function readAssignmentsFromDom() {
    return Array.from(dom.assignmentList.querySelectorAll(".mesa-assignment")).map((row) => {
      return global.MesaInvitationSchema.normalizeAssignment({
        id: row.getAttribute("data-assignment-id"),
        cargoKey: row.querySelector(".mesa-assignment-cargo").value,
        schedules: row.querySelector(".mesa-assignment-schedules").value
      });
    }).filter((item) => item.cargoKey || item.schedules.length);
  }

  function setEditorMode(title, subtitle) {
    dom.editorTitle.textContent = title;
    dom.editorSubtitle.textContent = subtitle;
  }

  function resetForm() {
    dom.form.reset();
    dom.city.value = global.MesaConstants.DEFAULT_CITY || "Quito";
    dom.documentDate.value = "";
    dom.sessionDate.value = "";
    dom.promotion.value = "";

    clearAssignments();
    ensureAtLeastOneAssignment();

    // Corrección: al abrir una nueva invitación también se reinicia la selección visible del profesor.
    populateTeacherSelect("");
  }

  function fillForm(invitation) {
    const item = global.MesaInvitationSchema.normalizeInvitation(invitation);

    dom.city.value = item.city || "";
    dom.documentDate.value = item.documentDate || "";
    dom.sessionDate.value = item.sessionDate || "";
    dom.promotion.value = item.promotion || "";
    dom.identification.value = item.identification || "";
    dom.article.value = item.article || "";
    dom.treatmentSelect.value = item.treatment || "";
    dom.treatmentCustom.value = "";
    dom.fullName.value = item.fullName || "";

    clearAssignments();
    (item.assignments || []).forEach((assignment) => createAssignmentRow(assignment));
    ensureAtLeastOneAssignment();

    // Corrección: al editar se intenta reflejar el profesor guardado en el selector.
    populateTeacherSelect(resolveTeacherSelectionId(item));
  }

  function buildInvitationFromForm() {
    const treatment = global.MesaInvitationSchema.resolveTreatmentValue(
      dom.treatmentSelect.value,
      dom.treatmentCustom.value
    );

    const base = global.MesaInvitationSchema.normalizeInvitation({
      id: state.currentInvitationId || undefined,
      city: dom.city.value,
      documentDate: dom.documentDate.value,
      sessionDate: dom.sessionDate.value,
      promotion: dom.promotion.value,
      article: dom.article.value,
      treatment,
      fullName: dom.fullName.value,
      identification: dom.identification.value,
      assignments: readAssignmentsFromDom()
    });

    return base;
  }

  function renderPreview(invitation) {
    dom.previewDocument.innerHTML = global.MesaTemplateEngine.buildLetterHtml(invitation);
  }

  async function openPreviewFromForm() {
    const invitation = buildInvitationFromForm();
    const validation = global.MesaInvitationSchema.validateInvitation(invitation);

    if (!validation.valid) {
      alert(validation.errors.join("\n"));
      return;
    }

    renderPreview(invitation);
    global.MesaPopup.closeEditor();
    global.MesaPopup.openPreview();
  }

  function openPrintWindow(invitation, autoPrint) {
    const html = global.MesaTemplateEngine.buildPrintableDocument(invitation);
    const popup = window.open("", "_blank");

    if (!popup) {
      alert("El navegador bloqueó la ventana emergente para impresión/PDF.");
      return null;
    }

    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.document.title = "Invitación institucional";

    if (autoPrint) {
      popup.onload = () => {
        setTimeout(() => {
          popup.focus();
          popup.print();
        }, 250);
      };
    }

    return popup;
  }

  function printCurrentPreview() {
    const invitation = buildInvitationFromForm();
    const validation = global.MesaInvitationSchema.validateInvitation(invitation);

    if (!validation.valid) {
      alert(validation.errors.join("\n"));
      return;
    }

    openPrintWindow(invitation, true);
  }

  function savePdfCurrentPreview() {
    const invitation = buildInvitationFromForm();
    const validation = global.MesaInvitationSchema.validateInvitation(invitation);

    if (!validation.valid) {
      alert(validation.errors.join("\n"));
      return;
    }

    openPrintWindow(invitation, true);
  }

  async function saveCurrentInvitation() {
    const invitation = buildInvitationFromForm();
    const validation = global.MesaInvitationSchema.validateInvitation(invitation);

    if (!validation.valid) {
      alert(validation.errors.join("\n"));
      return;
    }

    const existing = invitation.id
      ? await global.MesaIndexedDb.getInvitationById(invitation.id)
      : null;

    if (existing?.meta?.createdAt) {
      invitation.meta.createdAt = existing.meta.createdAt;
    }

    invitation._local = {
      dirty: true,
      status: existing ? "dirty" : "new",
      syncedAt: existing?._local?.syncedAt || "",
      lastLocalUpdateAt: new Date().toISOString()
    };

    await global.MesaIndexedDb.putInvitation(invitation);

    state.currentInvitationId = invitation.id;
    await refreshList(dom.searchInput.value);
    alert("Invitación guardada correctamente.");
  }

  async function deleteInvitation(invitationId) {
    const confirmed = confirm("¿Seguro que deseas eliminar esta invitación?");
    if (!confirmed) {
      return;
    }

    await global.MesaIndexedDb.deleteInvitation(invitationId);
    await refreshList(dom.searchInput.value);
  }

  async function editInvitation(invitationId) {
    const item = await global.MesaIndexedDb.getInvitationById(invitationId);
    if (!item) {
      return;
    }

    state.currentInvitationId = item.id;
    setEditorMode("Editar invitación", "Actualiza los datos del documento");
    fillForm(item);
    global.MesaPopup.openEditor();
  }

  async function previewInvitation(invitationId) {
    const item = await global.MesaIndexedDb.getInvitationById(invitationId);
    if (!item) {
      return;
    }

    state.currentInvitationId = item.id;
    fillForm(item);
    renderPreview(item);
    global.MesaPopup.openPreview();
  }

  function buildInvitationMeta(invitation) {
    const mode = global.MesaInvitationSchema.getInvitationMode(invitation);
    const cargos = (invitation.assignments || []).filter((item) => item.cargoKey).length;

    return {
      modeLabel: mode === "simple" ? "Simple" : "Múltiple",
      cargos
    };
  }

  function renderList(list) {
    const invitations = Array.isArray(list) ? list : [];
    dom.invitationsCount.textContent = String(invitations.length);

    if (!invitations.length) {
      dom.invitationsList.innerHTML = `<div class="mesa-empty">Todavía no hay invitaciones registradas.</div>`;
      return;
    }

    dom.invitationsList.innerHTML = invitations.map((invitation) => {
      const name = global.MesaInvitationSchema.getDisplayName(invitation);
      const meta = buildInvitationMeta(invitation);

      return `
        <article class="mesa-card" data-id="${escapeHtml(invitation.id)}">
          <div class="mesa-card__top">
            <div>
              <div class="mesa-card__name">${escapeHtml(name || "Sin nombre")}</div>
              <div class="mesa-card__meta">
                ${escapeHtml(invitation.promotion || "Sin promoción")}<br>
                ${escapeHtml(invitation.documentDate || "Sin fecha")} · ${escapeHtml(meta.modeLabel)} · ${escapeHtml(String(meta.cargos))} cargo(s)
              </div>
            </div>
          </div>

          <div class="mesa-card__actions">
            <button type="button" data-action="edit">Editar</button>
            <button type="button" data-action="preview">Vista previa</button>
            <button type="button" data-action="delete">Eliminar</button>
          </div>
        </article>
      `;
    }).join("");

    Array.from(dom.invitationsList.querySelectorAll(".mesa-card")).forEach((card) => {
      const invitationId = card.getAttribute("data-id");

      card.querySelector('[data-action="edit"]').addEventListener("click", () => {
        editInvitation(invitationId).catch(console.error);
      });

      card.querySelector('[data-action="preview"]').addEventListener("click", () => {
        previewInvitation(invitationId).catch(console.error);
      });

      card.querySelector('[data-action="delete"]').addEventListener("click", () => {
        deleteInvitation(invitationId).catch(console.error);
      });
    });
  }

  function refreshKpis(list) {
    const all = Array.isArray(list) ? list : [];
    const simple = all.filter((item) => global.MesaInvitationSchema.getInvitationMode(item) === "simple").length;
    const multiple = all.filter((item) => global.MesaInvitationSchema.getInvitationMode(item) === "multiple").length;

    dom.kpiTotal.textContent = String(all.length);
    dom.kpiSimple.textContent = String(simple);
    dom.kpiMultiple.textContent = String(multiple);
  }

  async function refreshList(query) {
    state.invitations = await global.MesaIndexedDb.getAllInvitations();

    const term = safeText(query);
    state.filteredInvitations = term
      ? await global.MesaIndexedDb.searchInvitations(term)
      : state.invitations.slice();

    renderList(state.filteredInvitations);
    refreshKpis(state.invitations);
  }

  async function tryPrefillFromStudentsCache() {
    const identification = safeText(dom.identification.value);
    if (!identification) {
      return;
    }

    try {
      const student = await global.MesaIndexedDb.getStudentById(identification);
      if (!student) {
        return;
      }

      if (!safeText(dom.fullName.value)) {
        dom.fullName.value = student.Nombres || "";
      }
    } catch (error) {
      console.error("No se pudo autocompletar desde estudiantes.", error);
    }
  }

  function openNewInvitation() {
    state.currentInvitationId = null;
    setEditorMode("Nueva invitación", "Formulario institucional");
    resetForm();
    global.MesaPopup.openEditor();
  }

  async function runStartupRead() {
    try {
      await global.MesaSyncEngine.bootstrapDailyStudentsRead();
    } catch (error) {
      console.error("Falló la lectura diaria de estudiantes.", error);
    }
  }

  async function runDailySyncPolicy() {
    try {
      if (global.MesaSyncEngine.isAfterSyncTime(new Date())) {
        await global.MesaSyncEngine.ensureDailyInvitationSync();
      }
    } catch (error) {
      console.error("Falló la sincronización diaria de invitaciones.", error);
    }
  }

  function bindEvents() {
    dom.searchInput.addEventListener("input", () => {
      refreshList(dom.searchInput.value).catch(console.error);
    });

    dom.newInvitationBtn.addEventListener("click", openNewInvitation);

    dom.addAssignmentBtn.addEventListener("click", () => {
      createAssignmentRow(global.MesaInvitationSchema.createEmptyAssignment());
    });

    dom.cancelEditorBtn.addEventListener("click", () => {
      global.MesaPopup.closeEditor();
    });

    dom.previewOpenBtn.addEventListener("click", () => {
      openPreviewFromForm().catch(console.error);
    });

    dom.saveInvitationBtn.addEventListener("click", () => {
      saveCurrentInvitation().catch(console.error);
    });

    dom.backToEditorBtn.addEventListener("click", () => {
      global.MesaPopup.closePreview();
      global.MesaPopup.openEditor();
    });

    dom.printBtn.addEventListener("click", printCurrentPreview);
    dom.pdfBtn.addEventListener("click", savePdfCurrentPreview);

    dom.identification.addEventListener("blur", () => {
      tryPrefillFromStudentsCache().catch(console.error);
    });

    if (dom.teacherSelect) {
      dom.teacherSelect.addEventListener("change", (event) => {
        applyTeacherSelection(event.target.value);
      });
    }
  }

  async function init() {
    cacheDom();
    global.MesaPopup.cacheDom();
    global.MesaPopup.bindEvents();

    populateTreatmentSelect();
    resetForm();

    await runStartupRead();

    // Corrección: se cargan profesores al iniciar para poblar el selector del formulario.
    await loadTeachers();

    await refreshList("");
    bindEvents();

    global.MesaSyncEngine.startAutoSyncWatcher();
    await runDailySyncPolicy();
  }

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((error) => {
      console.error("Error al iniciar la app.", error);
      alert("Ocurrió un error al iniciar la aplicación. Revisa la consola.");
    });
  });
})(window);